const orderService = require("../services/orders.service");

exports.getOrderStatus = async (request, response) => {
    try {
        const status = await orderService.getOrderStatus(request.query.roomCode);
        if (!status) return response.status(404).json({ error: "Game not found" });
        response.status(200).json({ success: true, status });
    }
    catch (error) {
        console.error(error);
        response.status(500).json({ error: "Server error" });
    }
};

exports.getAllOrders = async (request, response) => {
    try {
        const orders = await orderService.getAllOrders(request.query.roomCode);
        if (!orders) return response.status(404).json({ error: "Game not found" });
        response.status(200).json({ success: true, orders });
    }
    catch (error) {
        console.error(error);
        response.status(500).json({ error: "Server error" });
    }
};

exports.getOutgoingOrder = async (request, response) => {
    try {
        const amount = await orderService.getOutgoingOrder(request.query.roomCode, request.query.role);
        if (amount == null) return response.status(404).json({ error: "Game not found" });
        response.status(200).json({ success: true, amount: amount });
    }
    catch (error) {
        console.error(error);
        response.status(500).json({ error: "Server error" });
    }
};

exports.submitOrder = async (request, response) => {
    const { roomCode, role, amount, week } = request.body;
    try {
        const ok = await orderService.submitOrder(roomCode, role, amount, week);
        if (!ok) return response.status(404).json({ error: "Game not found" });
        response.status(201).json({ success: true });
    }
    catch (error) {
        console.error(error);
        response.status(500).json({ error: "Server error" });
    }
};

exports.addCustomerOrder = async (request, response) => {
    const { roomCodes, amount } = request.body;
    try {
        await orderService.addCustomerOrder(roomCodes, amount);
        response.status(201).json({ success: true });
    }
    catch (error) {
        console.error(error);
        response.status(500).json({ error: "Server error" });
    }
};

exports.advanceWeek = async (request, response) => {
    try {
        const week = await orderService.advanceWeek(request.body.groupCode);
        if (!week) return response.status(404).json({ error: "Group not found" });
        response.status(201).json({ success: true, week });
    }
    catch (error) {
        console.error(error);
        if (error.message.includes("not placed")) {
            return response.status(400).json({ error: error.message });
        }
        response.status(500).json({ error: "Server error" });
    }
};
