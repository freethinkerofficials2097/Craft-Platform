// ===================================================================
// GAME DEFAULTS STORE  (update 114)  -  "Save & Apply as default"
// Remembers, per game, the settings the host last saved as the default, on the server's disk, so they are used again after a restart.
//   data/game-defaults.json   { <gameId>: { settings: {...}, form: {...}, savedAt } }
// settings = what the server-side game uses (difficulty, word length, pause ...), read from the live game.
// form     = the values of the game's own settings controls (used by games whose settings live in the browser: Flagle, Travle).
// A read-only disk is fine: the default still works until the next restart.
// ===================================================================
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FILE = process.env.GAME_DEFAULTS_FILE || path.resolve(__dirname, "../../data/game-defaults.json");
const ID_RE = /^[a-z0-9_-]{1,32}$/;
const store = {}; // id -> { settings, form, savedAt }

try {
  const raw = JSON.parse(fs.readFileSync(FILE, "utf8"));
  if (raw && typeof raw === "object") for (const [id, v] of Object.entries(raw)) if (ID_RE.test(id) && v && typeof v === "object") store[id] = v;
} catch (e) { /* first run */ }

let state = { writable: true, error: "" };
function flush() {
  try {
    fs.mkdirSync(path.dirname(FILE), { recursive: true });
    const tmp = FILE + ".tmp";
    fs.writeFileSync(tmp, JSON.stringify(store, null, 1));
    try { if (fs.existsSync(FILE)) fs.copyFileSync(FILE, FILE + ".bak"); } catch (e) { /* no backup this time */ }
    fs.renameSync(tmp, FILE);
    state = { writable: true, error: "" };
    return true;
  } catch (e) { state = { writable: false, error: String((e && e.message) || e).slice(0, 160) }; return false; }
}

const cleanForm = (f) => {
  const out = {};
  if (!f || typeof f !== "object") return out;
  let n = 0;
  for (const [k, v] of Object.entries(f)) {
    if (n >= 120 || !/^[A-Za-z0-9_.:-]{1,80}$/.test(k)) continue;
    if (typeof v === "string") out[k] = v.slice(0, 200); else if (typeof v === "number" || typeof v === "boolean") out[k] = v; else continue;
    n++;
  }
  return out;
};

export const GameDefaults = {
  get: (id) => store[id] || null,
  all: () => store,
  status: () => ({ ...state, file: FILE }),
  save(id, settings, form) {
    if (!ID_RE.test(String(id))) throw new Error("Unknown game.");
    store[id] = { settings: settings && typeof settings === "object" ? settings : {}, form: cleanForm(form), savedAt: Date.now() };
    return flush();
  },
  clear(id) { delete store[id]; return flush(); }
};
