// ===================================================================
// GAME SETTINGS REGISTRY  (update 113)
// Lets the AFK Autopilot READ the settings each game is using right now (difficulty, word length / range, pause between rounds,
// starter word, regions ...), so the autopilot's "Game settings" can show them, pre-filled, for the host to check and alter.
//
//   registerGameSettings(id, getter, keys?)   called once by every game; getter() returns the game's live settings object
//   readGameSettings(id)                      -> { settings, readOnly } | null
//   readAllGameSettings()                     -> { <gameId>: { settings, readOnly } }
//
// Nothing here changes a game. It only looks. A game that fails to answer is simply left out.
// ===================================================================
import { PRESET_KEYS, sanitizePreset } from "../autopilot/autopilot-config.js";
import { GameDefaults } from "./game-defaults-store.js";

const reg = new Map(); // id -> { get, keys, readOnly }

// opts.readOnly : the AFK Autopilot only SHOWS these settings (it cannot send them)
// opts.restore  : how to put a saved default back into the game at start-up.  "assign" (default for games whose getter returns the live game object)
//                 copies the values onto that object; a function(settings) does it its own way; false = this game does not restore here.
export function registerGameSettings(id, getter, keys, opts = {}) {
  if (typeof id !== "string" || typeof getter !== "function") return;
  const k = Array.isArray(keys) ? keys : PRESET_KEYS[id] || null;
  reg.set(id, { get: getter, keys: k, readOnly: Boolean(opts.readOnly), restore: opts.restore === undefined ? "assign" : opts.restore });
  restoreDefault(id); // update 114: a saved "Save & Apply as default" is put back as soon as the game starts
}

const WORD_ONLY = new Set(["difficulty", "lengthMode", "wordLength", "lengthMin", "lengthMax", "autoContinueDelaySeconds", "starterWord", "allowRepeats", "regions", "startLength", "maxLength", "roundSeconds"]);
// the saved default for a game, cleaned the same way the autopilot cleans its own game settings
function cleanDefault(id, raw) {
  const r = reg.get(id);
  if (PRESET_KEYS[id]) return sanitizePreset(id, raw);
  const out = {}; // Twistle / Crossdle / Findle ... (not driven by the autopilot): keep only the keys this game reports
  for (const key of (r && r.keys) || []) {
    const v = raw && raw[key];
    if (v === undefined || v === null) continue;
    if (typeof v === "number" && Number.isFinite(v)) out[key] = v; else if (typeof v === "string" && v.length < 80) out[key] = v; else if (typeof v === "boolean") out[key] = v;
  }
  return out;
}
export function restoreDefault(id) {
  const r = reg.get(id), d = GameDefaults.get(id);
  if (!r || !d || !d.settings || r.restore === false) return false;
  try {
    const s = cleanDefault(id, d.settings);
    if (!Object.keys(s).length) return false;
    if (typeof r.restore === "function") r.restore(s);
    else { const live = r.get(); if (!live || typeof live !== "object") return false; for (const [k, v] of Object.entries(s)) if (WORD_ONLY.has(k)) live[k] = Array.isArray(v) ? v.slice() : v; }
    return true;
  } catch (e) { return false; }
}
// the host pressed "Save & Apply as default": remember what the game uses right now (server-side values) + the form values the page sent
export function saveDefaultFromLive(id, form) {
  const r = reg.get(id);
  const live = r ? readGameSettings(id) : null;
  const settings = live ? live.settings : {};
  if (!r && !(form && Object.keys(form).length)) throw new Error("This game has no settings to save.");
  return { written: GameDefaults.save(id, settings, form), settings };
}

function clean(raw, keys) {
  const out = {};
  if (!raw || typeof raw !== "object") return out;
  for (const k of keys || Object.keys(raw)) {
    const v = raw[k];
    if (v === undefined || v === null) continue;
    if (typeof v === "number") { if (Number.isFinite(v)) out[k] = v; }
    else if (typeof v === "string") { if (v.length <= 80) out[k] = v; }
    else if (typeof v === "boolean") out[k] = v;
    else if (Array.isArray(v)) { const list = v.filter((x) => typeof x === "string").slice(0, 40); if (list.length) out[k] = list; }
  }
  return out;
}

export function readGameSettings(id) {
  const r = reg.get(id);
  if (!r) return null;
  try { const d = GameDefaults.get(id); return { settings: clean(r.get(), r.keys), readOnly: r.readOnly, defaultSavedAt: d ? d.savedAt || 0 : 0 }; } catch (e) { return null; }
}

export function readAllGameSettings() {
  const out = {};
  for (const id of reg.keys()) { const v = readGameSettings(id); if (v) out[id] = v; }
  return out;
}
