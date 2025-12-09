// create mock functions
jest.mock("../../backend/prisma", () => ({
    gameGroup: {
        findUnique: jest.fn(),
        update: jest.fn()
    },
    order: {
        update: jest.fn()
    },
    game: {
        update: jest.fn()
    }
}));
const emitMock = jest.fn();
jest.mock("../../backend/sockets", () => ({
    getIO: () => ({ emit: emitMock })
}));

// import after mocks
const orderService = require("../../backend/services/orders.service");
const prisma = require("../../backend/prisma");
const { getIO } = require("../../backend/sockets");
const io = getIO();

const roleOrder = ["RETAILER", "WHOLESALER", "DISTRIBUTOR", "FACTORY"];

// helper functions
function makeGame({ id, week, orders, state }) {
    return {
        id,
        state,
        orders,
        roomCode: "ABCD",
    }
}
function makeRoleState(inventory) {
    return { inventory: [...inventory] };
}

describe("advanceWeek()", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("returns null if group does not exist", async () => {
        prisma.gameGroup.findUnique.mockResolvedValue(null);

        const result = await orderService.advanceWeek("X123");

        expect(result).toBeNull();
        expect(prisma.gameGroup.update).not.toHaveBeenCalled();
    });

    it("throws error if any game has fewer than 4 orders this week", async () => {
        prisma.gameGroup.findUnique.mockResolvedValue({
            id: 1,
            week: 5,
            games: [
                makeGame({
                    id: 10,
                    week: 5,
                    orders: [{ week: 5 }, { week: 5 }, { week: 5 }], // 3 orders defined
                    state: { roles: {} }
                })
            ]
        });

        await expect(orderService.advanceWeek("G123"))
            .rejects
            .toThrow("Some teams have not placed their orders");
    });

    it("advanced from default week 1 to week 2", async () => {
        const thisWeek = 1;
        const nextWeek = 2;

        const initialState = {
            roles: {
                RETAILER: makeRoleState([12]),
                WHOLESALER: makeRoleState([12]),
                DISTRIBUTOR: makeRoleState([12]),
                FACTORY: makeRoleState([12]),
            },
            customerOrder: [4]
        };
        const initialOrders = [
            // default orders
            { id: 1, role: "RETAILER", week: -1, amount: 4, backlog: 0 },
            { id: 2, role: "WHOLESALER", week: -1, amount: 4, backlog: 0 },
            { id: 3, role: "DISTRIBUTOR", week: -1, amount: 4, backlog: 0 },
            { id: 4, role: "FACTORY", week: -1, amount: 4, backlog: 0 },
            { id: 5, role: "RETAILER", week: 0, amount: 4, backlog: 0 },
            { id: 6, role: "WHOLESALER", week: 0, amount: 4, backlog: 0 },
            { id: 7, role: "DISTRIBUTOR", week: 0, amount: 4, backlog: 0 },
            { id: 8, role: "FACTORY", week: 0, amount: 4, backlog: 0 },
            // simulated orders
            { id: 9, role: "RETAILER", week: 1, amount: 4, backlog: 0 },
            { id: 10, role: "WHOLESALER", week: 1, amount: 4, backlog: 0 },
            { id: 11, role: "DISTRIBUTOR", week: 1, amount: 4, backlog: 0 },
            { id: 12, role: "FACTORY", week: 1, amount: 4, backlog: 0 },
        ];

        prisma.gameGroup.findUnique.mockResolvedValue({
            id: 10,
            week: thisWeek,
            games: [
                makeGame({
                    id: 20,
                    orders: initialOrders,
                    state: JSON.parse(JSON.stringify(initialState)),
                })
            ]
        });

        prisma.gameGroup.update.mockResolvedValue({});

        prisma.game.update.mockImplementation(async ({ data }) => ({
            id: 20,
            roomCode: "test-0",
            group: { week: nextWeek },
            state: data.state
        }));

        const result = await orderService.advanceWeek("test");
        expect(result).toBe(nextWeek);

        const updatedState = prisma.game.update.mock.calls[0][0].data.state;

        // expect inventory carry-over: stays [12, 12]
        for (const role of roleOrder) {
            expect(updatedState.roles[role].inventory).toEqual([12, 12]);
        }

        // analyse db calls
        expect(prisma.gameGroup.update).toHaveBeenCalledWith({
            where: { id: 10 },
            data: { week: nextWeek },
        });
        expect(prisma.game.update).toHaveBeenCalledTimes(1);

        // analyse socket emission
        expect(io.emit).toHaveBeenCalledWith("stateUpdate", {
            roomCode: "test-0",
            week: nextWeek,
            state: expect.any(Object),
        });
    });
});