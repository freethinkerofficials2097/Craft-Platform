// cities.js - the CITYDLE city book: parses cities-data.js, answers "which city did the viewer type?", and does the clue maths
// (clue color level, great-circle distance in km, compass direction).

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { CITY_DATA } from "./cities-data.js";
import { CITY_DATA_MORE } from "./cities-data-more.js";
import { COUNTRY_BY_ISO, isBlockedCommonWord } from "./countries.js";

export const CONTINENT_NAMES = { EU: "Europe", AS: "Asia", AF: "Africa", NA: "North America", SA: "South America", OC: "Oceania" };

// "Sao Paulo" / "São Paulo" / "sao-paulo" / "SaoPaulo" all become "saopaulo"
export function cityKey(text) {
  return String(text || "").toLowerCase().normalize("NFKD").replace(/[^a-z]/g, "");
}

export const CITIES = [];            // { key, name, country, continent, lat, lon, tier }
export const CITY_BY_KEY = new Map(); // key (and every alias key) -> city

// A disambiguating tail written in the data ("Newcastle Australia", "Springfield Missouri", "Brest France") is not part of the
// city's display name: the city is shown as "Newcastle", but "newcastle australia" still finds it.
const REGION_TAILS = ["Scotland", "Wales", "Gozo", "Mississippi", "Missouri", "Oregon", "Washington", "Delaware", "Florida", "Ontario", "BC", "Maine",
  "Massachusetts", "Pennsylvania", "New Hampshire", "Vermont", "Rhode Island", "North Carolina", "South Dakota", "Nebraska", "Arizona", "Kentucky",
  "California", "Colorado", "Maharashtra", "Nova Scotia", "New York", "Wyoming", "Tierra del Fuego", "Saint Vincent", "Selangor", "Iowa", "Texas", "Pakistan"];
function displayNameFor(name, country) {
  const tails = [country, ...REGION_TAILS];
  for (const t of tails) {
    if (name.length > t.length + 2 && name.endsWith(" " + t)) return name.slice(0, name.length - t.length - 1).trim();
  }
  return name;
}

function addCity(city, aliases) {
  const original = city.name;
  const shown = displayNameFor(city.name, city.country);
  if (shown !== original) {
    // the long form always works as a guess; the short form is the display name (and works too if nobody famous owns it)
    const longKey = cityKey(original);
    if (longKey && !CITY_BY_KEY.has(longKey)) {
      city.name = shown;
      city.key = cityKey(shown);
      if (CITY_BY_KEY.has(city.key)) {
        // the plain name belongs to a more famous city: keep this one under its long key only
        city.key = longKey;
      }
      aliases = [...(aliases || []), original];
    }
  }
  if (!city.key || CITY_BY_KEY.has(city.key)) return false; // two cities with the same plain name: the first one wins
  CITIES.push(city);
  CITY_BY_KEY.set(city.key, city);
  // "name + country" always works too (e.g. "portlandunitedstates"), which lets viewers pick the less famous namesake
  const withCountry = cityKey(city.name + " " + city.country);
  if (!CITY_BY_KEY.has(withCountry)) CITY_BY_KEY.set(withCountry, city);
  for (const a of aliases || []) {
    const ak = cityKey(a);
    if (ak && !CITY_BY_KEY.has(ak)) CITY_BY_KEY.set(ak, city);
  }
  return true;
}

// built-in lists: "Country|continent|City lat lon [tier] [=alias,alias]; City ..."  (tier defaults to 3)
function loadBuiltIn(text) {
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const [country, continent, rest] = trimmed.split("|");
    if (!rest || !CONTINENT_NAMES[continent]) continue;
    for (const chunk of rest.split(";")) {
      const [main, aliasPart] = chunk.split("=");
      const m = main.trim().match(/^(.+?)\s+(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)(?:\s+([123]))?$/);
      if (!m) continue;
      addCity({ key: cityKey(m[1]), name: m[1].trim(), country, continent, lat: Number(m[2]), lon: Number(m[3]), tier: Number(m[4] || 3) },
        aliasPart ? aliasPart.split(",") : []);
    }
  }
}
loadBuiltIn(CITY_DATA);
loadBuiltIn(CITY_DATA_MORE);

