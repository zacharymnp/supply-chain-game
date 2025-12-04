const sseService = require("../services/sse.service");

exports.subscribe = (request, response) => {
    sseService.addClient(request.params.roomCode, response);
};

exports.showGraphs = (request, response) => {
    sseService.emitShowGraphs(request.body.roomCodes);
    response.json({ success: true });
};
