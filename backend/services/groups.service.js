const prisma = require("../prisma");

exports.createGroup = async ({ size, name, pattern, baseOrder, weeksUntilSpike }) => {
    // generate customer orders
    const defaultWeeks = 50;
    const customerOrders = [];
    if (pattern === "oneSpike") {
        for (let i = 0; i < weeksUntilSpike; i++) customerOrders.push(baseOrder);
        for (let i = 0; i < defaultWeeks - weeksUntilSpike; i++) customerOrders.push(2 * baseOrder);
    }
    else if (pattern === "constant") {
        for (let i = 0; i < defaultWeeks; i++) customerOrders.push(baseOrder);
    }
    else if (pattern === "manual") {
        customerOrders.push(baseOrder);
    }
    else {
        customerOrders.push(baseOrder); // redundant, but I don't trust not having it
    }

    const group = await prisma.gameGroup.create({
        data: { groupCode: name }
    });

    for (let i = 0; i < size; i++) {
        await prisma.game.create({
            data: {
                roomCode: `${name}-${i}`,
                groupId: group.id,
                state: {
                    customerOrder: customerOrders,
                    roles: {
                        RETAILER: { inventory: [12] },
                        WHOLESALER: { inventory: [12] },
                        DISTRIBUTOR: { inventory: [12] },
                        FACTORY: { inventory: [12] }
                    }
                },
                orders: {
                    create: [
                        { role: "RETAILER", amount: 4, week: -1 },
                        { role: "WHOLESALER", amount: 4, week: -1 },
                        { role: "DISTRIBUTOR", amount: 4, week: -1 },
                        { role: "FACTORY", amount: 4, week: -1 },
                        { role: "RETAILER", amount: 4, week: 0 },
                        { role: "WHOLESALER", amount: 4, week: 0 },
                        { role: "DISTRIBUTOR", amount: 4, week: 0 },
                        { role: "FACTORY", amount: 4, week: 0 },
                    ],
                },
            }
        });
    }

    return { success: true, groupId: group.id };
};

exports.getGroup = groupCode =>
    prisma.gameGroup.findUnique({
        where: { groupCode },
        include: { games: { select: { roomCode: true } } }
    });

exports.listGroups = () =>
    prisma.gameGroup.findMany({ select: { groupCode: true } });
