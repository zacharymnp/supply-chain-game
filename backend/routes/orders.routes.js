const router = require("express").Router();
const controller = require("../controllers/orders.controller");
const { requireRole } = require("../middleware/auth.middleware");

router.get("/orderStatus", requireRole(["ADMIN"]), controller.getOrderStatus);
router.get("/allOrders", controller.getAllOrders);
router.get("/outgoingOrder", controller.getOutgoingOrder);
router.post("/order", controller.submitOrder);
router.post("/customerOrder", requireRole(["ADMIN"]), controller.addCustomerOrder);
router.post("/advanceWeek", requireRole(["ADMIN"]), controller.advanceWeek);

module.exports = router;