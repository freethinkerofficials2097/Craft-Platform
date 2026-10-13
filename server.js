// ===================================================================
// PLATFORM ENTRY POINT
// One always-on server hosting seven independent games. Each game keeps
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
//   /twistle/   - TWISTLE Live     (Socket.IO namespace /twistle)
//   /oracle/    - ORACLE           (Socket.IO namespace /oracle)
//   /colorblindle/ - COLORBLINDLE  (Socket.IO namespace /colorblindle)
//   /colordle/ - COLORDLE  (Socket.IO namespace /colordle)
//   /structle/ - STRUCTLE  (Socket.IO namespace /structle)
//   /textle/   - TEXTLE    (Socket.IO namespace /textle)
//   /rangedle/ - RANGEDLE  (Socket.IO namespace /rangedle)
//   /codedle/  - CODEDLE   (Socket.IO namespace /codedle)
//   /shapedle/ - SHAPEDLE  (Socket.IO namespace /shapedle)
//   /forbackle/ - FORBACKLE (Socket.IO namespace /forbackle)
//   /shiftle/  - SHIFTLE   (Socket.IO namespace /shiftle)
//   /wordle/   - WORDLE    (Socket.IO namespace /wordle)
//   /betweendle/ - BETWEENDLE (Socket.IO namespace /betweendle)
//   /comparable/ - COMPARABLE (Socket.IO namespace /comparable)
//   /fixle/ - FIXLE (Socket.IO namespace /fixle)
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
import { mountRangedle } from "./server/rangedle/rangedle-server.js";
import { mountCodedle } from "./server/codedle/codedle-server.js";
import { mountShapedle } from "./server/shapedle/shapedle-server.js";
import { mountForbackle } from "./server/forbackle/forbackle-server.js";
import { mountShiftle } from "./server/shiftle/shiftle-server.js";
import { mountWordle } from "./server/wordle/wordle-server.js";
import { mountBetweendle } from "./server/betweendle/betweendle-server.js";
import { mountComparable } from "./server/comparable/comparable-server.js";
import { mountFixle } from "./server/fixle/fixle-server.js";
import { mountOracle } from "./server/oracle/oracle-server.js";
import { mountColorblindle } from "./server/colorblindle/colorblindle-server.js";
import { mountColordle } from "./server/colordle/colordle-server.js";
import { mountStructle } from "./server/structle/structle-server.js";
import { mountTextle } from "./server/textle/textle-server.js";
import { registerFindle } from "./server/findle/findle-server.cjs";
import { registerCrossdle } from "./server/crossdle/crossdle.js";
import { registerTwistle } from "./server/twistle/twistle.js";
import { Engagement } from "./server/engagement/engagement-hub.js";
import { ColorShadesHub } from "./server/shared/color-shades-hub.js";
import { LegendHub } from "./server/shared/legend-hub.js";
import { serveHostAvatar, hostAvatarStatus } from "./server/shared/host-avatar.js";
import { HostPresence } from "./server/shared/host-presence.js";
import { mountHomeCards } from "./server/shared/home-cards-store.js";
import { mountHomeGroups } from "./server/shared/home-groups-store.js";
import { installTikTokResilience, mountTikTokHealth } from "./server/shared/tiktok-resilience.js";
import { PlatformHub } from "./server/shared/platform-hub.js";
import { mountRecords, Records } from "./server/shared/records-store.js";

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

// The connected host's TikTok profile picture, downloaded and kept by the server (see
// server/shared/host-avatar.js) so every browser loads it from this site and it can never be blocked,
// expire or be an unsupported format. Registered before the static files and every game.
app.get("/host-avatar/:name", serveHostAvatar);
app.get("/host-avatar-status/:name", hostAvatarStatus);

// HOME page (update 30): which TikTok host is connected right now (top-left banner "<HOST> LIVE GAMES" +
// round profile picture) and the host's saved design of the game cards. See server/shared/host-presence.js
// and server/shared/home-cards-store.js. Both use the Socket.IO namespace /home-hub.
HostPresence.init(io, app);
mountHomeCards(app, io, express);
mountHomeGroups(app, io, express);
installTikTokResilience();
mountTikTokHealth(app);

// HOME page (update 38): the platform-wide mode (Offline / Test / Live) and the ONE shared TikTok connection every game
// links to, plus the detailed connection status for the HOME floating window. See server/shared/platform-hub.js.
// Registered before the games so every game's connect() can already be handed the shared connection.
PlatformHub.init(app, express);

// Records archive (update 40): every gift, like, share, follow and milestone saved with time, game, host and audience.
// Page: /records   API: /api/records...   See server/shared/records-store.js.
mountRecords(app, express);
Records.setViewerCountSource(() => PlatformHub.viewers);

