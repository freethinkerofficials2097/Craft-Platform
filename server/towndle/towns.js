// towns.js - the TOWNDLE town book: parses towns-data-*.js, answers "which place did the viewer type?", and does the clue maths
// (clue color level, great-circle distance in km, compass direction).
//
// A "place" is any Malaysian city, municipality, district or town. Every place belongs to ONE district and ONE state
// (the 3 Federal Territories - Kuala Lumpur, Putrajaya, Labuan - count together as the 14th state).
//
// The color clue (level numbers are kept the same as CITYDLE so the page styles keep working):
//   level 0 = GREEN   the right place                                   (round won)
//   level 1 = YELLOW  the right STATE, but the wrong place
//   level 2 = ORANGE  a DIRECT NEIGHBOUR of the right place            (same district, or a district that touches it - in any state)
//   level 3 = GREY    wrong place, not a neighbour and not in the right state
// A place that is both a neighbour AND in the right state shows ORANGE (the more exact clue wins).

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { TOWN_DATA_1 } from "./towns-data-1.js";
import { TOWN_DATA_2 } from "./towns-data-2.js";
import { TOWN_DATA_3 } from "./towns-data-3.js";
import { TOWN_DATA_4 } from "./towns-data-4.js";
import { TOWN_DATA_5 } from "./towns-data-5.js";
import { TOWN_DATA_6 } from "./towns-data-6.js";
import { TOWN_DATA_7 } from "./towns-data-7.js";
import { TOWN_ADJACENCY } from "./towns-adjacency.js";

const R = 6371; // earth radius, km
const rad = (d) => (d * Math.PI) / 180;

// The 14 "states" of the game (13 states + the 3 Federal Territories counted as the 14th).
export const STATE_LIST = [
  { code: "JH", name: "Johor" },
  { code: "KD", name: "Kedah" },
  { code: "KN", name: "Kelantan" },
  { code: "ML", name: "Melaka" },
  { code: "NS", name: "Negeri Sembilan" },
  { code: "PH", name: "Pahang" },
  { code: "PG", name: "Penang" },
  { code: "PK", name: "Perak" },
  { code: "PL", name: "Perlis" },
  { code: "SB", name: "Sabah" },
  { code: "SK", name: "Sarawak" },
  { code: "SL", name: "Selangor" },
  { code: "TR", name: "Terengganu" },
  { code: "FT", name: "Federal Territories" }
];
export const STATE_NAMES = Object.fromEntries(STATE_LIST.map((s) => [s.code, s.name]));
const STATE_CODE_BY_NAME = new Map();
for (const s of STATE_LIST) STATE_CODE_BY_NAME.set(townKey(s.name), s.code);
for (const [alias, code] of [["pulaupinang", "PG"], ["penang", "PG"], ["malacca", "ML"], ["kualalumpur", "FT"], ["putrajaya", "FT"], ["labuan", "FT"],
  ["wilayahpersekutuan", "FT"], ["federalterritory", "FT"], ["federalterritories", "FT"], ["nsembilan", "NS"]]) STATE_CODE_BY_NAME.set(alias, code);

// ---- everyday words (update 108) --------------------------------------------------------------------------------------------
// A chat message that is an ordinary Malay / Indonesian / English word must not be taken for a guess, and a short rare place name that is
// also an everyday word must be typed with its state. The dictionaries ship with the platform (server/shared/lang/generated).
export const COMMON_WORDS = new Set();
(function loadCommonWords() {
  const here = path.dirname(fileURLToPath(import.meta.url));
  for (const f of ["dict-ms.txt", "dict-id.txt"]) {
    try {
      for (const w of fs.readFileSync(path.resolve(here, "../shared/lang/generated", f), "utf8").split(/\r?\n/)) {
        const t = w.trim().toLowerCase();
        if (t.length >= 3 && t.length <= 14 && /^[a-z]+$/.test(t)) COMMON_WORDS.add(t);
      }
    } catch (e) { /* dictionary missing: the place list still works */ }
  }
})();
try {
  const wl = await import("word-list");
  for (const w of fs.readFileSync(wl.default, "utf8").split(/\r?\n/)) if (w.length >= 3 && w.length <= 12) COMMON_WORDS.add(w);
} catch (e) { /* optional */ }

export const TYPE_NAMES = { C: "City", M: "Municipal", D: "District", T: "Town" };

