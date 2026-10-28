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
import { PRESET_KEYS } from "../autopilot/autopilot-config.js";

const reg = new Map(); // id -> { get, keys, readOnly }

export function registerGameSettings(id, getter, keys, opts = {}) {
  if (typeof id !== "string" || typeof getter !== "function") return;
  reg.set(id, { get: getter, keys: Array.isArray(keys) ? keys : PRESET_KEYS[id] || null, readOnly: Boolean(opts.readOnly) });
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
  try { return { settings: clean(r.get(), r.keys), readOnly: r.readOnly }; } catch (e) { return null; }
}

export function readAllGameSettings() {
  const out = {};
  for (const id of reg.keys()) { const v = readGameSettings(id); if (v) out[id] = v; }
  return out;
}
