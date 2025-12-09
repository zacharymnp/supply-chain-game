const prisma = require("../prisma");
const { getIO } = require("../sockets");
const roleOrder = ["RETAILER", "WHOLESALER", "DISTRIBUTOR", "FACTORY"];

exports.getOrderStatus = async roomCode => {
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
};

exports.getAllOrders = async roomCode => {
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
    for (const order of orders) {
        if (!map[order.role]) map[order.role] = {};
        if (order.week > 0) map[order.role][order.week] = order.amount;
    }

    return map;
};

exports.getOutgoingOrder = async (roomCode, role) => {
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
};

exports.submitOrder = async (roomCode, role, amount, week) => {
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
};

exports.addCustomerOrder = async (roomCodes, amount) => {
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

        const io = getIO();
        io.emit("stateUpdate", {
            roomCode: updated.roomCode,
            week: updated.group.week,
            state: updated.state,
        });
    }

    return true;
};

exports.advanceWeek = async groupCode => {
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

    // make sure all four orders are in before proceeding
    for (const game of group.games) {
        const orderCount  = game.orders.filter(order => order.week === currentWeek).length;
        if (orderCount < 4) {
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

        // inventory starts with last week's values
        for (const role of roleOrder) {
            const roleState = state.roles[role];
            const lastInventory = roleState.inventory[roleState.inventory.length - 1] ?? 0;
            while (roleState.inventory.length < nextWeek) roleState.inventory.push(lastInventory);
        }

        // process arriving orders
        for (const order of orders) {
            if (order.week === currentWeek - 2 && order.role !== "FACTORY" || order.week === currentWeek - 1 && order.role === "FACTORY") { // TODO: is factory actually supposed to have less delay?
                const roleState = state.roles[order.role];
                const inventory = roleState.inventory[nextWeek - 1];
                if (inventory < 0) { // TODO: check this
                    if (order.role !== "RETAILER") {
                        await prisma.order.update({
                            where: {
                                gameId_role_week_key: {
                                    gameId: game.id,
                                    role: roleOrder[roleOrder.indexOf(order.role) - 1],
                                    week: currentWeek,
                                }
                            },
                            data: { backlog: Math.min(-inventory, order.amount + order.backlog) },
                        });
                    }
                }
                roleState.inventory[nextWeek - 1] += order.amount + order.backlog; // TODO: check this
            }
        }

        // process departing orders
        for (const order of orders) {
            if (order.week === currentWeek && order.role !== "FACTORY") {
                const contributor = roleOrder[roleOrder.indexOf(order.role) + 1];
                const contributorState = state.roles[contributor];
                const currentInventory = contributorState.inventory[nextWeek - 1]; // use nextWeek to account for previous loop

                // update order if there is not enough inventory for a full shipment
                if (currentInventory < order.amount) { // TODO: check
                    // calculate how much of order inventory allows for
                    const departingOrder = Math.max(currentInventory, 0); // TODO: check this

                    await prisma.order.update({
                        where: { id: order.id },
                        data: { amount: departingOrder }, // TODO: check this
                    });
                }

                contributorState.inventory[nextWeek - 1] = currentInventory - order.amount;
            }
        }

        // process departing order from RETAILER, which immediately go to customer
        const retailerState = state.roles["RETAILER"];
        retailerState.inventory[nextWeek - 1] = retailerState.inventory[nextWeek - 1] - state.customerOrder[currentWeek - 1];

        const updatedGame = await prisma.game.update({
            where: { id: game.id },
            data: { state },
            include: { group: true },
        });

        const io = getIO();
        io.emit("stateUpdate", {
            roomCode: updatedGame.roomCode,
            week: updatedGame.group.week,
            state: updatedGame.state,
        });
    }

    return nextWeek;
};