// "Sungai Petani" / "sungai-petani" / "SungaiPetani" all become "sungaipetani"
export function townKey(text) {
  return String(text || "").toLowerCase().normalize("NFKD").replace(/[^a-z]/g, "");
}

export const TOWNS = [];              // { key, name, state, stateName, territory, district, type, typeName, lat, lon, tier, typeAs }
export const TOWN_BY_KEY = new Map(); // key (and every alias key) -> place
export const DISTRICTS = new Map();   // district key -> { name, state, seat (place), places: [] }
export const DISTRICT_NEIGHBOURS = new Map(); // district key -> Set of neighbouring district keys

// Ordinary words that are ALSO place names. A viewer's chat comment of exactly one of these words must never be taken for a guess,
// so such places are typed with their state added instead (for example "gurun kedah", "song sarawak") - the page shows that spelling.
const BLOCKED_PLAIN = new Set(["pantai", "labu", "lega", "pusing", "tawar", "kati", "batu", "kota", "pasir", "kuala", "sungai", "bukit", "teluk", "tanjung",
  "padang", "bandar", "kampung", "simpang", "alor", "parit", "lubok", "ayer", "air", "pulau", "pekan", "song", "bau", "jeli", "tenang", "karak", "rantau",
  "gurun", "kuah", "sura", "mela", "dong", "tras", "jeram", "damai", "keramat", "setapak", "tioman", "perlis", "labuan"].filter((w) => w !== "tioman" && w !== "perlis" && w !== "labuan"));

function stateCodeOf(name) {
  const k = townKey(name);
  return STATE_CODE_BY_NAME.get(k) || null;
}

function territoryLabel(rawState, code) {
  return code === "FT" ? rawState : STATE_NAMES[code];
}

function districtKey(name) {
  return townKey(name);
}

const SAME_NAME = new Map(); // plain name key -> [places]  (duplicate guard)
export const AUTO_BLOCKED = []; // rare single-word places whose plain name is an everyday word -> typed with the state

function isDuplicate(rec) {
  const list = SAME_NAME.get(townKey(rec.name));
  if (!list) return false;
  for (const o of list) {
    if (o.state !== rec.state) continue;
    if (o.districtKey === rec.districtKey) return true;
    const dLat = rad(rec.lat - o.lat), dLon = rad(rec.lon - o.lon);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(o.lat)) * Math.cos(rad(rec.lat)) * Math.sin(dLon / 2) ** 2;
    if (2 * R * Math.asin(Math.min(1, Math.sqrt(h))) <= 12) return true; // same name, same state, a few km apart = the same place
  }
  return false;
}

function addPlace(rec, aliases, opts = {}) {
  const wantedKey = townKey(rec.name);
  if (isDuplicate(rec)) return null;
  const known = TOWN_BY_KEY.get(wantedKey); // the same place already known under another spelling / alias
  if (known && known.state === rec.state && (known.districtKey === rec.districtKey || isDuplicate({ ...rec, name: known.name }))) return null;
  const stateWord = rec.state === "FT" ? rec.territory : rec.stateName; // "Setapak Kuala Lumpur", "Gurun Kedah"
  const stateKey = townKey(rec.name + " " + stateWord);
  let blocked = BLOCKED_PLAIN.has(wantedKey) || wantedKey.length < 3;
  if (!blocked && opts.autoBlock && rec.tier === 3 && /^[A-Za-z]+$/.test(rec.name) && COMMON_WORDS.has(wantedKey)) {
    blocked = true;
    AUTO_BLOCKED.push(rec.name + " (" + rec.stateName + ")");
  }
  let key = blocked ? stateKey : wantedKey;
  if (TOWN_BY_KEY.has(key)) key = stateKey; // two places with the same name: the first one keeps the plain name, the other is "name + state"
  if (!key || key.length < 3 || TOWN_BY_KEY.has(key)) return null;
  rec.key = key;
  if (key !== wantedKey) rec.typeAs = rec.name + " " + stateWord;
  TOWNS.push(rec);
  TOWN_BY_KEY.set(key, rec);
  if (!SAME_NAME.has(wantedKey)) SAME_NAME.set(wantedKey, []);
  SAME_NAME.get(wantedKey).push(rec);
  if (!TOWN_BY_KEY.has(stateKey)) TOWN_BY_KEY.set(stateKey, rec); // "name + state" always works too
  const distName = townKey(rec.name + " " + rec.district);
  if (!TOWN_BY_KEY.has(distName) && rec.name !== rec.district) TOWN_BY_KEY.set(distName, rec);
  for (const a of aliases || []) {
    const ak = townKey(a);
    if (ak.length >= 3 && !BLOCKED_PLAIN.has(ak) && !TOWN_BY_KEY.has(ak)) TOWN_BY_KEY.set(ak, rec);
  }
  return rec;
}

