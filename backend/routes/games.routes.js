const router = require("express").Router();
const controller = require("../controllers/games.controller");

router.get("/rooms", controller.getRooms);
router.get("/:roomCode", controller.getGame);

module.exports = router;
