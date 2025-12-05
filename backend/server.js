const http = require("http");
const { Server } = require("socket.io");
const app = require("./app")
const PORT = process.env.PORT;
const { initializeSockets } = require("./sockets")

// create HTTP server + Socket.IO
const server = http.createServer(app);
initializeSockets(server);

// start server
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));