// review-unknown-towndle.mjs - `npm run review:unknown`
// Shows what chat typed in TOWNDLE that is NOT in the place list (most frequent first), from data/towndle-unknown.json.
// Real places that are missing: add them to data/towns-extra.txt (see data/README-towns.txt). Then delete the line from the json or just ignore it:
// a place that is in the list no longer shows up here.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { resolveGuess } from "../server/towndle/towns.js";
const file = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../data/towndle-unknown.json");
let data = {};
try { data = JSON.parse(fs.readFileSync(file, "utf8")); } catch (e) { console.log("No data/towndle-unknown.json yet - it is written while TOWNDLE runs in Live mode."); process.exit(0); }
const rows = Object.entries(data).filter(([k]) => !resolveGuess(k)).sort((a, b) => b[1] - a[1]).slice(0, 150);
console.log(`Top ${rows.length} unrecognised guesses (times typed):\n`);
for (const [k, v] of rows) console.log(String(v).padStart(5), " ", k);
console.log("\nA real place? Add a line to data/towns-extra.txt:   Name, State, District, 3, latitude, longitude, T");
