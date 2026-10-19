// ===================================================================
// LINEDLE WAVE-PANEL STORE  (update 92)
// The host's look for LINEDLE's wave panel (pillars, guide lines, A-Z letters on the left, waves, dots):
// colors, thickness, show / hide switches, sizes. One shared look for every connected screen of the game.
// Written to data/linedle-wave.json so it survives a restart. A read-only disk is fine: the look still works for this run.
// A color of "" means AUTO (follow the platform's Color shades picker).
// ===================================================================

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, "../../data");
const DATA_FILE = path.join(DATA_DIR, "linedle-wave.json");

const bool = (d) => ({ t: "bool", d });
const num = (d, min, max) => ({ t: "num", d, min, max });
const color = (d) => ({ t: "color", d });
const enm = (d, v) => ({ t: "enum", d, v });

export const SPEC = {
  // panel
  bgMode: enm("gradient", ["gradient", "solid", "transparent"]),
  bg1: color("#1d3566"),
  bg2: color("#0b1530"),
  borderShow: bool(true),
  borderColor: color("#0b1530"),
  radius: num(14, 0, 40),
  maxHeight: num(340, 160, 700),
  // pillars
  pillarsShow: bool(true),
  pillarColor: color("#ffffff"),
  pillarOpacity: num(9, 0, 80),
  pillarWidth: num(100, 30, 260),
  pillarOutline: bool(true),
  labelsShow: bool(true),
  labelColor: color("#ffffff"),
  labelSize: num(15, 8, 32),
  // horizontal guide lines
  guideShow: bool(true),
  guideColor: color("#ffffff"),
  guideOpacity: num(13, 2, 100),
  guideThickness: num(1, 0.5, 5),
  guideStyle: enm("dotted", ["dotted", "dashed", "solid"]),
  guideEvery: enm("5", ["1", "2", "5", "ends"]),
  // letters on the left side
  scaleShow: bool(true),
  scaleColor: color("#ffffff"),
  scaleOpacity: num(72, 10, 100),
  scaleSize: num(13, 8, 30),
  scaleEvery: enm("5", ["1", "2", "5", "ends"]),
  // light-blue wave (the secret word)
  blueColor: color(""),
  blueThickness: num(6, 1, 18),
  blueGlow: bool(true),
  targetDotsShow: bool(true),
  targetDotSize: num(7, 3, 16),
  // white wave (the guess)
  whiteColor: color(""),
  whiteThickness: num(3.5, 1, 14),
  whiteGlow: bool(true),
  guessDotsShow: bool(true),
  guessDotSize: num(9, 4, 18),
  dotLettersShow: bool(true),
  trailShow: bool(true),
  trailCount: num(4, 0, 4),
  trailThickness: num(3, 1, 8),
  trailOpacity: num(20, 5, 80)
};

function defaults() {
  const o = {};
  for (const k in SPEC) o[k] = SPEC[k].d;
  return o;
}

function clean(key, value) {
  const sp = SPEC[key];
  if (!sp) return undefined;
  if (sp.t === "bool") return typeof value === "boolean" ? value : undefined;
  if (sp.t === "num") {
    const n = Number(value);
    if (!Number.isFinite(n)) return undefined;
    return Math.min(sp.max, Math.max(sp.min, n));
  }
  if (sp.t === "enum") return sp.v.includes(String(value)) ? String(value) : undefined;
  if (sp.t === "color") {
    if (value === "") return "";
    return /^#[0-9a-fA-F]{6}$/.test(String(value)) ? String(value).toLowerCase() : undefined;
  }
  return undefined;
}

const style = defaults();
let saveTimer = null;

try {
  const raw = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  if (raw && typeof raw === "object") {
    for (const k in raw) {
      const v = clean(k, raw[k]);
      if (v !== undefined) style[k] = v;
    }
  }
} catch (e) {
  // first run / unreadable file: defaults stay
}

function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true });
      fs.writeFileSync(DATA_FILE, JSON.stringify(style, null, 2));
    } catch (e) {
      // read-only disk - ignore
    }
  }, 300);
  if (saveTimer.unref) saveTimer.unref();
}

export function getWaveStyle() {
  return { ...style };
}

// patch = { key: value, ... }; unknown keys / invalid values are ignored. Returns the full look.
export function patchWaveStyle(patch) {
  if (patch && typeof patch === "object") {
    for (const k in patch) {
      const v = clean(k, patch[k]);
      if (v !== undefined) style[k] = v;
    }
    scheduleSave();
  }
  return getWaveStyle();
}

export function resetWaveStyle() {
  Object.assign(style, defaults());
  scheduleSave();
  return getWaveStyle();
}
