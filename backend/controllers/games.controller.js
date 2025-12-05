const gameService = require("../services/games.service");

exports.getRooms = async (request, response) => {
    const rooms = await gameService.listRooms();
    response.status(200).json(rooms);
};

exports.getGame = async (request, response) => {
    try {
        const game = await gameService.getGame(request.params.roomCode);
        response.status(200).json(game);
    }
    catch {
        response.status(404).json({ error: "Game not found" });
    }
};
