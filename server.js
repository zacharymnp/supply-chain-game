const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// Authentication
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const SECRET = process.env.JWT_SECRET || "supersecretpassword";

// TODO: replace with database
let users = {
    retailer: { passwordHash: bcrypt.hashSync("retailer123", 10), role: "retailer" },
    wholesaler: { passwordHash: bcrypt.hashSync("wholesaler123", 10), role: "wholesaler" },
    distributor: { passwordHash: bcrypt.hashSync("distributor123", 10), role: "distributor" },
    factory: { passwordHash: bcrypt.hashSync("factory123", 10), role: "factory" },
    admin: { passwordHash: bcrypt.hashSync("admin123", 10), role: "admin" },
};

const server = http.createServer(app);
const io = new Server(server);

// TODO: workshop the heck out of this
let gameState = {
    week: 1,
    roles: {
        factory: { inventory: 0, backlog: 0, orders: [] },
        distributor: { inventory: 0, backlog: 0, orders: [] },
        wholesaler: { inventory: 0, backlog: 0, orders: [] },
        retailer: { inventory: 0, backlog: 0, orders: [] }
    },
    buffers: {
        productionBuffer: 0,
        factoryToDistributorBuffer: 0,
        distributorToWholesalerBuffer: 0,
        wholesalerToRetailerBuffer: 0,
    }
}

// Example socket connection
io.on("connection", (socket) => {
    console.log("A player connected");
    socket.emit("stateUpdate", gameState);
});

// Serve React build in production
app.use(express.static(path.join(__dirname, "frontend/dist")));
app.get(/^\/.*$/, (req, res) => {
    res.sendFile(path.join(__dirname, "frontend/dist/index.html"));
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));

// Get current game state
app.get("/api/state", (request, response) => {
    response.json(gameState);
});

// Players login
app.post("/api/login", async (request, response) => {
    const { username, password } = request.body;
    const user = users[username];
    if (!user) return response.status(401).json({ error: "Invalid credentials" });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return response.status(401).json({ error: "Invalid credentials" });

    const token = jwt.sign({ role: user.role }, SECRET, { expiresIn: "8h" });
    response.json({ token, role: user.role });
});

//  Players submit orders
app.post("/api/order", (request, response) => {
    const { role, amount } = request.body;
    gameState.roles[role].orders.push(amount);
    console.log(`Order received: ${role} -> ${amount}`);
    console.log("Updated state:", gameState);

    response.json({ success: true });
    io.emit("stateUpdate", gameState);
});

// Advances the "week" / turn
app.post("/api/advanceWeek", requireRole(["admin"]), (request, response) => {
    // TODO: more states will need to change
    gameState.week++;
    io.emit("stateUpdate", gameState);
    response.json({ success: true, week: gameState.week });
});

// Checks role of user against the role that is required for a particular request
function requireRole(roles) {
    return (req, res, next) => {
        const header = req.headers.authorization;
        if (!header) return res.status(401).json({ error: "Missing token" });
        const token = header.split(" ")[1];
        try {
            const decoded = jwt.verify(token, SECRET);
            if (!roles.includes(decoded.role)) {
                return res.status(403).json({ error: "Forbidden" });
            }
            req.user = decoded;
            next();
        } catch {
            res.status(401).json({ error: "Invalid token" });
        }
    };
}