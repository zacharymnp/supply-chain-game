const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { PrismaClient, Role } = require("@prisma/client");

const prisma = new PrismaClient();
const SECRET = process.env.JWT_SECRET;

// -------------------- SOCKET.IO --------------------
// express setup
const app = express();
app.use(cors());
app.use(express.json());

// HTTP server setup
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: process.env.VITE_FRONTEND_URL,
        methods: ["GET", "POST"]
    }
});
io.on("connection", (socket) => {
    console.log("New connection: ${socket.id}");

    socket.on("joinRoom", (roomCode) => {
        socket.join(roomCode);
        console.log(`Socket ${socket.id} joined room ${roomCode}`);
        io.to(roomCode).emit("playerJoined", { playerId: socket.id });
    });

    socket.on("disconnect", () => {
        console.log(`Disconnected: ${socket.id}`);
    });
});

// -------------------- HELPERS --------------------
function requireRole(roles) {
    return (request, response, next) => {
        const header = request.headers.authorization;
        if (!header) return response.status(401).json({ error: "Missing token" });
        const token = header.split(" ")[1];
        try {
            const decoded = jwt.verify(token, SECRET);
            const userRole = decoded.role;
            if (!roles.includes(userRole)) {
                return response.status(403).json({ error: "Forbidden" });
            }
            request.user = decoded;
            next();
        }
        catch {
            response.status(401).json({ error: "Invalid token" });
        }
    };
}

// -------------------- SERVER SENT EVENTS --------------------
const sseClients = {};
const roomGraphState = {};

app.get("/api/events/:roomCode", (request, response) => {
    const { roomCode } = request.params;

    response.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
    });

    if (!sseClients[roomCode]) sseClients[roomCode] = new Set();
    sseClients[roomCode].add(response);

    const showGraphs = roomGraphState[roomCode] ?? false;
    response.write(`event: showGraphs\ndata: ${JSON.stringify({ show: showGraphs })}\n\n`);

    const keepAlive = setInterval(() => response.write(":\n\n"), 15000);

    request.on("close", () => {
        clearInterval(keepAlive);
        sseClients[roomCode].delete(response);
    });
});

app.post("/api/showGraphs", (request, response) => {
    const { roomCodes } = request.body;
    if (!Array.isArray(roomCodes)) return response.status(400).send("Invalid input");

    roomCodes.forEach(roomCode => {
        roomGraphState[roomCode] = true;
        const clients = sseClients[roomCode];
        if (clients) {
            for (const client of clients) {
                client.write(`event: showGraphs\ndata: ${JSON.stringify({ show: true })}\n\n`);
            }
        }
    });

    response.send({ success: true });
});

// -------------------- ROUTES --------------------

/**
 * Generates a group of a particular number of rooms
 */
