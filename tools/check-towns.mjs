// check-towns.mjs - `npm run check:towns`
// Checks the TOWNDLE place list: counts per state / tier, districts without a seat or without neighbours, unknown district names in the
// border list, places far away from their district seat (usually a typo in a coordinate) and the places that must be typed with their state.
import { TOWNS, DISTRICTS, DISTRICT_NEIGHBOURS, ADJACENCY_PROBLEMS, STATE_LIST, LOAD_REPORT, distanceKm } from "../server/towndle/towns.js";

console.log(`TOWNDLE place list: ${TOWNS.length} places, ${DISTRICTS.size} districts (${LOAD_REPORT.builtIn} built in, ${LOAD_REPORT.extra} from data/towns-extra.txt, ${LOAD_REPORT.geonames} from GeoNames)`);
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
let problems = 0;
for (const p of ADJACENCY_PROBLEMS) { console.log("BORDER LIST:", p); problems++; }
for (const [k, d] of DISTRICTS) {
  if (!d.seat) { console.log("NO SEAT:", d.name); problems++; }
  if (DISTRICT_NEIGHBOURS.get(k).size === 0) { console.log("NO NEIGHBOUR DISTRICT:", d.name); problems++; }
  const lim = d.state === "SB" || d.state === "SK" ? 150 : 45;
  for (const p of d.places) {
    const km = d.seat ? distanceKm(p, d.seat) : 0;
    if (km > lim) console.log(`FAR (${km} km from the seat, check the coordinates?): ${p.name} (${d.name})`);
  }
}
const typed = TOWNS.filter((t) => t.typeAs).map((t) => t.typeAs);
console.log(`\nPlaces that viewers must type with the state (the plain name is an everyday word or taken by a bigger place): ${typed.length}`);
console.log("  " + typed.join(", "));
console.log(problems ? `\n${problems} problem(s) found.` : "\nNo problems found.");
