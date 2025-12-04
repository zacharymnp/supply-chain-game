module.exports = io => {
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
};
