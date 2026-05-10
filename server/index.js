const path = require("path");
const { startServer } = require("./httpServer");
const os = require("os");
const rootDir = path.resolve(__dirname, "..");
const host = process.env.HOST || "0.0.0.0";
const port = Number.parseInt(process.env.PORT || "5000", 10);

function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === "IPv4" && !iface.internal) {
        return iface.address;
      }
    }
  }
  return "127.0.0.1";
}

const srv = startServer({ rootDir, host, port });
const localIP = getLocalIP();

console.log(`Server running at http://${localIP}:${port}`);
console.log('You can also access it via http://localhost:${port}.');
console.log('Press Ctrl+C to stop the server.');
console.log('Admin dashboard: http://localhost:5000/admin');
console.log('OBS view: http://localhost:5000/obs');