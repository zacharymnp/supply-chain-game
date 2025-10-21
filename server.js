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

const app = express();
app.use(cors());
app.use(express.json());
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "http://localhost:5173",
        methods: ["GET", "POST"]
    }
});

// -------------------- SOCKET.IO --------------------
io.on("connection", (socket) => {
    console.log("A player connected");
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
                        RETAILER: { inventory: [12], backlog: [0], incomingOrders: [] },
                        WHOLESALER: { inventory: [12], backlog: [0], incomingOrders: [] },
                        DISTRIBUTOR: { inventory: [12], backlog: [0], incomingOrders: [] },
                        FACTORY: { inventory: [12], backlog: [0], incomingOrders: [] },
                    },
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

// TODO: users should create their own (temporary) login

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
 * Players submit orders
 */
app.post("/api/order", async (request, response) => {
    const { roomCode, role, amount, week } = request.body;

    try {
        const game = await prisma.game.findUnique({ where: { roomCode } });
        if (!game) return response.status(404).json({ error: "Game not found" });

        const gameState = game.state;

        await prisma.order.create({
            data: { gameId: game.id, role, amount, week },
        });

        const newOrder = { role, amount, weeksUntilArrival: 2};
        gameState.roles[role].incomingOrders.push(newOrder);

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
        const game = await prisma.game.findUnique({ where: { roomCode } });
        if (!game) return response.status(404).json({ error: "Game not found" });
        const gameState = JSON.parse(game.state);

        const currentWeek = gameState.week;
        const nextWeek = currentWeek + 1;

        // compute demand flow: customer → retailer → wholesaler → distributor → factory
        const roleOrder = ["RETAILER", "WHOLESALER", "DISTRIBUTOR", "FACTORY"];
        const demand = {
            RETAILER: gameState.customerOrder[currentWeek],
            WHOLESALER: 0,
            DISTRIBUTOR: 0,
            FACTORY: 0,
        };

        // TODO: make sure any of this is right
        // propagate previous week’s outgoing orders as new demand upstream
        for (let i = 1; i < roleOrder.length; i++) {
            const downstream = roleOrder[i - 1];
            const upstream = roleOrder[i];
            const downstreamState = gameState.roles[downstream];
            const lastOutgoingOrder = downstreamState.incomingOrders.at(-1);
            demand[upstream] = lastOutgoingOrder.amount;
        }

        // process each role in downstream→upstream order
        for (const roleName of roleOrder) {
            const roleState = gameState.roles[roleName];
            const previousInventory = roleState.inventory.at(-1) ?? 0;
            const previousBacklog = roleState.backlog.at(-1) ?? 0;
            let newInventory = previousInventory;
            let newBacklog = previousBacklog;

            const updatedOrders = [];
            for (const order of roleState.incomingOrders) {
                if (order.delay <= 0) { // shipment has arrived
                    newInventory += order.amount;
                }
                else {
                    updatedOrders.push({ ...order, delay: order.delay - 1 })
                }
            }
            roleState.incomingOrders = updatedOrders;

            // attempt to fulfill this week's demand + backlog
            const totalDemand = demand[roleName] + newBacklog;
            const shipped = Math.min(newInventory, totalDemand);
            newInventory -= shipped;
            newBacklog = totalDemand - shipped;

            roleState.inventory.push(newInventory);
            roleState.backlog.push(newBacklog);
        }

        gameState.week = newWeek;

        await prisma.game.update({
            where: { id: game.id },
            data: { week: newWeek, state: JSON.stringify(gameState) },
        });

        io.emit("stateUpdate", gameState);
        response.json({ success: true, week: newWeek });
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