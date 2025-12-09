const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const orderService = require("../../backend/services/orders.service");
const http = require("http");
const app = require("../../backend/app");

const roleOrder = ["RETAILER", "WHOLESALER", "DISTRIBUTOR", "FACTORY"];

function makeRoleState(inventory) {
    return { inventory: [...inventory] };
}

describe("Full game integration tests", () => {
    let group, game;
    const { initializeSockets } = require("../../backend/sockets")
    const server = http.createServer(app);
    initializeSockets(server);

    beforeAll(async () => {
        // clear old data
        await prisma.order.deleteMany({});
        await prisma.game.deleteMany({});
        await prisma.gameGroup.deleteMany({});

        // create group
        group = await prisma.gameGroup.create({
            data: { groupCode: "integration-test", week: 1 }
        });
    });

    afterAll(async () => {
        await prisma.$disconnect();
    });

    it("runs a group with one game for 24 weeks", async () => {
        // create game
        game = await prisma.game.create({
            data: {
                roomCode: "game-1",
                groupId: group.id,
                state: {
                    customerOrder: [4,4,4,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8],
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
                    ]
                }
            }
        });

        // test orders for each week
        const retailerOrders = [4,4,4,4,10,10,10,10,10,10,10,10,8,8,9,9,9,10,10,10,9,9,10,10,10];
        const wholesalerOrders = [4,4,3,4,8,10,14,18,10,10,8,0,0,0,10,4,0,0,0,5,0,0,0,0,10];
        const distributorOrders = [4,4,4,4,4,1,3,5,7,10,10,10,10,5,5,5,10,5,1,1,1,5,0,1,1];
        const factoryOrders = [4,4,4,4,10,15,15,15,20,4,0,5,0,0,0,0,0,0,0,0,6,6,5,6,0];

        // const retailerOrders = [4,4,4,4,1,2,5,10,17,5,2,10,10,10,10,5,15,15,15,15,15,15,15,15,15];
        // const wholesalerOrders = [4,4,4,4,4,8,4,1,0,0,8,15,0,10,10,10,5,0,0,10,20,20,20,7,5];
        // const distributorOrders = [4,4,4,4,6,6,6,6,2,1,1,1,1,6,6,15,15,20,15,5,5,5,15,15,40];
        // const factoryOrders = [4,4,4,4,4,3,5,4,4,4,5,3,5,1,0,0,0,5,7,58,63,51,0,0,0];

        // const retailerOrders = [4,4,4,4,0,2,4,8,8,8,2,2,2,10,10,12,15,15,15,20,2,10,76,50,50];
        // const wholesalerOrders = [4,4,4,4,4,1,1,1,2,2,2,3,3,3,2,0,0,0,4,3,3,0,0,3,0];
        // const distributorOrders = [4,4,4,4,2,4,12,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,3,1,1];
        // const factoryOrders = [4,4,4,4,0,0,0,0,10,12,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
        const roleOrdersMap = {
            RETAILER: retailerOrders,
            WHOLESALER: wholesalerOrders,
            DISTRIBUTOR: distributorOrders,
            FACTORY: factoryOrders
        };

        // expected inventories for each week
        const retailerInventory = [12,12,12,12,8,4,0,2,3,3,5,4,-3,-8,-11,-12,-10,-8,-6,-4,-7,-10,-17,-25];
        const wholesalerInventory = [12,12,12,12,12,5,-1,-3,-3,-6,-15,-22,-27,-28,-26,-25,-24,-23,-28,-33,-42,-51,-55,-65];
        const distributorInventory = [12,12,12,13,13,9,3,-7,-24,-31,-36,-37,-27,-17,-7,-7,-6,-1,4,14,14,15,16,17];
        const factoryInventory = [12,12,12,12,12,12,21,33,43,51,61,55,45,40,35,30,25,15,10,9,8,7,8,14];

        // const retailerInventory = [12,12,12,12,8,4,0,-7,-13,-16,-14,-5,-11,-19,-27,-27,-20,-28,-27,-34,-36,-38,-34,-42];
        // const wholesalerInventory = [12,12,12,12,12,15,17,16,14,1,-3,-5,-15,-17,-12,-22,-18,-32,-41,-50,-53,-68,-83,-93];
        // const distributorInventory = [12,12,12,12,12,12,8,10,15,21,27,21,7,8,-1,-10,-14,-13,-1,-1,-11,-26,-39,-8];
        // const factoryInventory = [12,12,12,12,12,10,8,5,4,6,9,12,16,18,17,12,-3,-18,-38,-48,-46,7,65,101];

        // const retailerInventory = [12,12,12,12,8,4,0,-8,-14,-18,-18,-18,-21,-27,-33,-39,-44,-49,-54,-60,-68,-76,-84,-88];
        // const wholesalerInventory = [12,12,12,12,12,16,18,18,11,4,-3,-3,-3,-3,-10,-17,-26,-39,-54,-69,-89,-87,-94,-167];
        // const distributorInventory = [12,12,12,12,12,12,15,16,19,27,25,23,24,21,18,16,16,16,16,12,9,6,6,6];
        // const factoryInventory = [12,12,12,12,12,14,10,-2,-3,-4,6,18,18,18,18,18,18,18,18,18,18,18,18,15];
        const roleInventoriesMap = {
            RETAILER: retailerInventory,
            WHOLESALER: wholesalerInventory,
            DISTRIBUTOR: distributorInventory,
            FACTORY: factoryInventory
        };

        for (let week = 1; week < 24; week++) {
            // order for each role
            for (const role of roleOrder) {
                const amount = roleOrdersMap[role][week - 1]; // subtract 1 for map
                await orderService.submitOrder("game-1", role, amount, week);
            }

            // advance week
            const advancedWeek = await orderService.advanceWeek("integration-test");
            expect(advancedWeek).toBe(week + 1);

            // check inventory array lengths
            const updatedGame = await prisma.game.findUnique({
                where: { roomCode: "game-1" }
            });
            for (const role of roleOrder) {
                try {
                    expect(updatedGame.state.roles[role].inventory).toHaveLength(week + 1);
                    expect(updatedGame.state.roles[role].inventory[advancedWeek - 1]).toBe(roleInventoriesMap[role][advancedWeek - 1]);
                }
                catch (error) {
                    throw new Error(`Week ${week} - Role ${role}\n${error}`);
                }
            }
        }
    }, 200000);
});
