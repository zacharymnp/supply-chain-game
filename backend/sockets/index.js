let io;

function initializeSockets(server) {
    const {Server} = require("socket.io");
    io = new Server(server, {
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
            io.to(roomCode).emit("playerJoined", {playerId: socket.id});
        });

        socket.on("disconnect", () => {
            console.log(`Disconnected: ${socket.id}`);
        });
    });

    return io;
}

function getIO() {
    if (!io) throw new Error ("Socket.io not initialized");
    return io;
}

module.exports = { initializeSockets, getIO }