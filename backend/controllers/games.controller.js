const gameService = require("../services/games.service");

exports.getRooms = async (request, response) => {
    response.status(200).json(await gameService.listRooms());
};

exports.getGame = async (request, response) => {
    try {
        response.status(200).json(await gameService.getGame(request.params.roomCode));
    }
    catch {
        response.status(404).json({ error: "Game not found" });
    }
};
