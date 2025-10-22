const bcrypt = require("bcrypt");
const { PrismaClient, Role } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
    // clear old data
    await prisma.order.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.game.deleteMany({});

    const seedGame = await prisma.game.create({
        data: {
            roomCode: "ROOM123",
            state: {
                customerOrder: [4],
                roles: {
                    RETAILER: { inventory: [12], backlog: [0] },
                    WHOLESALER: { inventory: [12], backlog: [0] },
                    DISTRIBUTOR: { inventory: [12], backlog: [0] },
                    FACTORY: { inventory: [12], backlog: [0] },
                },
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
        },
    });

    const users = [
        { username: "retailer", password: "retailer123", role: Role.RETAILER },
        { username: "wholesaler", password: "wholesaler123", role: Role.WHOLESALER },
        { username: "distributor", password: "distributor123", role: Role.DISTRIBUTOR },
        { username: "factory", password: "factory123", role: Role.FACTORY },
        { username: "admin", password: "admin123", role: Role.ADMIN },
    ];
    
    for (const user of users) {
        await prisma.user.create({
            data: {
                username: user.username,
                password: await bcrypt.hash(user.password, 10),
                role: user.role,
                gameId: seedGame.id,
            },
        });
    }

    console.log("Seeding done");
}

main()
    .catch((error) => console.error(error))
    .finally(async () => await prisma.$disconnect());