const ITEM_RE = /^(.+?)\s+(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+([123])([CMDT])$/;

function loadBuiltIn(text, opts = {}) {
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("//")) continue;
    const [rawState, district, rest] = trimmed.split("|");
    if (!rest) continue;
    const state = stateCodeOf(rawState);
    if (!state) continue;
    const dk = districtKey(district);
    if (!DISTRICTS.has(dk)) DISTRICTS.set(dk, { name: district.trim(), state, seat: null, places: [] });
    const items = rest.split(";");
    items.forEach((chunk, idx) => {
      const [main, aliasPart] = chunk.split("=");
      const m = main.trim().match(ITEM_RE);
      if (!m) return;
      const rec = {
        name: m[1].trim(), state, stateName: STATE_NAMES[state], territory: territoryLabel(rawState.trim(), state), district: district.trim(),
        districtKey: dk, type: m[5], typeName: TYPE_NAMES[m[5]], lat: Number(m[2]), lon: Number(m[3]), tier: Number(m[4]), curated: true
      };
      const placed = addPlace(rec, aliasPart ? aliasPart.split(",") : [], opts);
      if (placed) {
        DISTRICTS.get(dk).places.push(placed);
        if (!DISTRICTS.get(dk).seat) DISTRICTS.get(dk).seat = placed; // the first place ever added to a district is its seat
      }
    });
  }
}
loadBuiltIn(TOWN_DATA_1);
loadBuiltIn(TOWN_DATA_2);
loadBuiltIn(TOWN_DATA_3);
loadBuiltIn(TOWN_DATA_4);
// update 108: the big expansion (more towns, mukims, townships, islands, hill stations, dive spots ...). Rare single-word names that are also everyday
// words are typed with their state, like the older entries.
loadBuiltIn(TOWN_DATA_5, { autoBlock: true });
loadBuiltIn(TOWN_DATA_6, { autoBlock: true });
loadBuiltIn(TOWN_DATA_7, { autoBlock: true });

// a district can also be typed by its own name when no town carries that name (for example "kualamuda", "hululangat")
for (const [dk, d] of DISTRICTS) {
  if (!TOWN_BY_KEY.has(dk) && d.seat && dk.length >= 3 && !BLOCKED_PLAIN.has(dk)) TOWN_BY_KEY.set(dk, d.seat);
}

// ---- district borders ---------------------------------------------------------------------------------------------------
export const ADJACENCY_PROBLEMS = [];
for (const dk of DISTRICTS.keys()) DISTRICT_NEIGHBOURS.set(dk, new Set());
for (const line of TOWN_ADJACENCY.split("\n")) {
  const t = line.trim();
  if (!t || t.startsWith("//")) continue;
  const [left, right] = t.split(":");
  if (!right) continue;
  const a = districtKey(left);
  if (!DISTRICTS.has(a)) { ADJACENCY_PROBLEMS.push("unknown district: " + left.trim()); continue; }
  for (const n of right.split(",")) {
    const b = districtKey(n);
    if (!b) continue;
    if (!DISTRICTS.has(b)) { ADJACENCY_PROBLEMS.push("unknown district: " + n.trim() + " (in the line of " + left.trim() + ")"); continue; }
    if (a === b) continue;
    DISTRICT_NEIGHBOURS.get(a).add(b);
    DISTRICT_NEIGHBOURS.get(b).add(a); // a border always works both ways
  }
}

// ---- optional extra places in the project's data/ folder -------------------------------------------------------------------
//  1) data/towns-extra.txt : one place per line   Name, State, District (may be empty), Tier 1-3, latitude, longitude [, Type C/M/D/T]
//     State = Johor, Kedah, ... Penang, ... Sarawak, Selangor, Terengganu or Kuala Lumpur / Putrajaya / Labuan.  Lines starting with # are ignored.
//  2) GeoNames: a file named MY.txt (all of Malaysia) or cities500.txt / cities1000.txt ... from download.geonames.org/export/dump/ . Only the populated
//     places (feature class P) of Malaysia are read. Their state and district are copied from the NEAREST place of the built-in list.
export function distanceKm(a, b) {
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.min(1, Math.sqrt(h))));
}
export const LOAD_REPORT = { builtIn: TOWNS.length, geonames: 0, extra: 0, files: [] };

