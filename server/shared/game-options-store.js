// ===================================================================
// GAME OPTIONS STORE  (update 98)
// A tiny shared helper that remembers a few host options per game (CITYDLE: distance unit + continents; EXPANDLE: start-word length,
// maximum length, difficulty) so they survive a server restart, exactly like Strict fit / Starter word do.
// Written to data/game-options.json (a read-only disk is fine: the options still work for this run).
// ===================================================================

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, "../../data");
const DATA_FILE = path.join(DATA_DIR, "game-options.json");
const ID_RE = /^[a-z0-9_-]{1,32}$/;

const store = {}; // gameId -> { optionName: value }
let saveTimer = null;

try {
  const raw = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  if (raw && typeof raw === "object") {
    for (const [g, v] of Object.entries(raw)) if (ID_RE.test(g) && v && typeof v === "object") store[g] = v;
  }
} catch (e) { /* first run */ }

function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true });
      fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2));
    } catch (e) { /* read-only disk - ignore */ }
  }, 300);
  if (saveTimer.unref) saveTimer.unref();
}

export function getOption(gameId, name, fallback) {
  const g = store[gameId];
  return g && name in g ? g[name] : fallback;
}

export function setOption(gameId, name, value) {
  if (!ID_RE.test(gameId)) return value;
  if (!store[gameId]) store[gameId] = {};
  store[gameId][name] = value;
  scheduleSave();
  return value;
}
