const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { PrismaClient, Role } = require("@prisma/client");

const prisma = new PrismaClient();
const SECRET = process.env.JWT_SECRET || "supersecretpassword";

// -------------------- SOCKET.IO --------------------
// express setup
const app = express();
app.use(cors());
app.use(express.json());

// HTTP server setup
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "http://localhost:5173",
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

// -------------------- ROUTES --------------------
/**
 * Generates a new game with a given roomCode
 */
app.post("/api/createGame", requireRole([Role.ADMIN]), async (request, response) => {
    const { roomCode } = request.body;

    try {
        const game = await prisma.game.create({
            data: {
                roomCode: roomCode,
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

        console.log(`Created new game with roomCode ${roomCode}`);
        response.status(201).json({
            success: true,
            message: "Game created successfully",
            gameId: game.id,
            roomCode: game.roomCode,
        });
    }
    catch (error) {
        console.error(error);
        response.status(500).json({ error: "Server error" });
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
            include: { orders: true },
        });
        if (!game) return response.status(404).json({ error: "Game not found" });

        response.json({
            roomCode: roomCode,
            week: game.week,
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
            select: { id: true, week: true, state:true },
        });
        if (!game) return response.status(404).json({ error: "Game not found" });

        const orders = await prisma.order.findMany({
            where: {
                gameId: game.id,
                week: game.week,
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

        if (game.state.customerOrder.length >= game.week) {
            status["CUSTOMER"] = { amount: game.state.customerOrder[game.week - 1] };
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
 * Gets the outgoing order in a given week for a particular role
 */
app.get("/api/outgoingOrder", async (request, response) => {
    const { roomCode, week, role } = request.query;

    try {
        const game = await prisma.game.findUnique({
            where: { roomCode },
            select: { id: true, state: true, week: true },
        });
        if (!game) return response.status(404).json({ error: "Game not found" });

        let orderAmount;
        if (game.week === 1) {
            orderAmount = -1; // no previous order
        }
        else if (role === "RETAILER") {
            orderAmount = game.state.customerOrder[game.week - 2];
        }
        else {
            const roles = ["RETAILER", "WHOLESALER", "DISTRIBUTOR", "FACTORY"];
            const order = await prisma.order.findFirst({
                where: {
                    gameId: game.id,
                    week: game.week - 1,
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

        const updatedGame = await prisma.game.findUnique({
            where: { id: game.id },
            include: { orders: true, users: true },
        });

        io.to(roomCode).emit("stateUpdate", updatedGame);
        response.json({ success: true });
    }
    catch (error) {
        console.error(error);
        response.status(500).json({ error: "Server error" });
    }
});

/**
 * Adds next week's customer order
 */
app.post("/api/customerOrder", requireRole(["ADMIN"]), async (request, response) => {
    const { roomCode, amount } = request.body;

    try {
        const game = await prisma.game.findUnique({
            where: { roomCode },
            select: { id: true, week: true, state: true },
        });
        if (!game) return response.status(404).json({ error: "Game not found" });

        const gameState = game.state;

        // add new order, or update order if one has already been added
        if (gameState.customerOrder.length < game.week) {
            gameState.customerOrder.push(amount);
        }
        else {
            gameState.customerOrder[game.week - 1] = amount;
        }

        const updatedGame = await prisma.game.update({
            where: { id: game.id },
            data: { state: gameState },
        });

        io.emit("stateUpdate", updatedGame);
        response.json({ success: true });
    }
    catch (error) {
        console.error(error);
        response.status(500).json({ error: "Server error" });
    }
});

/**
 * Admins advance the week in a particular room
 */
app.post("/api/advanceWeek", requireRole(["ADMIN"]), async (request, response) => {
    const { roomCode } = request.body;

    try {
        const game = await prisma.game.findUnique({
            where: { roomCode },
            select: { id: true, week: true, state: true },
        });
        if (!game) return response.status(404).json({ error: "Game not found" });

        const gameId = game.id;
        const gameState = game.state;
        const currentWeek = game.week;
        const nextWeek = currentWeek + 1;

        // demand flow: customer → retailer → wholesaler → distributor → factory
        const roleOrder = ["RETAILER", "WHOLESALER", "DISTRIBUTOR", "FACTORY"];

        // inventory and backlog start with last week's values
        for (const role of roleOrder) {
            const roleState = gameState.roles[role];

            const lastInventory = roleState.inventory[roleState.inventory.length - 1] ?? 0;
            const lastBacklog = roleState.backlog[roleState.backlog.length - 1] ?? 0;

            while (roleState.inventory.length < nextWeek) roleState.inventory.push(lastInventory);
            while (roleState.backlog.length < nextWeek) roleState.backlog.push(lastBacklog);
        }

        const orders = await prisma.order.findMany({ where: { gameId } });

        // process arriving orders
        for (const order of orders) {
            const roleState = gameState.roles[order.role];
            if (order.week <= currentWeek - 2) {
                roleState.inventory[nextWeek - 1] += order.amount;
                await prisma.order.delete({where: { id: order.id } });
            }
        }
        // process departing orders
        for (const order of orders) {
            if (order.role !== "FACTORY" && order.week === currentWeek) {
                const contributor = roleOrder[roleOrder.indexOf(order.role) + 1];
                const contributorState = gameState.roles[contributor];

                const currentInventory = contributorState.inventory[nextWeek - 1]; // use nextWeek to account for previous loop
                const demand = contributorState.backlog[currentWeek - 1] + order.amount;
                if (currentInventory < demand) {
                    contributorState.inventory[nextWeek - 1] = 0;
                    contributorState.backlog[nextWeek - 1] = demand - currentInventory;
                    await prisma.order.update({
                        where: { id: order.id },
                        data: { amount: currentInventory },
                    });
                }
                else {
                    contributorState.inventory[nextWeek - 1] = currentInventory - demand;
                    contributorState.backlog[nextWeek - 1] = 0;
                }
            }
        }
        // process departing order from RETAILER
        const retailerState = gameState.roles["RETAILER"];
        const currentRetailerInventory = retailerState.inventory[nextWeek - 1]; // use nextWeek to account for previous loop
        const demandOnRetailer = retailerState.backlog[currentWeek - 1] + gameState.customerOrder[currentWeek - 1];
        if (currentRetailerInventory < demandOnRetailer) {
            retailerState.inventory[nextWeek - 1] = 0;
            retailerState.backlog[nextWeek - 1] = demandOnRetailer - currentRetailerInventory;
        }
        else {
            retailerState.inventory[nextWeek - 1] = currentRetailerInventory - demandOnRetailer;
            retailerState.backlog[nextWeek - 1] = 0;
        }

        const updatedGame = await prisma.game.update({
            where: { id: gameId },
            data: { week: nextWeek, state: gameState },
        });

        io.to(roomCode).emit("stateUpdate", updatedGame);
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
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));