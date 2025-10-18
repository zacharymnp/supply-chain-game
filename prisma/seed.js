const bcrypt = require("bcrypt");
const { PrismaClient, Role } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
    // clear old data
    await prisma.game.deleteMany({});
    await prisma.user.deleteMany({});

    const seedGame = await prisma.game.create({
        data: {
            roomCode: "ROOM123",
            state: {
                roles: {
                    retailer: { inventory: [12], backlog: [0], incomingOrders: [] },
                    wholesaler: { inventory: [12], backlog: [0], incomingOrders: [] },
                    distributor: { inventory: [12], backlog: [0], incomingOrders: [] },
                    factory: { inventory: [12], backlog: [0], incomingOrders: [] },
                },
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
