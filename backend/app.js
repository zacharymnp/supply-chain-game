const express = require("express");
const path = require("path");
const cors = require("cors");

const app = express();

// -------------------- MIDDLEWARE --------------------
app.use(cors());
app.use(express.json());

// -------------------- ROUTES --------------------
app.use("/api/auth", require("./routes/auth.routes"));
app.use("/api/groups", require("./routes/groups.routes"));
app.use("/api/games", require("./routes/games.routes"));
app.use("/api/orders", require("./routes/orders.routes"));
app.use("/api/sse", require("./routes/sse.routes"));

// -------------------- STATIC FILES --------------------
app.use(express.static(path.join(__dirname, "frontend/dist")));
app.get(/^\/(?!api).*$/, (request, response) => {
    response.sendFile(path.join(__dirname, "frontend/dist/index.html"));
});

module.exports = app;