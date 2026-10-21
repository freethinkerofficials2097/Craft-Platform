// ===================================================================
// CITYDLE COLORS STORE  (update 95, extended in update 96)
// The host's look for every part of CITYDLE: the four city tiles (green / yellow / orange / grey) each with its own tile color,
// text color, country-line color and border color; the direction badge and the distance badge (color, text, border);
// the frame of the newest guess and the ring of the winning row; the column-heading text color; and the shape / text settings
// (border width, corner radius, tile height, space between rows, frame width, city-name size and weight, country size,
// show-country and UPPERCASE switches).
// One shared look for every connected screen AND for the legend (the legend reads the very same CSS variables).
// Written to data/citydle-colors.json so it survives a restart (a read-only disk is fine: it still works for this run).
// ===================================================================

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, "../../data");
const DATA_FILE = path.join(DATA_DIR, "citydle-colors.json");

export const DEFAULT_COLORS = {
  // --- colors (always "#rrggbb")
  greenBg: "#4caf50", greenInk: "#ffffff", greenBd: "#357a38",     // the right city
  yellowBg: "#e3b505", yellowInk: "#1b1b1f", yellowBd: "#a98200",  // right country, wrong city
  orangeBg: "#ee7b30", orangeInk: "#1b1b1f", orangeBd: "#b45514",  // right continent, wrong country
  grayBg: "#8a8a92", grayInk: "#121214", grayBd: "#6a6a72",        // wrong continent
  dirBg: "#3c3c40", dirInk: "#f3f1e6", dirBd: "#2b2b2e",           // the direction arrow badge
  kmBg: "#3c3c40", kmInk: "#f3f1e6", kmBd: "#2b2b2e",              // the distance badge
  frame: "#3c3c40",                                                // the frame around the newest guess
  ring: "#ffd700",                                                 // the ring around the winning row
  // --- colors where "" means "automatic" (country line = the tile's text color, column headings = the page text color)
  greenSub: "", yellowSub: "", orangeSub: "", graySub: "", headInk: "",
  // --- shape and text (numbers)
  borderW: 0,        // px, border around every tile and badge
  radius: 5,         // px, corner radius of tiles and badges
  tileH: 46,         // px, minimum height of a row
  rowGap: 8,         // px, space between rows
  frameW: 3,         // px, thickness of the frame around the newest guess
  cityScale: 100,    // %, size of the city name
  cityWeight: 800,   // 400..900, boldness of the city name
  countryScale: 100, // %, size of the country line
  // --- switches
  showCountry: true, // the small country line under the city name
  upper: true        // CITY NAMES IN CAPITAL LETTERS
};

const HEX_KEYS = new Set(["greenBg","greenInk","greenBd","yellowBg","yellowInk","yellowBd","orangeBg","orangeInk","orangeBd","grayBg","grayInk","grayBd",
  "dirBg","dirInk","dirBd","kmBg","kmInk","kmBd","frame","ring"]);
const AUTO_KEYS = new Set(["greenSub","yellowSub","orangeSub","graySub","headInk"]);
const NUM_RANGE = {
  borderW: [0, 8], radius: [0, 30], tileH: [30, 90], rowGap: [0, 30], frameW: [0, 10],
  cityScale: [60, 160], cityWeight: [400, 900], countryScale: [50, 180]
};
const BOOL_KEYS = new Set(["showCountry", "upper"]);

const colors = { ...DEFAULT_COLORS };
let saveTimer = null;

// returns the cleaned value for one key, or undefined when the value is not acceptable
function clean(key, value) {
  if (HEX_KEYS.has(key)) return /^#[0-9a-fA-F]{6}$/.test(String(value)) ? String(value).toLowerCase() : undefined;
  if (AUTO_KEYS.has(key)) {
    if (value === "") return "";
    return /^#[0-9a-fA-F]{6}$/.test(String(value)) ? String(value).toLowerCase() : undefined;
  }
  if (key in NUM_RANGE) {
    const n = Math.round(Number(value));
    if (!Number.isFinite(n)) return undefined;
    return Math.max(NUM_RANGE[key][0], Math.min(NUM_RANGE[key][1], n));
  }
  if (BOOL_KEYS.has(key)) return typeof value === "boolean" ? value : undefined;
  return undefined;
}

try {
  const raw = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  if (raw && typeof raw === "object") {
    for (const k of Object.keys(DEFAULT_COLORS)) {
      const v = clean(k, raw[k]);
      if (v !== undefined) colors[k] = v;
    }
  }
} catch (e) {
  // first run / unreadable file: the standard look stays
}

function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true });
      fs.writeFileSync(DATA_FILE, JSON.stringify(colors, null, 2));
    } catch (e) {
      // read-only disk - ignore
    }
  }, 300);
  if (saveTimer.unref) saveTimer.unref();
}

export function getColors() {
  return { ...colors };
}

// patch = { greenBg: "#112233", radius: 12, ... } - unknown keys / invalid values are ignored. A value of null resets that one setting.
export function patchColors(patch) {
  if (patch && typeof patch === "object") {
    for (const k of Object.keys(patch)) {
      if (!(k in DEFAULT_COLORS)) continue;
      if (patch[k] === null) { colors[k] = DEFAULT_COLORS[k]; continue; }
      const v = clean(k, patch[k]);
      if (v !== undefined) colors[k] = v;
    }
    scheduleSave();
  }
  return getColors();
}

export function resetColors() {
  Object.assign(colors, DEFAULT_COLORS);
  scheduleSave();
  return getColors();
}
