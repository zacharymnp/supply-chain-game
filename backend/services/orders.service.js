const prisma = require("../prisma");
const roleOrder = ["RETAILER", "WHOLESALER", "DISTRIBUTOR", "FACTORY"];

module.exports = {
    async getOrderStatus(roomCode) {
        const game = await prisma.game.findUnique({
            where: { roomCode },
            select: { id: true, state: true, group: { select: { week: true } } },
        });
        if (!game) return null;

        const week = game.group.week;

        const orders = await prisma.order.findMany({
            where: { gameId: game.id, week },
            select: { role: true, amount: true },
        });

        const status = {};
        for (const role of roleOrder) {
            const entry = orders.find((o) => o.role === role);
            status[role] = { amount: entry ? entry.amount : -1 };
        }

        status["CUSTOMER"] = {
            amount: game.state.customerOrder.length >= week
                ? game.state.customerOrder[week - 1]
                : -1
        };

        return status;
    },

    async getAllOrders(roomCode) {
        const game = await prisma.game.findUnique({
            where: { roomCode },
            select: { id: true },
        });
        if (!game) return null;

        const orders = await prisma.order.findMany({
            where: { gameId: game.id },
            select: { role: true, amount: true, week: true },
        });

        const map = {};
        for (const o of orders) {
            if (!map[o.role]) map[o.role] = {};
            if (o.week > 0) map[o.role][o.week] = o.amount;
        }

        return map;
    },

    async getOutgoingOrder(roomCode, role) {
        const game = await prisma.game.findUnique({
            where: { roomCode },
            select: { id: true, state: true, group: true },
        });
        if (!game) return null;

        const week = game.group.week;

        if (week === 1) return -1;

        if (role === "RETAILER") {
            return game.state.customerOrder[week - 2];
        }

        const prevRole = roleOrder[roleOrder.indexOf(role) - 1];
        const order = await prisma.order.findFirst({
            where: { gameId: game.id, week: week - 1, role: prevRole },
            select: { amount: true },
        });

        return order?.amount ?? -1;
    },

    async submitOrder(roomCode, role, amount, week) {
        const game = await prisma.game.findUnique({
            where: { roomCode },
            select: { id: true },
        });
        if (!game) return null;

        await prisma.order.upsert({
            create: { gameId: game.id, role, amount, week },
            update: { amount },
            where: { gameId_role_week_key: { gameId: game.id, role, week }},
        });

        return true;
    },

    async addCustomerOrder(roomCodes, amount) {
        for (const roomCode of roomCodes) {
            const game = await prisma.game.findUnique({
                where: { roomCode },
                select: { id: true, group: true, state: true, roomCode: true },
            });
            if (!game) continue;

            const week = game.group.week;
            const gameState = game.state;

            if (gameState.customerOrder.length < week) {
                gameState.customerOrder.push(amount);
            } else {
                gameState.customerOrder[week - 1] = amount;
            }

            const updated = await prisma.game.update({
                where: { id: game.id },
                data: { state: gameState },
                include: { group: true },
            });

            io.emit("stateUpdate", {
                roomCode: updated.roomCode,
                week: updated.group.week,
                state: updated.state,
            });
        }

        return true;
    },

    async advanceWeek(groupCode) {
        const group = await prisma.gameGroup.findUnique({
            where: { groupCode },
            include: {
                games: {
                    include: { orders: true },
                },
            },
        });
        if (!group) return null;

        const currentWeek = group.week;
        const nextWeek = currentWeek + 1;

        // ensure all 4 orders exist
        for (const game of group.games) {
            const count = game.orders.filter(o => o.week === currentWeek).length;
            if (count < 4) {
                throw new Error("Some teams have not placed their orders");
            }
        }

        await prisma.gameGroup.update({
            where: { id: group.id },
            data: { week: nextWeek },
        });

        // update each game
        for (const game of group.games) {
            const state = game.state;
            const orders = game.orders;

            // carry over inventories
            for (const role of roleOrder) {
                const rs = state.roles[role];
                const lastInv = rs.inventory[rs.inventory.length - 1] ?? 0;
                while (rs.inventory.length < nextWeek) rs.inventory.push(lastInv);
            }

            // arriving orders
            for (const o of orders) {
                if (o.week === currentWeek - 2) {
                    state.roles[o.role].inventory[nextWeek - 1] += o.amount;
                }
            }

            // departing orders through chain
            for (const o of orders) {
                if (o.role !== "FACTORY" && o.week === currentWeek) {
                    const contributor = roleOrder[roleOrder.indexOf(o.role) + 1];
                    const cs = state.roles[contributor];
                    const inv = cs.inventory[nextWeek - 1];

                    if (inv < o.amount) {
                        await prisma.order.update({
                            where: { id: o.id },
                            data: { amount: Math.max(inv, 0) },
                        });
                    }

                    cs.inventory[nextWeek - 1] = inv - o.amount;
                }
            }

            // retailer sells to customer
            const rs = state.roles["RETAILER"];
            rs.inventory[nextWeek - 1] -= state.customerOrder[currentWeek - 1];

            const updatedGame = await prisma.game.update({
                where: { id: game.id },
                data: { state },
                include: { group: true },
            });

            io.emit("stateUpdate", {
                roomCode: updatedGame.roomCode,
                week: updatedGame.group.week,
                state: updatedGame.state,
            });
        }

        return nextWeek;
    },
};