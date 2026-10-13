// ===================================================================
// HINT CONFIG STORE  (update 58)
// One shared place that defines, for EVERY game, its three hint types and the host's hint settings.
//
//   * Each game has exactly three hint types (see HINT_CATALOG). The host can switch each type on / off,
//     switch hints off completely, limit how many hints a round may use, set a cooldown between hints
//     and (word games, Crossdle) let a hint drop automatically after every N guesses.
//   * The host's choices are written to data/hint-settings.json so they survive a server restart.
//   * Games call checkHint() before giving a hint, and publicHintInfo() to tell the page what to show.
// ===================================================================
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, "../../data");
const DATA_FILE = path.join(DATA_DIR, "hint-settings.json");
const ID_RE = /^[a-z0-9_-]{1,32}$/;

const WORD_TYPES = [
  { id: "suggest", icon: "💡", label: "Word idea", desc: "Suggests a real word that fits every clue so far (never the answer)." },
  { id: "letter", icon: "🔤", label: "Reveal a letter", desc: "Shows one letter of the secret word together with its position." },
  { id: "rule", icon: "🚫", label: "Rule out letters", desc: "Shows three letters that are NOT in the secret word." }
];
export const HINT_CATALOG = {
  word: WORD_TYPES,
  flagle: [
    { id: "continent", icon: "🌍", label: "Continent", desc: "Tells chat which continent the country is in." },
    { id: "initial", icon: "🔤", label: "First letter", desc: "Shows the first letter of the country name." },
    { id: "length", icon: "🔢", label: "Letter count", desc: "Tells chat how many letters the country name has." }
  ],
  travle: [
    { id: "outline", icon: "🗺️", label: "Country shape", desc: "Shows the country's outline on the globe." },
    { id: "letters", icon: "🔤", label: "Name outline", desc: "Shows the country name with only some letters visible." },
    { id: "neighbour", icon: "🧭", label: "Neighbour clue", desc: "Says how many neighbours a valid next country has and names one of them." }
  ],
  findle: [
    { id: "letter", icon: "🔤", label: "Reveal a letter", desc: "Uncovers one more letter of a hidden word." },
    { id: "first", icon: "🅰️", label: "First letters", desc: "Shows the first letter of every word still hidden." },
    { id: "pulse", icon: "✨", label: "Highlight a word", desc: "Makes one hidden word glow on the grid for a moment." }
  ],
  crossdle: [
    { id: "letter", icon: "🔤", label: "Reveal a letter", desc: "Shows one letter of the secret word in its place." },
    { id: "rule", icon: "🚫", label: "Rule out letters", desc: "Shows three letters that are NOT in the secret word." },
    { id: "start", icon: "🅰️", label: "Starts with", desc: "Shows the first and last letter of the secret word." }
  ]
};
const FAMILY = { flagle: "flagle", travle: "travle", findle: "findle", crossdle: "crossdle" };
export function catalogFor(gameId) { return HINT_CATALOG[FAMILY[gameId] || "word"]; }
const AUTO_GAMES = new Set(["blindle", "oracle", "colorblindle", "colordle", "structle", "textle", "rangedle", "codedle", "shapedle", "forbackle", "shiftle", "wordle", "twistle", "crossdle"]);
export function supportsAuto(gameId) { return AUTO_GAMES.has(gameId); }

function defaults(gameId) {
  const types = {};
  for (const t of catalogFor(gameId)) types[t.id] = true;
  return { enabled: true, types, limitPerRound: 0, cooldownSeconds: 0, autoAfterGuesses: gameId === "crossdle" ? 4 : 0 };
}
const clampInt = (v, lo, hi, d) => { const n = Math.round(Number(v)); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : d; };
function normalize(gameId, raw) {
  const d = defaults(gameId);
  const r = raw && typeof raw === "object" ? raw : {};
  const types = {};
  for (const t of catalogFor(gameId)) types[t.id] = r.types && typeof r.types[t.id] === "boolean" ? r.types[t.id] : true;
  return {
    enabled: typeof r.enabled === "boolean" ? r.enabled : d.enabled,
    types,
    limitPerRound: clampInt(r.limitPerRound, 0, 50, 0),
    cooldownSeconds: clampInt(r.cooldownSeconds, 0, 600, 0),
    autoAfterGuesses: supportsAuto(gameId) ? clampInt(r.autoAfterGuesses, 0, 50, gameId === "crossdle" ? 4 : 0) : 0
  };
}