function nearestBuiltIn(lat, lon, builtInCount, stateCode) {
  let best = null, bestD = Infinity;
  const cosLat = Math.cos(rad(lat));
  for (let i = 0; i < builtInCount; i++) {
    const p = TOWNS[i];
    if (stateCode && p.state !== stateCode) continue;
    const dy = p.lat - lat, dx = (p.lon - lon) * cosLat;
    const d = dx * dx + dy * dy;
    if (d < bestD) { bestD = d; best = p; }
  }
  return best ? { place: best, km: Math.sqrt(bestD) * 111 } : null;
}

function loadExternalFiles() {
  let dir;
  try { dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../data"); } catch (e) { return; }
  let names = [];
  try { names = fs.readdirSync(dir); } catch (e) { return; }
  const builtInCount = TOWNS.length;

  // 1) the simple extra list
  const extra = names.find((n) => /^towns-extra\.(txt|csv)$/i.test(n));
  if (extra) {
    try {
      for (const line of fs.readFileSync(path.join(dir, extra), "utf8").split("\n")) {
        const t = line.trim();
        if (!t || t.startsWith("#")) continue;
        const p = t.split(",").map((x) => x.trim());
        if (p.length < 6) continue;
        const state = stateCodeOf(p[1]);
        const lat = Number(p[4]), lon = Number(p[5]);
        if (!state || !Number.isFinite(lat) || !Number.isFinite(lon)) continue;
        let dist = p[2] ? DISTRICTS.get(districtKey(p[2])) : null;
        if (!dist) { const near = nearestBuiltIn(lat, lon, builtInCount, state); dist = near ? DISTRICTS.get(near.place.districtKey) : null; }
        if (!dist) continue;
        const type = /^[CMDT]$/i.test(p[6] || "") ? p[6].toUpperCase() : "T";
        const rec = { name: p[0], state, stateName: STATE_NAMES[state], territory: territoryLabel(p[1], state), district: dist.name, districtKey: districtKey(dist.name),
          type, typeName: TYPE_NAMES[type], lat, lon, tier: Math.min(3, Math.max(1, Math.round(Number(p[3]) || 3))), curated: true };
        const placed = addPlace(rec, []);
        if (placed) { dist.places.push(placed); LOAD_REPORT.extra++; }
      }
      LOAD_REPORT.files.push(extra);
    } catch (e) { console.error("[TOWNDLE] could not read " + extra + ": " + e.message); }
  }

  // 2) GeoNames files (MY.txt, cities*.txt) - Malaysian populated places only
  const rows = [];
  for (const f of names.filter((n) => /^(MY|cities.*)\.txt$/i.test(n) && !/^cities-extra/i.test(n))) {
    try {
      const text = fs.readFileSync(path.join(dir, f), "utf8");
      let count = 0;
      for (const line of text.split("\n")) {
        const c = line.split("\t");
        if (c.length < 15 || c[8] !== "MY" || c[6] !== "P") continue;
        const lat = Number(c[4]), lon = Number(c[5]);
        if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
        rows.push({ name: (c[2] || c[1]).trim(), lat, lon, pop: Number(c[14]) || 0 });
        count++;
      }
      if (count) LOAD_REPORT.files.push(f + " (" + count + " Malaysian places)");
    } catch (e) { console.error("[TOWNDLE] could not read " + f + ": " + e.message); }
  }
  rows.sort((a, b) => b.pop - a.pop);
  for (const r of rows) {
    const key = townKey(r.name);
    if (key.length < 4 || key.length > 40 || TOWN_BY_KEY.has(key) || BLOCKED_PLAIN.has(key)) continue;
    if (COMMON_WORDS.has(key) && !/\s/.test(r.name.trim())) continue; // an everyday word (not a distinct place name): skip the GeoNames one
    const near = nearestBuiltIn(r.lat, r.lon, builtInCount, null);
    if (!near || near.km > 120) continue; // too far from every known place: state unknown, skip
    const base = near.place;
    const rec = { name: r.name, state: base.state, stateName: base.stateName, territory: base.territory, district: base.district, districtKey: base.districtKey,
      type: "T", typeName: TYPE_NAMES.T, lat: r.lat, lon: r.lon, tier: 3, curated: false };
    const placed = addPlace(rec, [], { autoBlock: true });
    if (placed) { DISTRICTS.get(base.districtKey).places.push(placed); LOAD_REPORT.geonames++; }
  }
}
loadExternalFiles();

// ---- spelling variants, short forms, typo tolerance (update 108) -----------------------------------------------------------
// Chat writes places in many ways: "Kota Bharu" / "Kota Baru" / "Kota Baharu", "Telok Intan", "Pulau Redang" / "Redang", "Sg Petani", "KL".
// finalizeAliases() adds every spelling variant and short form that is not already taken by another place; resolveGuess() cleans the
// chat message (short forms, noise words like "malaysia") and looks the place up. A near miss (one wrong / missing / swapped letter of a
// long name that matches exactly ONE place) is accepted as well - set TOWNDLE_FUZZY=0 to switch that off.
const TOKEN_VARIANTS = {
  bharu: ["baharu", "baru"], baharu: ["bharu", "baru"], baru: ["baharu", "bharu"],
  terengganu: ["trengganu"], trengganu: ["terengganu"],
  tanjung: ["tanjong"], tanjong: ["tanjung"], teluk: ["telok"], telok: ["teluk"],
  ayer: ["air"], air: ["ayer"], sri: ["seri"], seri: ["sri"], hulu: ["ulu"], ulu: ["hulu"],
  sungai: ["sungei"], sungei: ["sungai"], pulau: ["pulo"], gombak: ["gombak"], kuantan: ["kuantan"]
};
const PREFIX_WORDS = new Set(["bandar", "pekan", "pulau", "gunung", "tasik", "kampung", "felda"]);
export const SHORT_FORMS = { sg: "sungai", sgi: "sungai", sungei: "sungai", kg: "kampung", kmpg: "kampung", tg: "tanjung", tj: "tanjung", tl: "teluk", bkt: "bukit",
  pkn: "pekan", bdr: "bandar", plau: "pulau", pulo: "pulau", kl: "kuala lumpur", jb: "johor bahru", pj: "petaling jaya", pg: "penang" };

function tokensOf(name) {
  return String(name).toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").split(/[^a-z]+/).filter(Boolean);
}
export const ALIAS_REPORT = { variants: 0, stripped: 0 };
function finalizeAliases() {
  const put = (key, rec, kind) => {
    if (key.length < 3 || key.length > 40 || TOWN_BY_KEY.has(key) || BLOCKED_PLAIN.has(key)) return;
    TOWN_BY_KEY.set(key, rec);
    ALIAS_REPORT[kind]++;
  };
  for (const rec of TOWNS.slice()) {
    if (rec.typeAs) continue; // names that must be typed with their state keep exactly that rule
    const toks = tokensOf(rec.name);
    if (!toks.length) continue;
    // spelling variants (cap the combinations)
    let combos = [[]];
    for (const t of toks) {
      const opts = [t, ...(TOKEN_VARIANTS[t] || []).filter((v) => v !== t)];
      const next = [];
      for (const c of combos) for (const o of opts) next.push([...c, o]);
      combos = next.slice(0, 24);
    }
    for (const c of combos) put(c.join(""), rec, "variants");
    // "Pulau Redang" -> "Redang", "Bandar Baharu" -> ... (only when the rest is not an everyday word)
    if (toks.length >= 2 && PREFIX_WORDS.has(toks[0])) {
      const rest = toks.slice(1).join("");
      const everyday = toks.length === 2 && COMMON_WORDS.has(rest);
      if (rest.length >= 4 && !everyday) put(rest, rec, "stripped");
    }
  }
}

function cleanChat(text) {
  return String(text || "").toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z]+/g, " ").trim();
}
function within1(a, b) { // Damerau distance <= 1
  if (a === b) return true;
  const la = a.length, lb = b.length;
  if (Math.abs(la - lb) > 1) return false;
  let i = 0;
  while (i < la && i < lb && a[i] === b[i]) i++;
  if (la === lb) {
    if (a.slice(i + 1) === b.slice(i + 1)) return true; // one wrong letter
    return a[i] === b[i + 1] && a[i + 1] === b[i] && a.slice(i + 2) === b.slice(i + 2); // two letters swapped
  }
  return la > lb ? a.slice(i + 1) === b.slice(i) : b.slice(i + 1) === a.slice(i); // one letter more / less
}
const FUZZY_ON = process.env.TOWNDLE_FUZZY !== "0";
let fuzzyKeys = null;
function fuzzyLookup(key) {
  if (!FUZZY_ON || key.length < 9) return null;
  if (!fuzzyKeys) fuzzyKeys = [...TOWN_BY_KEY.keys()].filter((k) => k.length >= 8);
  let found = null;
  for (const k of fuzzyKeys) {
    if (Math.abs(k.length - key.length) > 1) continue;
    if (!within1(k, key)) continue;
    const rec = TOWN_BY_KEY.get(k);
    if (found && found !== rec) return null; // two different places fit: not sure enough
    found = rec;
  }
  return found;
}

