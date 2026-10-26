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
import { TOWN_ADJACENCY } from "./towns-adjacency.js";

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

function addPlace(rec, aliases) {
  const wantedKey = townKey(rec.name);
  const stateWord = rec.state === "FT" ? rec.territory : rec.stateName; // "Setapak Kuala Lumpur", "Gurun Kedah"
  const stateKey = townKey(rec.name + " " + stateWord);
  const blocked = BLOCKED_PLAIN.has(wantedKey) || wantedKey.length < 3;
  let key = blocked ? stateKey : wantedKey;
  if (TOWN_BY_KEY.has(key)) key = stateKey; // two places with the same name: the first one keeps the plain name, the other is "name + state"
  if (!key || key.length < 3 || TOWN_BY_KEY.has(key)) return null;
  rec.key = key;
  if (key !== wantedKey) rec.typeAs = rec.name + " " + stateWord;
  TOWNS.push(rec);
  TOWN_BY_KEY.set(key, rec);
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

function loadBuiltIn(text) {
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
        districtKey: dk, type: m[5], typeName: TYPE_NAMES[m[5]], lat: Number(m[2]), lon: Number(m[3]), tier: Number(m[4])
      };
      const placed = addPlace(rec, aliasPart ? aliasPart.split(",") : []);
      if (placed) {
        DISTRICTS.get(dk).places.push(placed);
        if (idx === 0) DISTRICTS.get(dk).seat = placed;
      }
    });
  }
}
loadBuiltIn(TOWN_DATA_1);
loadBuiltIn(TOWN_DATA_2);
loadBuiltIn(TOWN_DATA_3);
loadBuiltIn(TOWN_DATA_4);

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
const R = 6371; // earth radius, km
const rad = (d) => (d * Math.PI) / 180;
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
          type, typeName: TYPE_NAMES[type], lat, lon, tier: Math.min(3, Math.max(1, Math.round(Number(p[3]) || 3))) };
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
    const near = nearestBuiltIn(r.lat, r.lon, builtInCount, null);
    if (!near || near.km > 120) continue; // too far from every known place: state unknown, skip
    const base = near.place;
    const rec = { name: r.name, state: base.state, stateName: base.stateName, territory: base.territory, district: base.district, districtKey: base.districtKey,
      type: "T", typeName: TYPE_NAMES.T, lat: r.lat, lon: r.lon, tier: 3 };
    const placed = addPlace(rec, []);
    if (placed) { DISTRICTS.get(base.districtKey).places.push(placed); LOAD_REPORT.geonames++; }
  }
}
loadExternalFiles();

export function findTown(text) {
  return TOWN_BY_KEY.get(townKey(text)) || null;
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
