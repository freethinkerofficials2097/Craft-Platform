// cities.js - the CITYDLE city book: parses cities-data.js, answers "which city did the viewer type?", and does the clue maths
// (clue color level, great-circle distance in km, compass direction).

import { CITY_DATA } from "./cities-data.js";

export const CONTINENT_NAMES = { EU: "Europe", AS: "Asia", AF: "Africa", NA: "North America", SA: "South America", OC: "Oceania" };

// "Sao Paulo" / "São Paulo" / "sao-paulo" / "SaoPaulo" all become "saopaulo"
export function cityKey(text) {
  return String(text || "").toLowerCase().normalize("NFKD").replace(/[^a-z]/g, "");
}

export const CITIES = [];            // { key, name, country, continent, lat, lon, tier }
export const CITY_BY_KEY = new Map(); // key (and every alias key) -> city

for (const line of CITY_DATA.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed) continue;
  const [country, continent, rest] = trimmed.split("|");
  if (!rest || !CONTINENT_NAMES[continent]) continue;
  for (const chunk of rest.split(";")) {
    const [main, aliasPart] = chunk.split("=");
    const m = main.trim().match(/^(.+?)\s+(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+([123])$/);
    if (!m) continue;
    const city = { key: cityKey(m[1]), name: m[1].trim(), country, continent, lat: Number(m[2]), lon: Number(m[3]), tier: Number(m[4]) };
    if (!city.key || CITY_BY_KEY.has(city.key)) continue; // two cities with the same plain name: the first one wins
    CITIES.push(city);
    CITY_BY_KEY.set(city.key, city);
    if (aliasPart) {
      for (const a of aliasPart.split(",")) {
        const ak = cityKey(a);
        if (ak && !CITY_BY_KEY.has(ak)) CITY_BY_KEY.set(ak, city);
      }
    }
  }
}

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
