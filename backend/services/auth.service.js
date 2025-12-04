const prisma = require("../prisma");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const SECRET = process.env.JWT_SECRET;

exports.register = async ({ username, password }) => {
    await prisma.user.create({
        data: {
            username,
            password: await bcrypt.hash(password, 10),
            role: "UNASSIGNED"
        }
    });
    return { success: true };
};

exports.login = async ({ username, password }) => {
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) throw new Error("Invalid credentials");

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) throw new Error("Invalid credentials");

    const token = jwt.sign({ id: user.id, role: user.role }, SECRET, { expiresIn: "8h" });
    return { token, role: user.role };
};