const stored = new Map();
let saveTimer = null;
try {
  const raw = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  for (const [g, v] of Object.entries(raw || {})) if (ID_RE.test(g)) stored.set(g, v);
} catch (e) { /* first run */ }
function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try { fs.mkdirSync(DATA_DIR, { recursive: true }); fs.writeFileSync(DATA_FILE, JSON.stringify(Object.fromEntries(stored), null, 2)); } catch (e) { /* read-only disk */ }
  }, 300);
  if (saveTimer.unref) saveTimer.unref();
}

export function getHintConfig(gameId) { return normalize(gameId, stored.get(gameId)); }
/** Merge a partial change from the host's Settings page. patch = { enabled?, types?: {id: bool}, limitPerRound?, cooldownSeconds?, autoAfterGuesses? } */
export function setHintConfig(gameId, patch) {
  if (!ID_RE.test(String(gameId))) return getHintConfig(gameId);
  const cur = getHintConfig(gameId);
  const p = patch && typeof patch === "object" ? patch : {};
  const merged = { ...cur, ...p, types: { ...cur.types, ...(p.types && typeof p.types === "object" ? p.types : {}) } };
  const clean = normalize(gameId, merged);
  stored.set(gameId, clean);
  scheduleSave();
  return clean;
}

/** What the page needs to draw the hint menu and the Settings section. */
export function publicHintInfo(gameId, used = 0, lastAt = 0, now = Date.now()) {
  const cfg = getHintConfig(gameId);
  const cooldownLeft = cfg.cooldownSeconds > 0 && lastAt ? Math.max(0, Math.ceil((lastAt + cfg.cooldownSeconds * 1000 - now) / 1000)) : 0;
  return {
    ...cfg,
    supportsAuto: supportsAuto(gameId),
    catalog: catalogFor(gameId).map((t) => ({ ...t, enabled: cfg.types[t.id] !== false })),
    used,
    remaining: cfg.limitPerRound > 0 ? Math.max(0, cfg.limitPerRound - used) : null,
    cooldownLeft
  };
}

/** Can a hint of `type` be given now? -> { ok, type, reason } (type falls back to the first enabled type when none is asked for) */
export function checkHint(gameId, type, used = 0, lastAt = 0, now = Date.now(), isAuto = false) {
  const cfg = getHintConfig(gameId);
  const cat = catalogFor(gameId);
  if (!cfg.enabled) return { ok: false, reason: "Hints are switched off in Settings." };
  let t = cat.find((x) => x.id === type);
  if (!t) t = cat.find((x) => cfg.types[x.id]);
  if (!t || !cfg.types[t.id]) return { ok: false, reason: "That hint type is switched off in Settings." };
  if (cfg.limitPerRound > 0 && used >= cfg.limitPerRound) return { ok: false, reason: `Hint limit reached for this round (${cfg.limitPerRound}).` };
  if (!isAuto && cfg.cooldownSeconds > 0 && lastAt && now < lastAt + cfg.cooldownSeconds * 1000) {
    return { ok: false, reason: `Next hint in ${Math.ceil((lastAt + cfg.cooldownSeconds * 1000 - now) / 1000)}s.` };
  }
  return { ok: true, type: t.id };
}

/** For automatic hints: rotate through the enabled types, least-used first. */
export function pickAutoType(gameId, usedTypes = []) {
  const cfg = getHintConfig(gameId);
  const enabled = catalogFor(gameId).filter((t) => cfg.types[t.id]).map((t) => t.id);
  if (!enabled.length) return null;
  enabled.sort((a, b) => usedTypes.filter((x) => x === a).length - usedTypes.filter((x) => x === b).length);
  return enabled[0];
}
