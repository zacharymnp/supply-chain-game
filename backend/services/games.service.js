const prisma = require("../prisma");

exports.listRooms = () =>
    prisma.game.findMany({ select: { roomCode: true } });

exports.getGame = async roomCode => {
    const game = await prisma.game.findUnique({
        where: { roomCode },
        include: { group: true, orders: true }
    });
    if (!game) throw new Error();
    return {
        roomCode,
        week: game.group.week,
        state: game.state
    };
};
