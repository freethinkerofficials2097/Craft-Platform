// ===================================================================
// BETWEENDLE SETTINGS STORE  (update 66)
// Remembers the host choices that belong to BETWEENDLE:
//
//   * show - is the legend (lower bound / upper bound / distance ... and what they mean) visible above the board? (default ON)
//   * card - the look of the three boxes (lower bound / hidden word / upper bound): the design (update 83) plus colors, font,
//            text size, corners, border, shadow, spacing, labels, distance and animation. Every screen shows the same look.
//
// Written to data/betweendle-settings.json so the choice survives a restart.
// A read-only disk is fine: the choice still works for this run.
// ===================================================================

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, "../../data");
const DATA_FILE = path.join(DATA_DIR, "betweendle-settings.json");

// ---- the three boxes: allowed designs, fonts and the default look ----------------------------------------------------------
export const CARD_STYLES = ["stitched", "flat", "glass", "neon", "ticket", "sticker", "soft"];
export const CARD_FONTS = ["default", "rounded", "grotesk", "mono", "script"];
const COLOR_KEYS = ["cardColor", "secretColor", "textColor", "accentColor"]; // "" = automatic (follows the theme / color shades)
const NUMBER_RANGES = {            // key: [min, max]
  textScale: [70, 140],            // % of the normal word size
  radius: [0, 32],                 // px corner roundness
  borderWidth: [0, 8],             // px
  shadow: [0, 3],                  // 0 none ... 3 deep
  gap: [6, 30]                     // px between the three boxes
};
const BOOL_KEYS = ["labels", "distance", "animate"];
export const DEFAULT_CARD = {
  style: "stitched", font: "default",
  cardColor: "", secretColor: "", textColor: "", accentColor: "",
  textScale: 100, radius: 18, borderWidth: 3, shadow: 2, gap: 14,
  labels: false, distance: true, animate: true
};

const settings = { show: true, card: { ...DEFAULT_CARD } };
let saveTimer = null;

// Takes any object and returns only the valid, clamped fields of it (unknown or broken values are dropped).
function cleanCardPatch(patch) {
  const out = {};
  if (!patch || typeof patch !== "object") return out;
  if (CARD_STYLES.includes(patch.style)) out.style = patch.style;
  if (CARD_FONTS.includes(patch.font)) out.font = patch.font;
  for (const k of COLOR_KEYS) {
    if (typeof patch[k] === "string") {
      const v = patch[k].trim();
      if (v === "") out[k] = "";
      else if (/^#[0-9a-fA-F]{6}$/.test(v)) out[k] = v.toLowerCase();
    }
  }
  for (const k of Object.keys(NUMBER_RANGES)) {
    const n = Number(patch[k]);
    if (patch[k] !== undefined && patch[k] !== null && patch[k] !== "" && Number.isFinite(n)) {
      out[k] = Math.min(NUMBER_RANGES[k][1], Math.max(NUMBER_RANGES[k][0], Math.round(n)));
    }
  }
  for (const k of BOOL_KEYS) if (typeof patch[k] === "boolean") out[k] = patch[k];
  return out;
}

try {
  const raw = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  if (raw && typeof raw.show === "boolean") settings.show = raw.show;
  if (raw && raw.card) settings.card = { ...DEFAULT_CARD, ...cleanCardPatch(raw.card) };
} catch (e) {
  // first run / unreadable file: defaults stay
}

function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true });
      fs.writeFileSync(DATA_FILE, JSON.stringify(settings, null, 2));
    } catch (e) {
      // read-only disk - ignore
    }
  }, 300);
  if (saveTimer.unref) saveTimer.unref();
}

export function getLegendShow() { return settings.show; }

export function setLegendShow(on) {
  settings.show = Boolean(on);
  scheduleSave();
  return settings.show;
}

/** The look of the three boxes (always a complete object: every field present and valid). */
export function getCardDesign() { return { ...settings.card }; }

/** Changes some fields of the look (invalid fields are ignored), remembers it and returns the full look. */
export function setCardDesign(patch) {
  settings.card = { ...settings.card, ...cleanCardPatch(patch) };
  scheduleSave();
  return getCardDesign();
}

/** Back to the original look. */
export function resetCardDesign() {
  settings.card = { ...DEFAULT_CARD };
  scheduleSave();
  return getCardDesign();
}
