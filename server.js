// ===================================================================
// PLATFORM ENTRY POINT
// One always-on server hosting five independent games. Each game keeps
// its own files and its own Socket.IO namespace (or WebSocket path, for
// BLINDLE), so they never share state or event names — this file just
// wires up Express + Socket.IO/HTTP once and lets each game register
// itself.
//
//   /flagle/    - Flagle Live      (Socket.IO namespace /flagle)
//   /travle/    - TRAVLE Live      (Socket.IO namespace /travle)
//   /blindle/   - Blindle          (its own WebSocket path /blindle-ws)
//   /findle     - Findle Live      (Socket.IO namespace /findle)
//   /crossdle/  - CROSSDLE Live    (Socket.IO namespace /crossdle)
//
// IMPORTANT: "./server/env-bridge.js" is imported FIRST, before any
// game module. ES module imports are hoisted and evaluated in the
// order they're listed — several games read their TikTok sign-in key
// from process.env at their own module-load time, so the env-var
// mirroring in env-bridge.js has to run before those modules load, or
// a game imported earlier would still see an empty value for whichever
// env var name it doesn't use directly. (This was previously a real
// bug: the mirroring lived below the game imports in this file, so it
// always ran too late to help.)
// ===================================================================

import "dotenv/config";
import "./server/env-bridge.js";

import express from "express";
import http from "http";
import path from "path";
import { fileURLToPath } from "url";
import { Server } from "socket.io";

import { registerFlagle } from "./server/flagle.js";
import { registerTravle } from "./server/travle.js";
import { mountBlindle } from "./server/blindle/blindle-server.js";
import { registerFindle } from "./server/findle/findle-server.cjs";
import { registerCrossdle } from "./server/crossdle/crossdle.js";
import { Engagement } from "./server/engagement/engagement-hub.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

// Platform-wide Gift/Like/Share alerts + diagnostics + host Test Event
// panel — one shared module every game's TikTok connection reports into
// (see server/engagement/engagement-hub.js). Initialized before any game
// registers so Engagement.attach() is ready the instant a game connects.
Engagement.init(io);

registerFlagle(io);
registerTravle(io);
registerFindle(app, io);
await registerCrossdle(app, io);

// Blindle ships as a self-mounting module: it serves its own static
// folder and opens its own WebSocketServer (bound to the shared
// httpServer, on its own /blindle-ws path) rather than using Socket.IO.
// Awaited so the real ~370,000-word dictionary is loaded before the
// server starts accepting connections.
await mountBlindle(app, server, { mountPath: "/blindle", wsPath: "/blindle-ws" });

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Game platform running on port ${PORT}`);
});