app.post("/api/createGroup", requireRole([Role.ADMIN]), async (request, response) => {
    const { size, name } = request.body;

    try {
        const group = await prisma.gameGroup.create({
            data: { groupCode: name }
        });

        for (let i = 0; i < size; i++) {
            await prisma.game.create({
                data: {
                    roomCode: `${name}-${i}`,
                    groupId: group.id,
                    state: {
                        customerOrder: [4],
                        roles: {
                            RETAILER: { inventory: [12] },
                            WHOLESALER: { inventory: [12] },
                            DISTRIBUTOR: { inventory: [12] },
                            FACTORY: { inventory: [12] },
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
                }
            });
        }
        response.status(201).json({
            success: true,
            groupId: group.id,
        });
    }
    catch (error) {
        console.error(error);
        response.status(500).json({ error: "Failed to create group" });
    }
});

/**
 * Players register a username and password
 */

app.post("/api/register", async (request, response) => {
    const { username, password } = request.body;
    try {
        await prisma.user.create({
            data: {
                username: username,
                password: await bcrypt.hash(password, 10),
                role: Role.UNASSIGNED,
            },
        });
    }
    catch (error) {
        console.error(error);
         response.status(500).json({ error: "Server error" });
    }
});

/**
 * Players login with their username and password
 */
app.post("/api/login", async (request, response) => {
    const { username, password } = request.body;

    try {
        const user = await prisma.user.findUnique({ where: { username } });
        if (!user) return response.status(401).json({ error: "Invalid credentials" });

        const ok = await bcrypt.compare(password, user.password);
        if (!ok) return response.status(401).json({ error: "Invalid credentials" });

        const token = jwt.sign({ role: user.role, id: user.id }, SECRET, { expiresIn: "8h" });
        response.json({ token, role: user.role });
    }
    catch (error) {
        console.error(error);
        response.status(500).json({ error: "Server error" });
    }
});

/**
 * Gets the list of rooms in a group
 */
app.get("/api/group/:groupCode", async (request, response) => {
    const { groupCode } = request.params;

    try {
        const group = await prisma.gameGroup.findUnique({
            where: { groupCode },
            include: { games: { select: { roomCode: true } } },
        });
        if (!group) return response.status(404).json({ error: "Group not found" });

        response.json({
            success: true,
            games: group.games.map(game => game.roomCode),
            week: group.week,
        });
    }
    catch (error) {
        console.error(error);
        response.status(500).json({ error: "Failed to fetch games in group" });
    }
});

/**
 * Gets the list of existing groups
 */
app.get("/api/groups", async (request, response) => {
    try {
        const groups = await prisma.gameGroup.findMany({ select: { groupCode: true } });
        response.json({ groups: groups.map((group) => group.groupCode) });
    }
    catch (error) {
        console.error(error);
        response.status(500).json({ error: "Failed to list groups" });
    }
});

/**
 * Gets the list of existing rooms
 */
app.get("/api/rooms", async (request, response) => {
    try {
        const rooms = await prisma.game.findMany({ select: { roomCode: true } });
        response.json({ rooms: rooms.map((room) => room.roomCode) });
    }
    catch (error) {
        console.error(error);
        response.status(500).json({ error: "Failed to list rooms" });
    }
});

/**
 * Gets the game with a particular roomCode
 */
app.get("/api/game/:roomCode", async (request, response) => {
    const { roomCode } = request.params;

    try {
        const game = await prisma.game.findUnique({
            where: { roomCode },
            include: { orders: true, group: true },
        });
        if (!game) return response.status(404).json({ error: "Game not found" });

        response.json({
            roomCode: roomCode,
            week: game.group.week,
            state: game.state,
        });
    }
    catch (error) {
        console.error(error);
        response.status(500).json({ error: "Server error" });
    }
});

/**
 * Gets the order status for all roles in the current week
 */
app.get("/api/orderStatus", requireRole(["ADMIN"]), async (request, response) => {
    const { roomCode } = request.query;

    try {
        const game = await prisma.game.findUnique({
            where: { roomCode },
            select: { id: true, state: true, group: { select: { week: true } } },
        });
        if (!game) return response.status(404).json({ error: "Game not found" });
        const week = game.group.week;

        const orders = await prisma.order.findMany({
            where: {
                gameId: game.id,
                week: week,
            },
            select: { role: true, amount: true },
        });

        const roles = ["RETAILER", "WHOLESALER", "DISTRIBUTOR", "FACTORY"];
        const status = {};
        for (const role of roles) {
            const order = orders.find((order) => order.role === role);
            if (order) {
                status[role] = { amount: order.amount };
            }
            else {
                status[role] = { amount: -1 };
            }
        }

        if (game.state.customerOrder.length >= week) {
            status["CUSTOMER"] = { amount: game.state.customerOrder[week - 1] };
        }
        else {
            status["CUSTOMER"] = { amount: -1 };
        }

        response.json({ success: true, status });
    }
    catch (error) {
        console.error(error);
        response.status(500).json({ error: "Server error" });
    }
});

/**
 * Gets all orders from a room
 */
app.get("/api/allOrders", async (request, response) => {
    const { roomCode } = request.query;

    try {
        const game = await prisma.game.findUnique({
            where: { roomCode },
            select: { id: true },
        });
        if (!game) return response.status(404).json({ error: "Game not found" });

        const orders = await prisma.order.findMany({
            where: {
                gameId: game.id,
            },
            select: { role: true, amount: true, week: true },
        });

        const orderMap = {};
        for (const { role, amount, week } of orders) {
            if (!orderMap[role]) orderMap[role] = {};
            if (week > 0) orderMap[role][week] = amount; // do not include the faux orders from weeks -1 and 0
        }

        response.json({ success: true, orders: orderMap });
    }
    catch (error) {
        console.error(error);
        response.status(500).json({ error: "Server error" });
    }
});

/**
 * Gets the outgoing order in a given week for a particular role
 */
app.get("/api/outgoingOrder", async (request, response) => {
    const { roomCode, role } = request.query;

    try {
        const game = await prisma.game.findUnique({
            where: { roomCode },
            select: { id: true, state: true, group: true },
        });
        if (!game) return response.status(404).json({ error: "Game not found" });
        const week = game.group.week;

        let orderAmount;
        if (week === 1) {
            orderAmount = -1; // no previous order
        }
        else if (role === "RETAILER") {
            orderAmount = game.state.customerOrder[week - 2];
        }
        else {
            const roles = ["RETAILER", "WHOLESALER", "DISTRIBUTOR", "FACTORY"];
            const order = await prisma.order.findFirst({
                where: {
                    gameId: game.id,
                    week: week - 1,
                    role: roles[roles.indexOf(role) - 1],
                },
                select: { amount: true },
            });
            orderAmount = order.amount;
        }

        response.json({ success: true, amount: orderAmount });
    }
    catch (error) {
        console.error(error);
        response.status(500).json({ error: "Server error" });
    }
});

/**
 * Players submit orders
 */
app.post("/api/order", async (request, response) => {
    const { roomCode, role, amount, week } = request.body;

    try {
        const game = await prisma.game.findUnique({
            where: { roomCode },
            select: { id: true, state: true },
        });
        if (!game) return response.status(404).json({ error: "Game not found" });

        // add new order, or update order if one has already been added
        await prisma.order.upsert({
            create: { gameId: game.id, role, amount, week },
            update: { amount },
            where: { gameId_role_week_key: { gameId: game.id, role, week }},
        });
        response.json({ success: true });
    }
    catch (error) {
        console.error(error);
        response.status(500).json({ error: "Server error" });
    }
});

/**
 * Adds next week's customer order for many rooms
 */
app.post("/api/customerOrder", requireRole(["ADMIN"]), async (request, response) => {
    const { roomCodes, amount } = request.body;

    if (!Array.isArray(roomCodes) || typeof amount !== "number") {
        return response.status(400).json({ error: "Invalid input" });
    }

    try {
        for (const roomCode of roomCodes) {
            const game = await prisma.game.findUnique({
                where: { roomCode },
                select: { id: true, group: true, state: true },
            });
            if (!game) continue;
            const gameState = game.state;
            const week = game.group.week;

            // add new order, or update order if one has already been added
            if (gameState.customerOrder.length < week) {
                gameState.customerOrder.push(amount);
            }
            else {
                gameState.customerOrder[week - 1] = amount;
            }

            const updatedGame = await prisma.game.update({
                where: { id: game.id },
                data: { state: gameState },
                include: { group: true },

            });
            io.emit("stateUpdate", {
                roomCode: updatedGame.roomCode,
                week: updatedGame.group.week,
                state: updatedGame.state,
            });
        }

        response.json({ success: true });
    }
    catch (error) {
        console.error(error);
        response.status(500).json({ error: "Server error" });
    }
});

/**
 * Admins advance the week in a particular group
 */
app.post("/api/advanceWeek", requireRole(["ADMIN"]), async (request, response) => {
    const { groupCode } = request.body;

    try {
        const group = await prisma.gameGroup.findUnique({
            where: { groupCode },
            include: {
                games: {
                    include: {
                        orders: true
                    }
                }
            },
        });
        if (!group) return response.status(404).json({ error: "Group not found" });

        const currentWeek = group.week;
        const nextWeek = currentWeek + 1;

        // make sure all four orders are in before proceeding
        for (const game of group.games) {
            const orderCount = game.orders.filter((order) => order.week === currentWeek).length;
            if (orderCount < 4) {
                return response.status(400).json({error: "Some teams have not placed their orders"});
            }
        }

        // demand flow: customer → retailer → wholesaler → distributor → factory
        const roleOrder = ["RETAILER", "WHOLESALER", "DISTRIBUTOR", "FACTORY"];

        // only update week once
        const updatedGroup = await prisma.gameGroup.update({
            where: { id: group.id },
            data: { week: nextWeek },
        });

        for (const game of group.games) {
            const gameState = game.state;
            const gameId = game.id;
            const orders = game.orders;

            // inventory starts with last week's values
            for (const role of roleOrder) {
                const roleState = gameState.roles[role];
                const lastInventory = roleState.inventory[roleState.inventory.length - 1] ?? 0;
                while (roleState.inventory.length < nextWeek) roleState.inventory.push(lastInventory);
            }

            // process arriving orders
            for (const order of orders) {
                const roleState = gameState.roles[order.role];
                if (order.week === currentWeek - 2) {
                    roleState.inventory[nextWeek - 1] += order.amount;
                }
            }
            // process departing orders
            for (const order of orders) {
                if (order.role !== "FACTORY" && order.week === currentWeek) {
                    const contributor = roleOrder[roleOrder.indexOf(order.role) + 1];
                    const contributorState = gameState.roles[contributor];

                    const currentInventory = contributorState.inventory[nextWeek - 1]; // use nextWeek to account for previous loop

                    // update order if there is not enough inventory for a full shipment
                    if (currentInventory < order.amount) {
                        // calculate how much of order inventory allows for
                        const departingOrder = Math.max(currentInventory, 0);

                        await prisma.order.update({
                            where: { id: order.id },
                            data: { amount: departingOrder },
                        });
                    }
                    contributorState.inventory[nextWeek - 1] = currentInventory - order.amount;
                }
            }
            // process departing order from RETAILER, which immediately go to customer
            const retailerState = gameState.roles["RETAILER"];
            retailerState.inventory[nextWeek - 1] = retailerState.inventory[nextWeek - 1] - gameState.customerOrder[currentWeek - 1];

            const updatedGame = await prisma.game.update({
                where: { id: gameId },
                data: { state: gameState },
                include: { group: true },

            });
            io.emit("stateUpdate", {
                roomCode: updatedGame.roomCode,
                week: updatedGame.group.week,
                state: updatedGame.state,
            });
        }

        response.json({ success: true, week: nextWeek });
    }
    catch (error) {
        console.error(error);
        response.status(500).json({ error: "Server error" });
    }
});

// -------------------- STATIC FILES --------------------
app.use(express.static(path.join(__dirname, "frontend/dist")));
app.get(/^\/(?!api).*$/, (request, response) => {
    response.sendFile(path.join(__dirname, "frontend/dist/index.html"));
});

// -------------------- START SERVER --------------------
const PORT = process.env.PORT;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));