const LEAD_NOISE = new Set(["bandar", "bandaraya", "pekan", "kampung", "pulau", "di", "ke", "dari", "negeri", "daerah", "mukim", "district", "city", "town", "state", "the"]);
const TRAIL_NOISE = new Set(["malaysia", "city", "town", "bandar", "district", "daerah", "state"]);

/** The place a chat message / typed guess means, or null.  (Replaces the plain "letters only" lookup.) */
export function resolveGuess(text) {
  const raw = String(text || "");
  if (!raw || raw.length > 60) return null;
  const toks = cleanChat(raw).split(" ").filter(Boolean);
  if (!toks.length || toks.length > 6) return null;
  const expanded = toks.flatMap((t) => (SHORT_FORMS[t] && toks.length > 1 ? SHORT_FORMS[t].split(" ") : [t]));
  const look = (arr) => {
    const k = arr.join("");
    return k.length >= 3 && k.length <= 40 ? TOWN_BY_KEY.get(k) || null : null;
  };
  let r = look(toks) || look(expanded);
  if (!r && toks.length === 1 && SHORT_FORMS[toks[0]] && ["kl", "jb", "pj"].includes(toks[0])) r = look(SHORT_FORMS[toks[0]].split(" "));
  if (r) return r;
  const a = expanded.slice();
  while (a.length > 1 && TRAIL_NOISE.has(a[a.length - 1])) { a.pop(); r = look(a); if (r) return r; }
  while (a.length > 1 && LEAD_NOISE.has(a[0])) { a.shift(); r = look(a); if (r) return r; }
  if (toks.every((t) => COMMON_WORDS.has(t))) return null; // an everyday word is never "corrected" into a place
  return fuzzyLookup(a.join(""));
}

