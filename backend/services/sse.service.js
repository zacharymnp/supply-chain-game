const sseClients = {};
const roomGraphState = {};

exports.addClient = (roomCode, response) => {
    response.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive"
    });

    if (!sseClients[roomCode]) sseClients[roomCode] = new Set();
    sseClients[roomCode].add(response);

    const show = roomGraphState[roomCode] ?? false;
    response.write(`event: showGraphs\ndata: ${JSON.stringify({ show })}\n\n`);

    const keepAlive = setInterval(() => response.write(":\n\n"), 15000);
    response.on("close", () => {
        clearInterval(keepAlive);
        sseClients[roomCode].delete(response);
    });
};

exports.emitShowGraphs = roomCodes => {
    roomCodes.forEach(roomCode => {
        roomGraphState[roomCode] = true;
        const clients = sseClients[roomCode];
        if (!clients) return;
        for (const client of clients) {
            client.write(`event: showGraphs\ndata: ${JSON.stringify({ show: true })}\n\n`);
        }
    });
};
