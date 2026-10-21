// ===================================================================
// EXPANDLE COLORS STORE  (update 96)
// EXPANDLE has ONE tile color (no purple / blue / gold per meaning): every letter tile of every row looks the same.
// The host can change the tile color, the letter color, the tile border, the frame of the newest row and the clock.
// One shared look for every connected screen AND for the legend (the legend reads the same CSS variables and writes back here).
// Written to data/expandle-colors.json so it survives a restart (a read-only disk is fine: it still works for this run).
// ===================================================================

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, "../../data");
const DATA_FILE = path.join(DATA_DIR, "expandle-colors.json");

export const DEFAULT_COLORS = {
  tileBg: "#3a7bd5", tileInk: "#ffffff", tileBd: "#2757a3", // every letter tile
  frame: "#3c3c40",                                          // frame around the newest row
  timerBg: "#2e7d32", timerInk: "#ffffff"                    // the round clock and its bar
};
const NUM_DEFAULTS = { borderW: 0, radius: 7, tileScale: 100 };
const NUM_RANGE = { borderW: [0, 6], radius: [0, 20], tileScale: [60, 115] };

const colors = { ...DEFAULT_COLORS, ...NUM_DEFAULTS };
let saveTimer = null;

function clean(key, value) {
  if (key in DEFAULT_COLORS) return /^#[0-9a-fA-F]{6}$/.test(String(value)) ? String(value).toLowerCase() : undefined;
  if (key in NUM_RANGE) {
    const n = Math.round(Number(value));
    return Number.isFinite(n) ? Math.max(NUM_RANGE[key][0], Math.min(NUM_RANGE[key][1], n)) : undefined;
  }
  return undefined;
}
function defaultOf(key) { return key in DEFAULT_COLORS ? DEFAULT_COLORS[key] : NUM_DEFAULTS[key]; }

try {
  const raw = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  if (raw && typeof raw === "object") {
    for (const k of Object.keys(colors)) {
      const v = clean(k, raw[k]);
      if (v !== undefined) colors[k] = v;
    }
  }
} catch (e) { /* first run: standard look */ }

function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true });
      fs.writeFileSync(DATA_FILE, JSON.stringify(colors, null, 2));
    } catch (e) { /* read-only disk - ignore */ }
  }, 300);
  if (saveTimer.unref) saveTimer.unref();
}

export function getColors() { return { ...colors }; }

export function patchColors(patch) {
  if (patch && typeof patch === "object") {
    for (const k of Object.keys(patch)) {
      if (!(k in colors)) continue;
      if (patch[k] === null) { colors[k] = defaultOf(k); continue; }
      const v = clean(k, patch[k]);
      if (v !== undefined) colors[k] = v;
    }
    scheduleSave();
  }
  return getColors();
}

export function resetColors() {
  Object.assign(colors, DEFAULT_COLORS, NUM_DEFAULTS);
  scheduleSave();
  return getColors();
}
