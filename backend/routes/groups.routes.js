const router = require("express").Router();
const controller = require("../controllers/groups.controller");
const { requireRole } = require("../middleware/auth.middleware");

router.post("/createGroup", requireRole(["ADMIN"]), controller.createGroup);
router.get("/:groupCode", controller.getGroup);
router.get("/", controller.listGroups);

module.exports = router;
