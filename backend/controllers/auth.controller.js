const authService = require("../services/auth.service");

exports.register = async (request, response) => {
    try {
        const result = await authService.register(request.body);
        response.status(201).json(result);
    }
    catch (error) {
        response.status(500).json({ error: "Server error" });
    }
};

exports.login = async (request, response) => {
    try {
        const result = await authService.login(request.body);
        response.status(201).json(result);
    }
    catch {
        response.status(401).json({ error: "Invalid credentials" });
    }
};
