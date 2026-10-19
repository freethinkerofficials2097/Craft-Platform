// ===================================================================
// WORD LENGTH PANEL HUB  (update 90)
// One tiny, game-agnostic Socket.IO namespace (/lenpanel) that remembers, for EVERY word game,
// how the host set up the "Word length panel" (shown / hidden, texts, rows, size, colors ...)
// and keeps every screen connected to the same game in sync - exactly like Color shades and Legends.
//
// What is allowed (types, ranges, defaults) lives in public/shared/length-panel-schema.js, which the
// browser uses too, so both sides always agree. Every value is validated here again: a broken or
// hostile message can never store anything outside the allowed ranges.
//
// Saved to data/length-panel.json so the choices survive a restart (a read-only disk is fine: the
// choices still work until the next restart). BETWEENDLE used to keep its own length-panel settings
// (update 85-88, in data/betweendle-settings.json); they are imported once, the first time.
// ===================================================================

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// The schema file is a plain browser script (this project is "type": "module", so require() would treat it as ES module code):
// read it and run it as a CommonJS-style function instead. One file, two users: the browser and this hub.
const Schema = (() => {
  const mod = { exports: {} };
  new Function("module", "exports", fs.readFileSync(path.resolve(__dirname, "../../public/shared/length-panel-schema.js"), "utf8"))(mod, mod.exports);
  return mod.exports;
})();
const DATA_DIR = path.resolve(__dirname, "../../data");
const DATA_FILE = path.join(DATA_DIR, "length-panel.json");
const OLD_BETWEENDLE_FILE = path.join(DATA_DIR, "betweendle-settings.json");

const ID_RE = /^[a-z0-9_-]{1,32}$/;
const MAX_GAMES = 60;
// every game that has a secret word (used by "apply this look to every game")
export const WORD_GAMES = ["wordle", "blindle", "textle", "colordle", "colorblindle", "codedle", "fixle", "forbackle", "minedle", "linedle",
  "oracle", "rangedle", "shapedle", "shiftle", "structle", "comparable", "betweendle", "twistle"];

const store = new Map();   // gameId -> complete, valid settings object
let io = null;
let saveTimer = null;

function load() {
  try {
    const raw = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
    for (const [game, cfg] of Object.entries(raw || {})) {
      if (ID_RE.test(game) && cfg && typeof cfg === "object" && store.size < MAX_GAMES) store.set(game, Schema.normalize(cfg));
    }
  } catch (e) {
    // first run / unreadable file: every game starts with the defaults
  }
  // one-time import of BETWEENDLE's old private settings
  if (!store.has("betweendle")) {
    try {
      const old = JSON.parse(fs.readFileSync(OLD_BETWEENDLE_FILE, "utf8")).card || {};
      const map = { lengthInfo: "show", lengthTitle: "title", lengthFixedText: "fixedText", lengthRandomText: "randomText", lengthRows: "rows",
        lengthSize: "size", lengthAlign: "align", lengthPanel: "box", lengthBg: "bg", lengthBorder: "border", lengthTextColor: "ink",
        lengthRadius: "radius", lengthBorderWidth: "bw" };
      const patch = {};
      for (const [from, to] of Object.entries(map)) if (old[from] !== undefined) patch[to] = old[from];
      if (Object.keys(patch).length) store.set("betweendle", Schema.normalize(patch));
    } catch (e) {
      // no old file: nothing to import
    }
  }
}

function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true });
      fs.writeFileSync(DATA_FILE, JSON.stringify(Object.fromEntries(store), null, 2));
    } catch (e) {
      // read-only disk - ignore
    }
  }, 400);
  if (saveTimer.unref) saveTimer.unref();
}

const room = (game) => "lenpanel:" + game;

function current(game) {
  return store.get(game) || Schema.defaults();
}

function broadcast(game, by, kind) {
  if (!io) return;
  io.of("/lenpanel").to(room(game)).emit("lp:state", { game, settings: current(game), saved: store.has(game), by: by || "", kind: kind || "update" });
}

export const LengthPanelHub = {
  init(ioServer) {
    io = ioServer;
    load();
    io.of("/lenpanel").on("connection", (socket) => {
      let joined = null;

      socket.on("lp:join", (payload) => {
        const game = payload && payload.game;
        if (typeof game !== "string" || !ID_RE.test(game)) return;
        if (joined) socket.leave(room(joined));
        joined = game;
        socket.join(room(game));
        socket.emit("lp:state", { game, settings: current(game), saved: store.has(game), by: "", kind: "join" });
      });

      // a change of some fields: { game, patch, cid }
      socket.on("lp:set", (payload) => {
        const game = payload && payload.game;
        if (typeof game !== "string" || !ID_RE.test(game)) return;
        if (!store.has(game) && store.size >= MAX_GAMES) return;
        const patch = Schema.cleanPatch(payload && payload.patch);
        if (!Object.keys(patch).length) return;
        store.set(game, Schema.normalize({ ...current(game), ...patch }));
        scheduleSave();
        broadcast(game, payload && typeof payload.cid === "string" ? payload.cid.slice(0, 40) : "", "update");
      });

      // back to the original look (the shown / hidden switch is kept)
      socket.on("lp:reset", (payload) => {
        const game = payload && payload.game;
        if (typeof game !== "string" || !ID_RE.test(game)) return;
        const keepShow = current(game).show;
        store.set(game, Schema.normalize({ show: keepShow }));
        scheduleSave();
        broadcast(game, "", "reset");
      });

      // copy this game's look to every word game (the shown / hidden switch and the position stay per game)
      socket.on("lp:apply_all", (payload) => {
        const game = payload && payload.game;
        if (typeof game !== "string" || !ID_RE.test(game)) return;
        const src = current(game);
        for (const g of WORD_GAMES) {
          if (g === game) continue;
          const keep = current(g);
          store.set(g, Schema.normalize({ ...src, show: keep.show, position: keep.position }));
          broadcast(g, "", "apply_all");
        }
        scheduleSave();
      });
    });
  }
};
