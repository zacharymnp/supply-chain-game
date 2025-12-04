const jwt = require("jsonwebtoken");
const SECRET = process.env.JWT_SECRET;

function requireRole(roles) {
    return (request, response, next) => {
        const header = request.headers.authorization;
        if (!header) return response.status(401).json({ error: "Missing token" });
        const token = header.split(" ")[1];
        try {
            const decoded = jwt.verify(token, SECRET);
            const userRole = decoded.role;
            if (!roles.includes(userRole)) {
                return response.status(403).json({ error: "Forbidden" });
            }
            request.user = decoded;
            next();
        }
        catch {
            response.status(401).json({ error: "Invalid token" });
        }
    };
}

module.exports = { requireRole };
