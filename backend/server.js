const http = require("http");
const { Server } = require("socket.io");
const app = require("./app")
const PORT = process.env.PORT;

// create HTTP server + Socket.IO
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: process.env.VITE_FRONTEND_URL,
        methods: ["GET", "POST"]
    }
});
require("./sockets")(io);

// start server
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));