// Serves /public/index.html at "/", and transparently serves
// /public/flagle/*, /public/travle/*, /public/crossdle/*, and
// /public/twistle/* at their matching URLs, plus the shared /shared/*
// theme + celebration assets every game links to — one static
// middleware covers the whole platform.
// Records page (update 40/41): express.static only serves a file under its FULL name (/records.html), so the short
// address /records needs its own explicit route - without it the browser showed "Cannot GET /records".
// Registered BEFORE the static middleware and the games; all spellings open the same page.
const sendRecordsPage = (req, res) => res.sendFile(path.join(__dirname, "public", "records.html"));
app.get(["/records", "/records/", "/Records", "/record", "/records.htm"], sendRecordsPage);

app.use(express.static(path.join(__dirname, "public")));

// Platform-wide Gift/Like/Share alerts + diagnostics + host Test Event
// panel — one shared module every game's TikTok connection reports into
// (see server/engagement/engagement-hub.js). Initialized before any game
// registers so Engagement.attach() is ready the instant a game connects.
Engagement.init(io);
Engagement.mountApi(app, express); // update 43: GET /api/engagement/counters, POST /api/engagement/reset

// Platform-wide "Color shades" (update 16): remembers each game's 10-step color choices and keeps
// every screen connected to a game in sync (Socket.IO namespace /shades). See
// server/shared/color-shades-hub.js and public/shared/color-shades.js.
ColorShadesHub.init(io);

// Platform-wide customizable color legends (update 24): remembers how the host arranged each game's
// legend (position, size, font, order, texts, rows/columns) and keeps every screen of that game in
// sync (Socket.IO namespace /legends). See server/shared/legend-hub.js and public/shared/legend.js.
LegendHub.init(io);

registerFlagle(io);
registerTravle(io);
registerFindle(app, io);
await registerCrossdle(app, io);

// TWISTLE shares BLINDLE's word bank + 370,000+ word dictionary (see
// server/twistle/twistle.js) — the dictionary module only ever fetches
// once no matter which of the two games loads first, so registering
// TWISTLE here (before BLINDLE mounts, below) just means TWISTLE is the
// one that kicks the fetch off; BLINDLE then reuses the same result.
await registerTwistle(app, io);

// Blindle ships as a self-mounting module: it serves its own static
// folder and opens its own WebSocketServer (bound to the shared
// httpServer, on its own /blindle-ws path) rather than using Socket.IO.
// Awaited so the real ~370,000-word dictionary is loaded before the
// server starts accepting connections.
await mountBlindle(app, server, { mountPath: "/blindle", wsPath: "/blindle-ws" });

// ORACLE is BLINDLE's sibling (shuffled, uncolored clue columns). It reuses
// BLINDLE's word bank + dictionary (already loaded above - the dictionary only
// ever loads once) and runs on its own Socket.IO namespace /oracle, so it never
// touches BLINDLE's WebSocket path.
await mountOracle(app, io, { mountPath: "/oracle" });

// COLORBLINDLE is BLINDLE's sibling too (4-color shuffled keyboard + color counts,
// green/gray tile feedback). Same word bank + dictionary reuse, own Socket.IO
// namespace /colorblindle.
await mountColorblindle(app, io, { mountPath: "/colorblindle" });

// COLORDLE is COLORBLINDLE's sibling: same shuffled 4-color keyboard and green/gray
// feedback, but instead of color COUNTS the board shows a row of empty colored boxes
// (one per hidden letter) that chat must match against the keyboard colors.
// Own Socket.IO namespace /colordle.
await mountColordle(app, io, { mountPath: "/colordle" });

// STRUCTLE is a BLINDLE sibling too: the clue is two numbers per guess (difference in
// total straight lines, difference in total curves); the round is won when both are 0.
// No keyboard / manual coloring. Own Socket.IO namespace /structle.
await mountStructle(app, io, { mountPath: "/structle" });

// TEXTLE is an ARRANG-O-style BLINDLE sibling: each guess is cut into green / yellow / gray
// SEGMENTS (green segments at the edges get rounded ends) and the keyboard colors itself.
// Hidden words are 4-15 letters by default (host can go 4-20). Reuses BLINDLE's dictionary
// (loaded once) and has its own Socket.IO namespace /textle.
await mountTextle(app, io, { mountPath: "/textle" });

// RANGEDLE is a BLINDLE copy with a different clue: every letter of a guess is colored by how far
// it is along the alphabet from the hidden letter (red 1-5, orange 6-10, yellow 11-15, blue 16-20,
// purple 21-25, green = correct). Numbered keyboard + legend, keys turn green by themselves.
// Like ORACLE it runs on its own Socket.IO namespace /rangedle (so it can never collide with
// BLINDLE's WebSocket path) and reuses BLINDLE's word bank + dictionary (loaded once).
await mountRangedle(app, io, { mountPath: "/rangedle" });

