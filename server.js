// ===================================================================
// PLATFORM ENTRY POINT
// One always-on server hosting five independent games. Each game keeps
// its own files and its own Socket.IO namespace (or WebSocket path, for
// WORD500), so they never share state or event names — this file just
// wires up Express + Socket.IO/HTTP once and lets each game register
// itself.
//
//   /flagle/    - Flagle Live      (Socket.IO namespace /flagle)
//   /travle/    - TRAVLE Live      (Socket.IO namespace /travle)
//   /word500/   - WORD500          (its own WebSocket path /word500-ws)
//   /findle     - Findle Live      (Socket.IO namespace /findle)
//   /crossdle/  - CROSSDLE Live    (Socket.IO namespace /crossdle)
// ===================================================================

import "dotenv/config";
import express from "express";
import http from "http";
import path from "path";
import { fileURLToPath } from "url";
import { Server } from "socket.io";

import { registerFlagle } from "./server/flagle.js";
import { registerTravle } from "./server/travle.js";
import { mountWord500 } from "./server/word500/word500-server.js";
import { registerFindle } from "./server/findle/findle-server.cjs";
import { registerCrossdle } from "./server/crossdle/crossdle.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Flagle/TRAVLE historically read TIKTOK_SIGN_API_KEY, while WORD500/
// Findle/CROSSDLE (ported from separate projects) read EULERSTREAM_API_KEY.
// Both names refer to the exact same EulerStream key, so mirror whichever
// one is set onto the other — the host only ever needs to set ONE
// environment variable on Render and every game picks it up.
if (process.env.EULERSTREAM_API_KEY && !process.env.TIKTOK_SIGN_API_KEY) {
  process.env.TIKTOK_SIGN_API_KEY = process.env.EULERSTREAM_API_KEY;
}
if (process.env.TIKTOK_SIGN_API_KEY && !process.env.EULERSTREAM_API_KEY) {
  process.env.EULERSTREAM_API_KEY = process.env.TIKTOK_SIGN_API_KEY;
}

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Safety net shared by every game on this server: one bad event handler
// or library-internal bug should never take down the whole process (which
// would disconnect every host currently live across every game).
process.on("uncaughtException", (err) => {
  console.error("Uncaught exception (kept server alive):", err);
});
process.on("unhandledRejection", (err) => {
  console.error("Unhandled rejection (kept server alive):", err);
});

// Serves /public/index.html at "/", and transparently serves
// /public/flagle/*, /public/travle/*, and /public/crossdle/* at their
// matching URLs, plus the shared /shared/* theme + celebration assets
// every game links to — one static middleware covers the whole platform.
app.use(express.static(path.join(__dirname, "public")));

registerFlagle(io);
registerTravle(io);
registerFindle(app, io);
await registerCrossdle(app, io);

// WORD500 ships as a self-mounting module: it serves its own static
// folder and opens its own WebSocketServer (bound to the shared
// httpServer, on its own /word500-ws path) rather than using Socket.IO.
mountWord500(app, server, { mountPath: "/word500", wsPath: "/word500-ws" });

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Game platform running on port ${PORT}`);
});
