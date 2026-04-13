const path = require("path");
const { startServer } = require("./httpServer");

const rootDir = path.resolve(__dirname, "..");
const host = process.env.HOST || "0.0.0.0";
const port = Number.parseInt(process.env.PORT || "5000", 10);

const srv = startServer({ rootDir, host, port });
console.log(`Server running at ${srv.url}`);