const router = require("express").Router();
const controller = require("../controllers/games.controller");

router.get("/rooms", controller.getRooms);
router.get("/:gameCode", controller.getGame);

module.exports = router;
