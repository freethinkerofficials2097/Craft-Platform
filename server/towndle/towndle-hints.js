// towndle-hints.js - the TOWNDLE hint types (update 108). Every hint is about a PLACE, not about letters of a word:
//   region : which part of Malaysia, then the state                      (2 steps)
//   name   : how long the name is -> first letter -> last letter -> vowels (4 steps)
//   near   : "about 15 km north-east of <well-known town>" - every step names a different nearby town (up to 4 steps)
//   kind   : city / municipal / district / town (+ is it a district seat), then the district's first letter, then the district (3 steps)
//   rule   : three states the place is NOT in
// "suggest" (Place idea) stays in towndle-server.js because it needs the clues on the board.
// Hints are progressive: asking for the same type again gives the next, stronger step. Returns null when a type has nothing more to give.
import { TOWNS, STATE_LIST, STATE_NAMES, distanceKm, bearingDeg } from "./towns.js";

const REGION = { PL: "north", KD: "north", PG: "north", PK: "north", SL: "central", NS: "central", FT: "central", ML: "south", JH: "south", KN: "east", TR: "east", PH: "east", SB: "borneo", SK: "borneo" };
const REGION_TEXT = {
  north: "Northern Peninsular Malaysia",
  central: "Central Peninsular Malaysia (Klang Valley and around)",
  south: "Southern Peninsular Malaysia",
  east: "East Coast of Peninsular Malaysia",
  borneo: "East Malaysia (Borneo)"
};
export function regionOf(rec) {
  if (rec.state === "FT" && rec.territory === "Labuan") return "borneo";
  return REGION[rec.state] || "central";
}
const stateText = (rec) => (rec.state === "FT" ? rec.territory + " (Federal Territory)" : rec.stateName);
const stage = (hints, type) => hints.filter((h) => h.type === type).length;
const COMPASS = ["north", "north-east", "east", "south-east", "south", "south-west", "west", "north-west"];
const compass = (deg) => COMPASS[Math.round(deg / 45) % 8];

function regionHint(secret, hints) {
  const n = stage(hints, "region");
  if (n === 0) return { type: "region", icon: "🗺️", text: "Region: " + REGION_TEXT[regionOf(secret)] };
  if (n === 1) return { type: "region", icon: "🏛️", text: "State: " + stateText(secret) };
  return null;
}

function nameHint(secret, hints) {
  const n = stage(hints, "name");
  const name = secret.name;
  const letters = name.replace(/[^A-Za-z]/g, "");
  const words = name.split(/[\s-]+/).filter(Boolean).length;
  if (letters.length < 3) return null;
  if (n === 0) return { type: "name", icon: "🔤", text: `Name: ${letters.length} letters in ${words} word${words === 1 ? "" : "s"}` };
  if (n === 1) return { type: "name", icon: "🔤", text: `Starts with “${letters[0].toUpperCase()}”` };
  if (n === 2) return { type: "name", icon: "🔤", text: `Ends with “${letters[letters.length - 1].toUpperCase()}”` };
  if (n === 3) {
    const pat = name.toUpperCase().split("").map((c) => (/[AEIOU]/.test(c) ? c : /[A-Z]/.test(c) ? "_" : c === " " ? "  " : c)).join(" ");
    return { type: "name", icon: "🔤", text: "Vowels: " + pat };
  }
  return null;
}

function nearHint(secret, hints, game) {
  const used = new Set(hints.filter((h) => h.type === "near").map((h) => h.anchor));
  const onBoard = new Set((game.guesses || []).map((g) => g.word));
  const anchors = TOWNS.filter((c) => c.curated && c.tier <= 2 && c.key !== secret.key && !used.has(c.key) && !onBoard.has(c.key))
    .map((c) => ({ c, km: distanceKm(c, secret) }))
    .filter((x) => x.km <= 250)
    .sort((a, b) => a.km - b.km);
  if (!anchors.length || stage(hints, "near") >= 4) return null;
  const { c, km } = anchors[0];
  const dir = compass(bearingDeg(c, secret));
  const dist = km <= 5 ? "less than 5 km" : km <= 20 ? "about " + Math.round(km / 5) * 5 + " km" : "about " + Math.round(km / 10) * 10 + " km";
  const text = km <= 5 ? `Very close to ${c.name} (${dist})` : `${dist[0].toUpperCase() + dist.slice(1)} ${dir} of ${c.name}`;
  return { type: "near", icon: "📍", text, anchor: c.key };
}

function kindHint(secret, hints, districts) {
  const n = stage(hints, "kind");
  const d = districts.get(secret.districtKey);
  if (n === 0) {
    const seat = d && d.seat && d.seat.key === secret.key;
    return { type: "kind", icon: "🏷️", text: `Type: ${secret.typeName}${seat ? " (the main town of its district)" : ""}` };
  }
  if (n === 1) return { type: "kind", icon: "🏷️", text: `Its district starts with “${secret.district[0].toUpperCase()}”` };
  if (n === 2 && secret.district !== secret.name) return { type: "kind", icon: "🏷️", text: `District: ${secret.district}` };
  return null;
}

function ruleHint(secret, hints, game) {
  const gone = new Set();
  for (const g of game.guesses || []) if (g.level === 3 && g.rec) gone.add(g.rec.state); // a grey guess already rules its state out
  for (const h of hints) if (h.type === "rule" && Array.isArray(h.stateCodes)) h.stateCodes.forEach((s) => gone.add(s));
  const pool = STATE_LIST.map((s) => s.code).filter((c) => c !== secret.state && !gone.has(c));
  if (!pool.length) return null;
  const picked = [];
  while (picked.length < 3 && pool.length) picked.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  return { type: "rule", icon: "🚫", text: "Not in: " + picked.map((c) => STATE_NAMES[c]).join(", "), stateCodes: picked };
}

/** One hint of `type` for the secret place, or null when that type has nothing more to give. */
export function buildHint(type, secret, game, districts) {
  if (!secret) return null;
  const hints = game.hints || [];
  switch (type) {
    case "region": return regionHint(secret, hints);
    case "name": return nameHint(secret, hints);
    case "near": return nearHint(secret, hints, game);
    case "kind": return kindHint(secret, hints, districts);
    case "rule": return ruleHint(secret, hints, game);
    default: return null;
  }
}