// CODEDLE is a BLINDLE copy built on the SEQUENC-O idea: the board opens with a row of number-code
// digits (each letter's place if the hidden word's letters were sorted A-Z) and every guess letter is
// colored green / yellow / blue / pink / gray. The keyboard colors itself. Scoring: 1 point per guess
// on the board, 5 for solving the round. Own Socket.IO namespace /codedle; reuses BLINDLE's word bank
// + dictionary (loaded once).
await mountCodedle(app, io, { mountPath: "/codedle" });

// SHAPEDLE is a BLINDLE copy built on the SHAPE-O idea: the board opens with a row of cute symbols (one
// per letter of the hidden word; the same letter repeats the same symbol) and every guess letter is
// colored green / yellow / gray. The keyboard colors itself. Scoring: 1 point per guess on the board,
// 5 for solving the round. The host picks the symbol style. Own Socket.IO namespace /shapedle; reuses
// BLINDLE's word bank + dictionary (loaded once).
await mountShapedle(app, io, { mountPath: "/shapedle" });

// FORBACKLE is a BLINDLE copy built on the BETWEEN-O idea: every letter of a guess is colored green (correct),
// purple (go FORWARD - the hidden letter comes later in the alphabet) or pink (go BACKWARD - it comes earlier), and
// neighbouring tiles of one color form a segment. The keyboard colors itself and a legend explains the colors.
// Scoring: 1 point per guess on the board, 5 for solving the round. Own Socket.IO namespace /forbackle; reuses
// BLINDLE's word bank + dictionary (loaded once).
await mountForbackle(app, io, { mountPath: "/forbackle" });

// SHIFTLE is a BLINDLE copy built on the SHUFFL-O idea: every letter of a guess is colored white, pink or blue, and what the
// three colors MEAN (correct spot / wrong spot / not in the word) is shuffled again at the start of every round. The keyboard
// colors itself with the same colors and a legend explains the current round's meanings (host can hide them). Scoring: 1 point
// per guess on the board, 5 for solving the round. Own Socket.IO namespace /shiftle; reuses BLINDLE's word bank + dictionary
// (loaded once).
await mountShiftle(app, io, { mountPath: "/shiftle" });

// WORDLE is a BLINDLE copy with the classic Word-O clue colors: every letter of a guess turns green (right spot), yellow
// (wrong spot) or grey (not in the word). The keyboard colors itself with the same colors and a legend sits under the
// floating message window, above the guess board. Scoring: 1 point per guess on the board, 5 for solving the round.
// Own Socket.IO namespace /wordle; reuses BLINDLE's word bank + dictionary (loaded once).
await mountWordle(app, io, { mountPath: "/wordle" });

// BETWEENDLE is a BLINDLE copy built on the LIST-O idea: the secret word hides in one big alphabetical word list and every
// guess shows its DISTANCE from the secret (distance 120 = 119 words between). A guess before the secret becomes the new
// lower bound, a guess after it the new upper bound; distance 0 = found. A legend above the board explains every part.
// Scoring: 1 point for the guess that finds the secret word. Own Socket.IO namespace /betweendle; reuses BLINDLE's word bank
// + dictionary (loaded once).
await mountBetweendle(app, io, { mountPath: "/betweendle" });

// COMPARABLE is a BLINDLE copy built on the COMPAR-O idea: the board opens with a row of round tiles (blue = consonant,
// orange = vowel) with comparison signs between them and arrows inside the blue ones; every guess must match that symbol row
// and its letters turn green (right letter, right spot) or grey (incorrect). The keyboard colors itself with the same colors
// and a legend explains the symbols and colors. Scoring: 1 point per guess on the board, 5 for solving the round.
// Own Socket.IO namespace /comparable; reuses BLINDLE's word bank + dictionary (loaded once).
await mountComparable(app, io, { mountPath: "/comparable" });

// FIXLE is a BLINDLE copy built on the EDGE-O idea: every guess is scored with MATCHING PREFIX + MATCHING SUFFIX against the
// secret word (letters that match from the start + letters that match from the end). The board lists the guesses from the
// highest score to the lowest and repeats the newest guess in a darker top row. A score of twice the word length means the exact
// word was found and the round is won. A legend above the board explains the score and every part of the screen.
// Scoring: the guess that finds the secret word wins exactly that word's score (2 x its length). Own Socket.IO namespace /fixle;
// reuses BLINDLE's word bank + dictionary (loaded once).
await mountFixle(app, io, { mountPath: "/fixle" });

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Game platform running on port ${PORT}`);
});