// ---- optional extra files in the project's data/ folder (the host can make the city book as big as the world) ----------------------
//  1) GeoNames files named cities*.txt (cities500.txt, cities1000.txt, cities5000.txt, cities15000.txt ... from download.geonames.org/export/dump/):
//     tab separated, read as they are. Largest cities first, so a famous city keeps its plain name.
//  2) data/cities-extra.txt : one city per line   Name, Country, Continent(EU/AS/AF/NA/SA/OC), latitude, longitude
//     (lines starting with # are ignored). Great for adding a handful of your own cities.
function continentFor(iso, lon) {
  const c = COUNTRY_BY_ISO[iso];
  if (!c) return null;
  if (iso === "RU" || iso === "KZ") return lon > 60 ? "AS" : "EU";
  return c.continent;
}
export const LOAD_REPORT = { builtIn: CITIES.length, geonames: 0, extra: 0, files: [] };
function loadExternalFiles() {
  let dir;
  try { dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../data"); } catch (e) { return; }
  let names = [];
  try { names = fs.readdirSync(dir); } catch (e) { return; }
  // 1) GeoNames dumps
  const rows = [];
  for (const f of names.filter((n) => /^cities.*\.txt$/i.test(n) && !/^cities-extra/i.test(n))) {
    try {
      const text = fs.readFileSync(path.join(dir, f), "utf8");
      let count = 0;
      for (const line of text.split("\n")) {
        const c = line.split("\t");
        if (c.length < 15) continue;
        const iso = c[8];
        const info = COUNTRY_BY_ISO[iso];
        const lat = Number(c[4]), lon = Number(c[5]);
        if (!info || !Number.isFinite(lat) || !Number.isFinite(lon)) continue;
        rows.push({ name: (c[2] || c[1]).trim(), alt: c[3], iso, lat, lon, pop: Number(c[14]) || 0 });
        count++;
      }
      LOAD_REPORT.files.push(f + " (" + count + " lines)");
    } catch (e) { console.error("[CITYDLE] could not read " + f + ": " + e.message); }
  }
  rows.sort((a, b) => b.pop - a.pop);
  for (const r of rows) {
    const key = cityKey(r.name);
    if (!key || key.length < 3 || isBlockedCommonWord(key)) continue;
    const info = COUNTRY_BY_ISO[r.iso];
    const aliases = String(r.alt || "").split(",").filter((a) => /^[A-Za-z .'-]{4,30}$/.test(a) && !isBlockedCommonWord(cityKey(a))).slice(0, 6);
    const ok = addCity({ key, name: r.name, country: info.name, continent: continentFor(r.iso, r.lon), lat: r.lat, lon: r.lon, tier: r.pop >= 1000000 ? 2 : 3 }, aliases);
    if (ok) LOAD_REPORT.geonames++;
  }
  // 2) the simple extra list
  const extra = names.find((n) => /^cities-extra\.(txt|csv)$/i.test(n));
  if (extra) {
    try {
      for (const line of fs.readFileSync(path.join(dir, extra), "utf8").split("\n")) {
        const t = line.trim();
        if (!t || t.startsWith("#")) continue;
        const p = t.split(",").map((x) => x.trim());
        if (p.length < 5 || !CONTINENT_NAMES[p[2].toUpperCase()]) continue;
        const lat = Number(p[3]), lon = Number(p[4]);
        if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
        if (addCity({ key: cityKey(p[0]), name: p[0], country: p[1], continent: p[2].toUpperCase(), lat, lon, tier: 3 }, [])) LOAD_REPORT.extra++;
      }
      LOAD_REPORT.files.push(extra);
    } catch (e) { console.error("[CITYDLE] could not read " + extra + ": " + e.message); }
  }
}
loadExternalFiles();

export function findCity(text) {
  return CITY_BY_KEY.get(cityKey(text)) || null;
}

// ---- the clue -----------------------------------------------------------------------------------
// level 0 = GREEN  the right city
//       1 = YELLOW right country, wrong city
//       2 = ORANGE right continent, wrong country
//       3 = GREY   wrong continent (and so wrong country)
export function levelOf(guess, secret) {
  if (guess.key === secret.key) return 0;
  if (guess.country === secret.country) return 1;
  if (guess.continent === secret.continent) return 2;
  return 3;
}

const R = 6371; // earth radius, km
const rad = (d) => (d * Math.PI) / 180;
export function distanceKm(a, b) {
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.min(1, Math.sqrt(h))));
}

// compass bearing (degrees, 0 = north, clockwise) from the GUESS toward the SECRET city - "where to guess next"
export function bearingDeg(from, to) {
  const y = Math.sin(rad(to.lon - from.lon)) * Math.cos(rad(to.lat));
  const x = Math.cos(rad(from.lat)) * Math.sin(rad(to.lat)) - Math.sin(rad(from.lat)) * Math.cos(rad(to.lat)) * Math.cos(rad(to.lon - from.lon));
  return Math.round(((Math.atan2(y, x) * 180) / Math.PI + 360) % 360);
}

export function clueOf(guess, secret) {
  return { level: levelOf(guess, secret), km: distanceKm(guess, secret), bearing: guess.key === secret.key ? null : bearingDeg(guess, secret) };
}