/** Up to n places whose name looks like the text - "did you mean ...?" for the host. */
export function suggestPlaces(text, n = 3) {
  const key = cleanChat(text).replace(/ /g, "");
  if (key.length < 3) return [];
  const out = [];
  for (const rec of TOWNS) {
    const k = rec.key;
    if (k.startsWith(key) || (key.length >= 4 && k.includes(key)) || (key.length >= 5 && within1(k.slice(0, key.length), key))) out.push(rec);
    if (out.length >= n) break;
  }
  return out;
}

export function isEverydayWord(text) {
  const toks = cleanChat(text).split(" ").filter(Boolean);
  return toks.length > 0 && toks.every((t) => COMMON_WORDS.has(t));
}

finalizeAliases(); // (after every place - built in, extra file, GeoNames - is known)

export function findTown(text) {
  return TOWN_BY_KEY.get(townKey(text)) || resolveGuess(text);
}

// compass bearing (degrees, 0 = north, clockwise) from the GUESS toward the SECRET place - "where to guess next"
export function bearingDeg(from, to) {
  const y = Math.sin(rad(to.lon - from.lon)) * Math.cos(rad(to.lat));
  const x = Math.cos(rad(from.lat)) * Math.sin(rad(to.lat)) - Math.sin(rad(from.lat)) * Math.cos(rad(to.lat)) * Math.cos(rad(to.lon - from.lon));
  return Math.round(((Math.atan2(y, x) * 180) / Math.PI + 360) % 360);
}

// true when the two places are direct neighbours: the same district, or districts that touch each other
export function areNeighbours(a, b) {
  if (a.districtKey === b.districtKey) return true;
  const set = DISTRICT_NEIGHBOURS.get(a.districtKey);
  return Boolean(set && set.has(b.districtKey));
}

export function levelOf(guess, secret) {
  if (guess.key === secret.key) return 0;
  if (areNeighbours(guess, secret)) return 2; // ORANGE - a direct neighbour (wins over "same state")
  if (guess.state === secret.state) return 1; // YELLOW - right state
  return 3;                                   // GREY
}

export function clueOf(guess, secret) {
  return { level: levelOf(guess, secret), km: distanceKm(guess, secret), bearing: guess.key === secret.key ? null : bearingDeg(guess, secret) };
}
