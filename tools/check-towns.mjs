// check-towns.mjs - `npm run check:towns`
// Checks the TOWNDLE place list: counts per state / tier, districts without a seat or without neighbours, unknown district names in the
// border list, places far away from their district seat (usually a typo in a coordinate) and the places that must be typed with their state.
import { TOWNS, DISTRICTS, DISTRICT_NEIGHBOURS, ADJACENCY_PROBLEMS, STATE_LIST, LOAD_REPORT, BULK_REPORT, distanceKm } from "../server/towndle/towns.js";

console.log(`TOWNDLE place list: ${TOWNS.length} places, ${DISTRICTS.size} districts (${LOAD_REPORT.builtIn} with a checked position, ${LOAD_REPORT.bulk} bulk places with an approximate position, ${LOAD_REPORT.extra} from data/towns-extra.txt, ${LOAD_REPORT.geonames} from GeoNames)`);
const sk = BULK_REPORT.skipped;
console.log(`Bulk list: ${BULK_REPORT.listed} names listed -> ${BULK_REPORT.added} added; skipped ${sk.alreadyKnown} already known, ${sk.samePlaceOtherSpelling} same place / other spelling, ${sk.nameTaken} name already taken, ${sk.unusable} unusable (under 4 letters or with a digit)`);
for (const p of BULK_REPORT.problems) console.log("BULK LIST:", p);
for (const f of LOAD_REPORT.files) console.log("  file:", f);
console.log("\nPer state (places / districts):");
for (const s of STATE_LIST) {
  const places = TOWNS.filter((t) => t.state === s.code).length;
  const dists = [...DISTRICTS.values()].filter((d) => d.state === s.code).length;
  console.log(`  ${s.name.padEnd(22)} ${String(places).padStart(5)} / ${dists}`);
}
const tiers = { 1: 0, 2: 0, 3: 0 };
TOWNS.forEach((t) => tiers[t.tier]++);
console.log(`\nTiers: ${tiers[1]} famous, ${tiers[2]} well-known, ${tiers[3]} lesser-known / rare`);
console.log(`Approximate positions (bulk): ${TOWNS.filter((t) => t.approx).length} places - guessable, never the secret place`);
let problems = BULK_REPORT.problems.length;
for (const p of ADJACENCY_PROBLEMS) { console.log("BORDER LIST:", p); problems++; }
for (const [k, d] of DISTRICTS) {
  if (!d.seat) { console.log("NO SEAT:", d.name); problems++; }
  if (DISTRICT_NEIGHBOURS.get(k).size === 0) { console.log("NO NEIGHBOUR DISTRICT:", d.name); problems++; }
  const lim = d.state === "SB" || d.state === "SK" ? 150 : 45;
  for (const p of d.places) {
    if (p.approx) continue; // bulk places sit near a real place of the district by design
    const km = d.seat ? distanceKm(p, d.seat) : 0;
    if (km > lim) console.log(`FAR (${km} km from the seat, check the coordinates?): ${p.name} (${d.name})`);
  }
}
const typed = TOWNS.filter((t) => t.typeAs).map((t) => t.typeAs);
console.log(`\nPlaces that viewers must type with the state (the plain name is an everyday word or taken by a bigger place): ${typed.length}`);
console.log("  " + typed.join(", "));
console.log(problems ? `\n${problems} problem(s) found.` : "\nNo problems found.");
