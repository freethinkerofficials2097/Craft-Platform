// towndle-server.js
// TOWNDLE - a CITYDLE copy that only knows MALAYSIA: the audience guesses a SECRET PLACE (a city, municipality, district or town).
//
// A guess is the name of a real Malaysian place (spaces / hyphens / capitals do not matter: "Sungai Petani", "sungai-petani" and
// "sungaipetani" are the same). Every guess is colored by how close it is to the secret place:
//     GREEN   the right place                                                       (round won)
//     YELLOW  the right STATE, but the wrong place   (14 states = 13 states + the 3 Federal Territories counted as the 14th)
//     ORANGE  a DIRECT NEIGHBOUR of the secret place (same district, or a district that touches it) - but not the place itself
//     GREY    wrong place, not a neighbour and not in the right state
// (a place that is both a neighbour and in the right state is shown ORANGE - the more exact clue.)
// Every guess also gets two more clues: an ARROW (the compass direction from the guessed place toward the secret place) and a DISTANCE in km.
//
// The board lists every guess from the NEAREST to the FARTHEST from the secret place, and the newest guess is repeated in a darker row on
// top (that row turns green when the round is won) - the same system as CITYDLE.
//
// Everything else follows CITYDLE: unlimited guesses for the whole chat, an automatic starter place opens each round, hints, Live / Test /
// Offline modes, host-set secret place, difficulty tiers (Normal / Medium / Hard / Random), win celebration + leaderboards.
// Scoring (Live): the guess that finds the secret place wins 5 points. Nothing else scores.
//
// Transport: its own Socket.IO namespace "/towndle". Mounts at /towndle. The place list is built in (server/towndle/towns-data-*.js)
// and can be grown with data/towns-extra.txt or a GeoNames MY.txt file (see data/README-towns.txt).

import "dotenv/config";
import express from "express";
import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { TikTokLiveConnection, WebcastEvent, SignConfig } from "tiktok-live-connector";
import { explainTikTokError } from "../shared/tiktok-errors.js";
import { TOWNS, TOWN_BY_KEY, DISTRICTS, STATE_LIST, STATE_NAMES, findTown, clueOf, LOAD_REPORT, resolveGuess, suggestPlaces, isEverydayWord } from "./towns.js";
import { Engagement } from "../engagement/engagement-hub.js";
import { resolveHostAvatar, adoptHostAvatar, isHostUser } from "../shared/host-avatar.js";
import * as HC from "../shared/hint-config-store.js"; // update 58: three hint types + host hint settings
import * as TH from "./towndle-hints.js"; // update 108: place hints (region, near, name, type, rule)
import { getStarterWord, setStarterWord } from "../shared/starter-word-store.js";
import { getStrictFit, setStrictFit } from "../shared/strict-fit-store.js"; // update 98: Strict fit
import { getOption, setOption } from "../shared/game-options-store.js"; // update 98: distance unit + continents
import { getColors, patchColors, resetColors } from "../shared/towndle-colors-store.js"; // update 95: the host's colors for every part

import { PlatformHub } from "../shared/platform-hub.js";
function safely(label, fn) {
  return (...args) => {
    try {
      fn(...args);
    } catch (err) {
      console.error(`[SAFETY-NET] Error inside "${label}" handler:`, err);
    }
  };
}

function getByPath(obj, dottedPath) {
  const parts = dottedPath.split(".");
  let current = obj;
  for (const part of parts) {
    if (current && typeof current === "object" && part in current) {
      current = current[part];
    } else {
      return undefined;
    }
  }
  return current;
}

function extractField(raw, candidatePaths, fallback) {
  for (const p of candidatePaths) {
    const value = getByPath(raw, p);
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return value;
    }
  }
  return fallback;
}

const USERNAME_PATHS = [
  "uniqueId", "uniqueid", "user.uniqueId", "user.uniqueid", "user.username",
  "username", "nickname", "user.nickname", "author.uniqueId", "author.nickname", "data.uniqueId"
];
const MESSAGE_PATHS = ["comment", "message", "content", "text", "msg", "data.comment", "data.message"];
const AVATAR_PATHS = [
  "user.profilePictureUrl", "user.avatarThumb.urlList.0", "user.avatarMedium.urlList.0",
  "user.avatarLarger.urlList.0", "user.avatarUrl", "profilePictureUrl", "avatarUrl", "avatarThumb.urlList.0"
];

function extractChatFields(raw) {
  const username = String(extractField(raw, USERNAME_PATHS, "viewer"));
  const text = String(extractField(raw, MESSAGE_PATHS, ""));
  const avatarUrl = extractField(raw, AVATAR_PATHS, null);
  return { username, text, avatarUrl };
}

// Remembers each viewer's most-recently-seen profile picture for the
// life of the server process (not tied to any one round), so the real
// TikTok avatar can be shown next to every guess, win, and leaderboard
// row that mentions them — not just the raw chat message that happened
// to carry it. Host-typed guesses and Test/Offline mode simply have no
// entry here, and the client falls back to a colored initial circle.
const knownAvatars = new Map();

// The profile picture of the HOST of the current TikTok LIVE session (the
// account this game is connected to). Shown on the automatic "starter word"
// row instead of a generic initial circle. Null when not connected to a live
// session (Test / Offline mode) or when TikTok didn't provide one.
let hostAvatarUrl = null;

function normalizeGuess(text) {
  return String(text)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z]/g, "")
    .trim();
}

// ---- THE CITY BOOK -----------------------------------------------------------------------------
// Every city lives in cities.js (CITIES). A viewer's message is turned into letters only, then looked up; the clue maths
// (color level, km, direction) is clueOf(guessCity, secretCity) in cities.js.

// ---- unknown guesses (update 108) ------------------------------------------------------------------------------------
// Chat comments that look like a place name but are not in the list are counted here and saved to data/towndle-unknown.json, so the host can see
// which real places are missing. Review them with   npm run review:unknown   and add the real ones to data/towns-extra.txt.
const UNKNOWN_FILE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../data/towndle-unknown.json");
const unknownGuesses = new Map();
try {
  const saved = JSON.parse(fs.readFileSync(UNKNOWN_FILE, "utf8"));
  for (const [k, v] of Object.entries(saved || {})) if (Number.isFinite(v)) unknownGuesses.set(k, v);
} catch (e) { /* first run */ }
let unknownTimer = null;
function noteUnknownGuess(text) {
  const t = String(text || "").toLowerCase().normalize("NFKD").replace(/[^a-z ]+/g, " ").replace(/\s+/g, " ").trim();
  if (t.length < 4 || t.length > 30 || t.split(" ").length > 3 || isEverydayWord(t)) return;
  unknownGuesses.set(t, (unknownGuesses.get(t) || 0) + 1);
  if (unknownGuesses.size > 4000) {
    const keep = [...unknownGuesses.entries()].sort((a, b) => b[1] - a[1]).slice(0, 2000);
    unknownGuesses.clear();
    for (const [k, v] of keep) unknownGuesses.set(k, v);
  }
  clearTimeout(unknownTimer);
  unknownTimer = setTimeout(() => {
    try { fs.mkdirSync(path.dirname(UNKNOWN_FILE), { recursive: true }); fs.writeFileSync(UNKNOWN_FILE, JSON.stringify(Object.fromEntries(unknownGuesses))); } catch (e) { /* read-only disk */ }
  }, 5000);
  if (unknownTimer.unref) unknownTimer.unref();
}

const GUESS_MIN_LENGTH = 3;
const GUESS_MAX_LENGTH = 40;

const DEFAULT_AUTO_CONTINUE_DELAY = 3;
const DEFAULT_LEADERBOARD_SHOW_SECONDS = 3;
const DEFAULT_REJECTION_TOAST_SECONDS = 4;
// The win celebration always walks through 3 stages (winner, this-round
// leaderboard, all-time leaderboard), each shown for leaderboardShowSeconds.
// Auto-continue must never cut that celebration short, so when a round is
// WON we add this celebration runtime on top of the configured delay (see
// processGuess below). A "give up" / timeout loss has no celebration, so
// it keeps using autoContinueDelaySeconds on its own (see giveUp below).
const CELEBRATION_STAGE_COUNT = 3;

// Points: the guess that finds the secret place wins 5 points. Nothing else scores.
const WIN_POINTS = 5;

// the 14 "states" the SECRET place can come from (13 states + the 3 Federal Territories counted as the 14th)
const ALL_REGIONS = STATE_LIST.map((s) => s.code);
function cleanRegions(list) {
  if (!Array.isArray(list)) return [...ALL_REGIONS];
  const out = ALL_REGIONS.filter((r) => list.includes(r));
  return out.length ? out : [...ALL_REGIONS];
}
// how a place's state is shown: "Selangor", or "Kuala Lumpur (Federal Territory)" for the three Federal Territories
function stateLabel(c) {
  return c.state === "FT" ? c.territory + " (Federal Territory)" : c.stateName;
}
// what a viewer has to type for a place (normally its name; for names that are also everyday words: name + state)
function typeLabel(c) {
  return c.typeAs || c.name;
}
function fmtDist(km) {
  const n = game.distanceUnit === "mi" ? Math.round(km * 0.621371) : km;
  return Number(n || 0).toLocaleString("en-US") + (game.distanceUnit === "mi" ? " mi" : " km");
}

const game = {
  mode: "test",
  status: "idle",
  difficulty: "random",
  secretWord: null, // the secret place's key (letters only, e.g. "saopaulo")
  secretCity: null, // the secret place's record from cities.js
  guesses: [],
  streak: 0,
  roundNumber: 0, // bumps every time a new round starts - the page uses it to clear its manual colors
  hintsUsed: 0,
  hintSuggestions: [],
  hints: [], // update 58: every hint given this round ({type, text, ...})
  hintLastAt: 0,
  hintAutoAt: 0,
  hintNote: null,
  lastRejection: null,
  // true (default): every round opens with one automatic, never-winning starter word.
  // The host can switch it off in Settings (remembered in data/starter-word.json).
  starterWord: getStarterWord("towndle"),
  // update 98: Strict fit (OFF by default): only a city that agrees with EVERY clue already on the board is accepted.
  strictFit: getStrictFit("towndle", false),
  // update 98: "km" (default) or "mi" - only changes how distances are SHOWN, the game maths stays in km.
  distanceUnit: getOption("towndle", "distanceUnit", "km") === "mi" ? "mi" : "km",
  // update 98: the continents the SECRET city can come from (default: all six). Chat can still guess any city of the world.
  regions: cleanRegions(getOption("towndle", "regions", null)),
  // game.guesses = every accepted guess of the round, in the order they came: { word, score, caller, avatarUrl, isStarter }.
  // The page sorts them (highest score first) and repeats the newest one in the darker top row.
  lastGuess: null, // { word, score, caller } - the newest accepted guess
  lastEvent: null, // { id, kind: "guess", word, score, caller, at } - what the floating message window announces
  eventSeq: 0,
  lastWinInfo: null, // { username, points, word } - set the instant a round is won
  recentComments: [],
  usedWords: new Set(),
  roundScores: new Map(),
  totalScores: new Map(),
  autoContinue: true,
  autoContinueDelaySeconds: DEFAULT_AUTO_CONTINUE_DELAY,
  autoContinueAt: null,
  leaderboardShowSeconds: DEFAULT_LEADERBOARD_SHOW_SECONDS,
  rejectionToastSeconds: DEFAULT_REJECTION_TOAST_SECONDS
};

// Which cities can become the secret place for a difficulty tier (tier 1 = world-famous ... tier 3 = lesser known).
//   normal = famous + well-known, medium = well-known + lesser-known, hard = lesser-known only, random = everything
function pickAnswer(difficulty) {
  const tiers = { normal: [1, 2], medium: [2, 3], hard: [3], random: [1, 2, 3] }[difficulty] || [1, 2, 3];
  // update 98: only the continents the host ticked (if the ticked continents have no city of the tier, fall back to them with any tier)
  let regionCities = TOWNS.filter((c) => c.curated && game.regions.includes(c.state)); // imported (GeoNames) places can be guessed, but never become the secret
  if (regionCities.length === 0) regionCities = TOWNS;
  let pool = regionCities.filter((c) => tiers.includes(c.tier));
  if (pool.length === 0) pool = regionCities;
  if (difficulty === "random") {
    // keep the famous cities coming often, otherwise the many lesser-known ones would drown them
    const wanted = [1, 2, 2, 3, 3, 3][Math.floor(Math.random() * 6)];
    const byTier = regionCities.filter((c) => c.tier === wanted);
    if (byTier.length) pool = byTier;
  }
  const unused = pool.filter((c) => !game.usedWords.has(c.key));
  const list = unused.length > 0 ? unused : pool;
  if (unused.length === 0) for (const c of pool) game.usedWords.delete(c.key);
  const pick = list[Math.floor(Math.random() * list.length)];
  game.usedWords.add(pick.key);
  return pick;
}

function awardPoints(caller, points) {
  if (game.mode !== "live" || !caller) return;
  game.roundScores.set(caller, (game.roundScores.get(caller) || 0) + points);
  game.totalScores.set(caller, (game.totalScores.get(caller) || 0) + points);
}

function makeGuessEntry(city, caller, extra = {}) {
  const clue = clueOf(city, game.secretCity);
  return { word: city.key, rec: city, level: clue.level, km: clue.km, bearing: clue.bearing, caller, ...extra };
}

function processGuess(city, caller) {
  const avatarUrl = knownAvatars.get(caller) || null;
  const entry = makeGuessEntry(city, caller, { avatarUrl });
  game.guesses.push(entry);
  game.lastGuess = { word: entry.word, name: city.name, level: entry.level, km: entry.km, approx: Boolean(city.approx), caller };
  game.lastEvent = { id: ++game.eventSeq, kind: "guess", word: entry.word, name: city.name, state: stateLabel(city), district: city.district, typeName: city.typeName, level: entry.level, km: entry.km, approx: Boolean(city.approx), caller, at: Date.now() };

  // Only the exact secret place is GREEN (level 0).
  if (entry.level === 0) {
    const points = game.mode === "live" ? WIN_POINTS : null;
    awardPoints(caller, WIN_POINTS);
    game.status = "won";
    game.streak += 1;
    game.lastWinInfo = { username: caller, points, word: entry.word, name: city.name, state: stateLabel(city), district: city.district, typeName: city.typeName, avatarUrl };
  }

  if (game.status === "won" && game.autoContinue) {
    // Wait out the full win celebration before the auto-continue delay starts.
    const celebrationSeconds = game.leaderboardShowSeconds * CELEBRATION_STAGE_COUNT;
    game.autoContinueAt = Date.now() + (celebrationSeconds + game.autoContinueDelaySeconds) * 1000;
  }
}

function attemptGuess(city, caller) {
  if (game.status !== "live") return { ok: false, error: "No round in progress." };

  // A city already on the board is never accepted twice. Silent for chat; offline shows the message.
  const already = game.guesses.find((g) => g.word === city.key);
  if (already) {
    game.lastEvent = { id: ++game.eventSeq, kind: "duplicate", word: city.key, name: city.name, state: stateLabel(city), district: city.district, typeName: city.typeName, level: already.level, km: already.km, approx: Boolean(city.approx), caller, at: Date.now() };
    return { ok: false, error: `Already guessed: ${city.name} — ${fmtDist(already.km)} away`, duplicate: true };
  }

  // update 98: Strict fit - a city is only accepted when, as the secret place, it would have produced the SAME COLOR and a SIMILAR distance
  // (within 10%, at least 50 km of room) for EVERY guess already on the board. Anything else is skipped with a short message.
  if (game.strictFit && game.guesses.length > 0) {
    const bad = game.guesses.find((g) => {
      if (g.rec.key === game.secretWord) return false; // (never happens: the secret place ends the round)
      const cl = clueOf(g.rec, city);
      return cl.level !== g.level || Math.abs(cl.km - g.km) > Math.max(50, g.km * 0.1);
    });
    if (bad) {
      const reason = `Strict fit: ${city.name} doesn't fit the clue of ${bad.rec.name} (${fmtDist(bad.km)})`;
      game.lastRejection = { word: city.key, reason, at: Date.now() };
      return { ok: false, error: reason, rejected: true };
    }
  }

  processGuess(city, caller);
  return { ok: true };
}

// A round used to open on a totally blank board, so the very first
// audience guess had zero information to reason from. Every round now
// opens with one random, automatically-played guess before any audience
// guessing happens - never the secret word itself, and never worth
// points to anyone - so its per-letter colors give viewers an
// immediate starting clue instead of a cold guess.
const STARTER_GUESS_LABEL = "🎲 Starter place";

function pickStarterCity() {
  const pool = TOWNS.filter((c) => c.key !== game.secretWord && c.tier <= 2);
  if (pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}

function seedStarterGuess() {
  if (!game.starterWord) return;
  const starter = pickStarterCity();
  if (!starter) return;
  const entry = makeGuessEntry(starter, STARTER_GUESS_LABEL, { avatarUrl: null, isStarter: true });
  game.guesses.push(entry);
  game.lastGuess = { word: entry.word, name: starter.name, level: entry.level, km: entry.km, caller: STARTER_GUESS_LABEL };
}

function startRound(overrideCity) {
  game.secretCity = overrideCity || pickAnswer(game.difficulty);
  game.secretWord = game.secretCity.key;
  game.guesses = [];
  game.lastGuess = null;
  game.lastEvent = null;
  game.hintsUsed = 0;
  game.hintSuggestions = [];
  game.hints = [];
  game.hintLastAt = 0;
  game.hintAutoAt = 0;
  game.hintNote = null;
  game.lastRejection = null;
  game.lastWinInfo = null;
  game.roundScores.clear();
  game.status = "live";
  game.roundNumber += 1;
  game.autoContinueAt = null;
  seedStarterGuess();
  broadcastState();
}

function applySettings(settings) {
  const mode = settings.mode;
  const difficulty = settings.difficulty;
  const autoContinue = settings.autoContinue;
  const autoContinueDelaySeconds = settings.autoContinueDelaySeconds;

  if (["live", "test", "offline"].includes(mode)) {
    if (mode !== "live" && game.mode === "live") stopEverything();
    game.mode = mode;
    if (mode !== "live") {
      diagnostics.connectionStatus = mode === "test" ? "test_mode" : "idle";
      diagnostics.lastErrorMessage = null;
    }
  }
  if (["normal", "medium", "hard", "random"].includes(difficulty)) game.difficulty = difficulty;
  if (Array.isArray(settings.regions)) { game.regions = cleanRegions(settings.regions); setOption("towndle", "regions", game.regions); }
  if (typeof autoContinue === "boolean") game.autoContinue = autoContinue;
  if (autoContinueDelaySeconds !== undefined) {
    const v = Number(autoContinueDelaySeconds);
    game.autoContinueDelaySeconds = Number.isFinite(v) ? Math.min(120, Math.max(3, Math.round(v))) : DEFAULT_AUTO_CONTINUE_DELAY;
  }

  startRound();
}

function playAgain() {
  startRound();
}

function setSecretWord(rawWord) {
  const city = findTown(rawWord);
  if (!city) return { ok: false, error: "That place is not in the TOWNDLE list of Malaysian places." };
  startRound(city);
  return { ok: true, name: city.name };
}

function giveUp() {
  if (game.status !== "live") return;
  game.status = "lost";
  game.streak = 0;
  if (game.autoContinue) game.autoContinueAt = Date.now() + game.autoContinueDelaySeconds * 1000;
  broadcastState();
}

function endGame() {
  game.status = "idle";
  game.secretWord = null;
  game.secretCity = null;
  game.guesses = [];
  game.lastGuess = null;
  game.lastEvent = null;
  game.autoContinueAt = null;
  broadcastState();
}

// Cities that agree with EVERY clue already on the board (as the secret place each of them would have produced exactly the same
// color and the same distance for every guess). The secret place is always one of them. Used by the hint and by the Test Mode simulator.
function consistentCities() {
  return TOWNS.filter((c) => game.guesses.every((g) => {
    const cl = clueOf(g.rec, c);
    return cl.level === g.level && cl.km === g.km;
  }));
}

// Hint: suggests a city that fits every clue on the board - never the answer itself, never a city already on the board and
// never the same hint twice.
function suggestHint() {
  if (game.status !== "live") return;
  const onBoard = new Set(game.guesses.map((g) => g.word));
  const candidates = consistentCities().filter(
    (c) => c.key !== game.secretWord && !onBoard.has(c.key) && !game.hintSuggestions.includes(c.key)
  );
  const curated = candidates.filter((c) => c.curated);
  if (curated.length) candidates.splice(0, candidates.length, ...curated); // suggest places viewers can actually be expected to know
  if (candidates.length === 0) return;
  const pick = candidates[Math.floor(Math.random() * candidates.length)];
  game.hintSuggestions.push(pick.key);
  game.hintsUsed += 1;
  broadcastState();
}

// update 58: three hint types (Word idea / Reveal a letter / Rule out letters) + the host's hint settings
const HINT_GAME_ID = "towndle";
let hintAutoBusy = false;
function useHint(payload, isAuto = false) {
  if (game.status !== "live") return;
  const now = Date.now();
  const chk = HC.checkHint(HINT_GAME_ID, payload && payload.type, game.hintsUsed, game.hintLastAt, now, isAuto);
  if (!chk.ok) { game.hintNote = { text: chk.reason, at: now }; broadcastState(); return; }
  game.hintNote = null;
  let hint = null;
  if (chk.type === "suggest") {
    const before = game.hintSuggestions.length;
    suggestHint();
    if (game.hintSuggestions.length > before) {
      const word = game.hintSuggestions[game.hintSuggestions.length - 1];
      const hc = TOWN_BY_KEY.get(word);
      hint = { type: "suggest", icon: "💡", word, text: "Try: " + (hc ? typeLabel(hc) : word).toUpperCase() };
    }
  } else {
    hint = TH.buildHint(chk.type, game.secretCity, game, DISTRICTS);
    if (hint) game.hintsUsed += 1;
  }
  if (!hint) { game.hintNote = { text: "Nothing more to reveal with that hint - try another type.", at: now }; broadcastState(); return; }
  game.hints.push({ ...hint, at: now, auto: Boolean(isAuto) });
  game.hintLastAt = now;
  broadcastState();
}
// automatic hint: after every N guesses the host chose in Settings -> Hints (0 = off)
function maybeAutoHint() {
  if (hintAutoBusy || game.status !== "live") return;
  const n = HC.getHintConfig(HINT_GAME_ID).autoAfterGuesses;
  if (!n) return;
  const made = game.guesses.filter((g) => !g.isStarter).length;
  if (made < game.hintAutoAt + n) return;
  game.hintAutoAt = made;
  hintAutoBusy = true;
  try {
    const t = HC.pickAutoType(HINT_GAME_ID, game.hints.map((h) => h.type));
    if (t) useHint({ type: t }, true);
  } finally { hintAutoBusy = false; }
}

function getLeaderboard(map) {
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([username, score]) => ({ username, score, avatarUrl: knownAvatars.get(username) || null }));
}

setInterval(
  safely("auto-continue-tick", () => {
    if (!game.autoContinueAt) return;
    if (Date.now() >= game.autoContinueAt) {
      game.autoContinueAt = null;
      playAgain();
    } else {
      broadcastState(true);
    }
  }),
  1000
);

const diagnostics = {
  rawEventCount: 0,
  lastReceivedUser: null,
  lastReceivedText: null,
  lastReceivedAt: null,
  connectionStatus: "idle",
  retryAttempt: 0,
  maxRetries: 3,
  lastErrorMessage: null,
  signKeyConfigured: Boolean(process.env.EULERSTREAM_API_KEY),
  tiktokUsername: null
};

function handleIncomingRawEvent(raw) {
  diagnostics.rawEventCount += 1;
  const { username, text, avatarUrl } = extractChatFields(raw);
  diagnostics.lastReceivedUser = username;
  diagnostics.lastReceivedText = text;
  diagnostics.lastReceivedAt = Date.now();
  if (avatarUrl) knownAvatars.set(username, avatarUrl);
  if (avatarUrl && !hostAvatarUrl && game.mode === "live" && isHostUser(username, diagnostics.tiktokUsername)) {
    // late fallback: the host's own chat message carries their picture. The server downloads it and
    // serves its own copy (the raw TikTok link is often .heic / expired / blocked in the browser).
    adoptHostAvatar(diagnostics.tiktokUsername, avatarUrl).then((url) => {
      if (url && !hostAvatarUrl && game.mode === "live") {
        hostAvatarUrl = url;
        broadcastState();
      }
    });
  }

  game.recentComments.unshift({ username, text, avatarUrl: knownAvatars.get(username) || null, at: Date.now() });
  if (game.recentComments.length > 30) game.recentComments.length = 30;

  const city = resolveGuess(text); // update 108: short forms (KL, Sg Petani), spelling variants (Kota Baru), "Pulau Redang" / "Redang", small typos
  if (game.status === "live" && game.mode !== "offline" && city) {
    attemptGuess(city, username);
  } else if (!city && game.status === "live") {
    noteUnknownGuess(text);
  }
  broadcastState();
}

let liveConnection = null;
let testModeTimer = null;
const RETRY_DELAYS_MS = [2000, 4000, 8000];

if (process.env.EULERSTREAM_API_KEY) {
  SignConfig.apiKey = process.env.EULERSTREAM_API_KEY;
}

function stopEverything() {
  hostAvatarUrl = null;
  if (liveConnection) {
    try {
      liveConnection.disconnect();
    } catch (err) {
      console.error("[SAFETY-NET] Error while disconnecting:", err);
    }
    liveConnection = null;
  }
  if (testModeTimer) {
    clearInterval(testModeTimer);
    testModeTimer = null;
  }
}

async function connectToTikTok(username) {
  if (game.mode !== "live") {
    diagnostics.lastErrorMessage = "Switch to Live mode first, then connect.";
    broadcastState();
    return;
  }
  if (!diagnostics.signKeyConfigured) {
    diagnostics.connectionStatus = "error";
    diagnostics.lastErrorMessage = "No signing key set up yet. Add EULERSTREAM_API_KEY in Render before connecting.";
    broadcastState();
    return;
  }

  stopEverything();
  diagnostics.tiktokUsername = username;
  diagnostics.connectionStatus = "connecting";
  diagnostics.retryAttempt = 0;
  diagnostics.lastErrorMessage = null;
  broadcastState();

  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    try {
      const connection = new TikTokLiveConnection(username, {
        signApiKey: process.env.EULERSTREAM_API_KEY
      });

      connection.on(WebcastEvent.CHAT, safely("chat-event", (data) => handleIncomingRawEvent(data)));
      connection.on(
        WebcastEvent.DISCONNECTED,
        safely("disconnected-event", () => {
          diagnostics.connectionStatus = "disconnected";
          broadcastState();
        })
      );
      connection.on(
        "reconnected",
        safely("reconnected-event", () => {
          diagnostics.connectionStatus = "live";
          diagnostics.lastErrorMessage = null;
          broadcastState();
        })
      );
      connection.on(
        WebcastEvent.ERROR,
        safely("error-event", (err) => console.error("[TikTok] connection error event:", err))
      );
      connection.on(
        WebcastEvent.STREAM_END,
        safely("stream-end-event", () => {
          diagnostics.connectionStatus = "disconnected";
          diagnostics.lastErrorMessage = "The TikTok LIVE broadcast ended.";
          broadcastState();
        })
      );

      const connectState = await connection.connect();
      liveConnection = connection;
      Engagement.attach(connection, { game: "towndle", tiktokUsername: username });
      diagnostics.connectionStatus = "live";
      diagnostics.lastErrorMessage = null;
      broadcastState();
      // Look up the host's profile picture (for the starter-word row) without
      // holding up the connection; broadcast again once it's known.
      resolveHostAvatar(connection, connectState, username, () => liveConnection !== connection).then((url) => {
        if (url && liveConnection === connection) {
          hostAvatarUrl = url;
          broadcastState();
        }
      });
      return;
    } catch (err) {
      console.error(`[TikTok] Connect attempt ${attempt + 1} failed:`, err?.message || err);
      diagnostics.retryAttempt = attempt + 1;
      diagnostics.lastErrorMessage = "Try " + (attempt + 1) + " failed. " + describeConnectError(err);
      const isLastAttempt = attempt === RETRY_DELAYS_MS.length;
      if (isLastAttempt) {
        diagnostics.connectionStatus = "error";
        diagnostics.lastErrorMessage = describeConnectError(err);
        broadcastState();
        return;
      }
      diagnostics.connectionStatus = "retrying";
      broadcastState();
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS_MS[attempt]));
    }
  }
}

function describeConnectError(err) {
  return explainTikTokError(err, (typeof diagnostics !== "undefined" && diagnostics && diagnostics.tiktokUsername) || "");
}
// (older generic wording, no longer used)
function describeConnectErrorLegacy(err) {
  const message = String(err?.message || err || "").toLowerCase();
  if (message.includes("not found") || message.includes("does not exist")) {
    return "That TikTok username couldn't be found. Double-check the spelling.";
  }
  if (message.includes("offline") || message.includes("not live") || message.includes("live_not_found")) {
    return "That account doesn't look like it's LIVE right now.";
  }
  if (message.includes("sign") || message.includes("key") || message.includes("401") || message.includes("403")) {
    return "The signing key was rejected. Check that EULERSTREAM_API_KEY in Render is correct.";
  }
  return "Couldn't connect to TikTok LIVE. Make sure the account is LIVE right now, wait about a minute, then press Connect again (TikTok sometimes limits requests from the server).";
}

const FAKE_USERNAMES = [
  "comet_fan", "wordwiz99", "livstream_lu", "night.owl", "byte_buddy", "quiz.queen", "pixel_pete"
];
const FAKE_JUNK_WORDS = ["hi", "lol", "go team", "so fun", "love this game", "hmm", "wait what"];

function startTestMode() {
  stopEverything();
  diagnostics.connectionStatus = "test_mode";
  diagnostics.lastErrorMessage = null;
  diagnostics.tiktokUsername = null;

  testModeTimer = setInterval(
    safely("test-mode-tick", () => {
      if (game.mode !== "test") return;
      const username = FAKE_USERNAMES[Math.floor(Math.random() * FAKE_USERNAMES.length)];
      const roll = Math.random();
      let text;

      if (game.status === "live" && game.secretCity && roll < 0.05) {
        text = typeLabel(game.secretCity);
      } else if (game.status === "live" && roll < 0.4) {
        // half of the simulated guesses fit every clue already on the board (like a smart viewer), the rest are random cities
        const onBoard = new Set(game.guesses.map((g) => g.word));
        const pool = (Math.random() < 0.5 ? consistentCities() : TOWNS.filter((c) => c.tier <= 2)).filter((c) => !onBoard.has(c.key));
        text = pool.length > 0 ? typeLabel(pool[Math.floor(Math.random() * pool.length)]) : FAKE_JUNK_WORDS[0];
      } else {
        text = FAKE_JUNK_WORDS[Math.floor(Math.random() * FAKE_JUNK_WORDS.length)];
      }

      const shapeVariant = Math.floor(Math.random() * 3);
      let fakeRaw;
      if (shapeVariant === 0) fakeRaw = { uniqueId: username, comment: text };
      else if (shapeVariant === 1) fakeRaw = { user: { uniqueId: username, nickname: username }, message: text };
      else fakeRaw = { nickname: username, content: text };

      handleIncomingRawEvent(fakeRaw);
    }),
    900
  );
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// `nsp` is the Socket.IO namespace "/towndle", created inside mountTowndle() below -
// broadcastState() and the namespace's "connection" handler both close over it.
let nsp = null;

function buildStatePayload() {
  const ended = game.status === "lost" || game.status === "won";
  return {
    game: {
      mode: game.mode,
      status: game.status,
      difficulty: game.difficulty,
      strictFit: game.strictFit,
      distanceUnit: game.distanceUnit,
      regions: game.regions,
      allRegions: STATE_LIST.map((s) => ({ code: s.code, name: s.name })),
      secretWord: ended && game.secretCity ? game.secretCity.name : null,
      secretCity: ended && game.secretCity ? { name: game.secretCity.name, state: stateLabel(game.secretCity), district: game.secretCity.district, typeName: game.secretCity.typeName } : null,
      // Every guess of the round (the page sorts them nearest first). The automatic starter city shows the LIVE host's profile picture.
      guesses: game.guesses.map(guessPayload),
      lastGuess: game.lastGuess,
      lastEvent: game.lastEvent,
      guessesMade: game.guesses.length,
      winPoints: WIN_POINTS,
      roundNumber: game.roundNumber,
      streak: game.streak,
      hintsUsed: game.hintsUsed,
      hintSuggestions: game.hintSuggestions,
      hints: game.hints,
      hintConfig: HC.publicHintInfo("towndle", game.hintsUsed, game.hintLastAt),
      hintNote: game.hintNote,
      lastRejection: game.lastRejection,
      colors: getColors(), // update 95: colors of the tiles / badges / frame - the page AND the legend follow them
      starterWord: game.starterWord,
      lastWinInfo: game.lastWinInfo,
      autoContinue: game.autoContinue,
      autoContinueDelaySeconds: game.autoContinueDelaySeconds,
      leaderboardShowSeconds: game.leaderboardShowSeconds,
      rejectionToastSeconds: game.rejectionToastSeconds,
      autoContinueSecondsLeft: game.autoContinueAt ? Math.max(0, Math.ceil((game.autoContinueAt - Date.now()) / 1000)) : 0,
      cityCount: TOWNS.length,
      districtCount: new Set(TOWNS.map((t) => t.districtKey)).size,
      stateCount: ALL_REGIONS.length
    },
    roundLeaderboard: getLeaderboard(game.roundScores),
    totalLeaderboard: getLeaderboard(game.totalScores),
    recentComments: game.recentComments.slice(0, 12),
    diagnostics: {
      ...diagnostics,
      dictionarySource: "built-in Malaysian place list",
      dictionaryWordCount: TOWNS.length,
      dictionaryLoading: false
    }
  };
}

function guessPayload(g) {
  const c = g.rec;
  return {
    word: g.word, name: c.name, state: stateLabel(c), district: c.district, typeName: c.typeName,
    level: g.level, km: g.km, bearing: g.bearing, approx: Boolean(c.approx), // update 111: bulk places have only an approximate position -> the page shows "~"
    caller: g.caller, isStarter: Boolean(g.isStarter), avatarUrl: g.isStarter ? hostAvatarUrl : g.avatarUrl
  };
}

let broadcastPending = false;
function broadcastState(lightweight = false) {
  maybeAutoHint();
  if (!nsp) return; // not mounted yet - nothing to broadcast to
  if (broadcastPending) return;
  broadcastPending = true;
  setTimeout(
    () => {
      broadcastPending = false;
      try {
        nsp.emit("state", buildStatePayload());
      } catch (err) {
        console.error("[SAFETY-NET] Error broadcasting state:", err);
      }
    },
    lightweight ? 0 : 100
  );
}

function handleClientAction(ws, msg) {
  const type = msg && msg.type;
  const payload = msg && msg.payload;
  switch (type) {
    case "connect_tiktok":
      if (testModeTimer) {
        clearInterval(testModeTimer);
        testModeTimer = null;
      }
      connectToTikTok(String((payload && payload.username) || "").trim().replace(/^@/, ""));
      break;
    case "disconnect_tiktok":
      stopEverything();
      diagnostics.connectionStatus = "idle";
      diagnostics.tiktokUsername = null;
      broadcastState();
      break;
    case "apply_settings":
      applySettings(payload || {});
      if (game.mode === "test") {
        startTestMode();
      } else if (game.mode === "live") {
        // Stay connected if we already were - only stop the Test Mode
        // simulator (if it happened to still be running). This was the
        // bug: previously ANY apply_settings while in Live mode force-
        // disconnected TikTok, requiring a manual reconnect every time.
        if (testModeTimer) {
          clearInterval(testModeTimer);
          testModeTimer = null;
        }
      } else {
        stopEverything();
      }
      break;
    case "play_again":
      playAgain();
      break;
    case "give_up":
      giveUp();
      break;
    case "end_game":
      endGame();
      break;
    case "use_hint":
      useHint(payload);
      break;
    case "set_hint_config":
      HC.setHintConfig("towndle", payload);
      broadcastState();
      break;
    case "set_secret_word": {
      const result = setSecretWord(String((payload && payload.word) || ""));
      ws.emit("set_secret_word_result", result);
      break;
    }
    case "submit_offline_guess": {
      const typed = String((payload && payload.word) || "");
      const city = resolveGuess(typed);
      let result;
      if (!city) {
        const near = suggestPlaces(typed, 3).map((c) => typeLabel(c));
        noteUnknownGuess(typed);
        result = { ok: false, error: "That place is not in the TOWNDLE list of Malaysian places." + (near.length ? " Did you mean: " + near.join(", ") + "?" : "") };
      } else {
        result = attemptGuess(city, "Host");
        broadcastState();
      }
      ws.emit("offline_guess_result", result);
      break;
    }
    case "set_colors":
      patchColors(payload);
      broadcastState(true);
      break;
    case "reset_colors":
      resetColors();
      broadcastState(true);
      break;
    case "set_strict_fit":
      game.strictFit = setStrictFit("towndle", Boolean(payload && payload.on));
      broadcastState();
      break;
    case "set_distance_unit":
      game.distanceUnit = setOption("towndle", "distanceUnit", payload && payload.unit === "mi" ? "mi" : "km");
      broadcastState();
      break;
    case "set_starter_word":
      game.starterWord = setStarterWord("towndle", Boolean(payload && payload.on));
      broadcastState();
      break;
    case "reset_round_leaderboard":
      game.roundScores.clear();
      broadcastState();
      break;
    case "reset_total_leaderboard":
      game.totalScores.clear();
      broadcastState();
      break;
    case "set_leaderboard_show_seconds": {
      const v = Number(payload && payload.seconds);
      game.leaderboardShowSeconds = Number.isFinite(v) ? Math.min(30, Math.max(1, Math.round(v))) : DEFAULT_LEADERBOARD_SHOW_SECONDS;
      broadcastState();
      break;
    }
    case "set_rejection_toast_seconds": {
      const v = Number(payload && payload.seconds);
      game.rejectionToastSeconds = Number.isFinite(v) ? Math.min(30, Math.max(1, Math.round(v))) : DEFAULT_REJECTION_TOAST_SECONDS;
      broadcastState();
      break;
    }
    default:
      break;
  }
}

// ============================================================
// Mounting into the platform
// ============================================================
//   import { mountTowndle } from "./server/towndle/towndle-server.js";
//   await mountTowndle(app, io, { mountPath: "/towndle" });
//
// `app` is the shared Express app, `io` the shared Socket.IO Server. TOWNDLE serves its own
// static folder at `mountPath` and talks to its page over the Socket.IO namespace "/towndle".
// Call once per process (a second call would start a second
// auto-continue timer against the same shared game state).
export async function mountTowndle(app, io, options = {}) {
  const mountPath = options.mountPath || "/towndle";

  app.use(mountPath, express.static(path.join(__dirname, "public")));
  app.get(mountPath, (req, res) => {
    res.sendFile(path.join(__dirname, "public", "towndle-index.html"));
  });

  nsp = io.of("/towndle");
  nsp.on(
    "connection",
    safely("towndle-connection", (socket) => {
      socket.emit("state", buildStatePayload());
      socket.on(
        "action",
        safely("towndle-action", (msg) => {
          if (!msg || typeof msg !== "object") return;
          handleClientAction(socket, msg);
        })
      );
    })
  );

  // (The place list is built in - nothing to download or load. data/towns-extra.txt and GeoNames MY.txt add more, see towns.js.)
  console.log(`[TOWNDLE] ${TOWNS.length} Malaysian places loaded (${LOAD_REPORT.builtIn} with a checked position, ${LOAD_REPORT.bulk} bulk places with an approximate position, ${LOAD_REPORT.extra} from towns-extra.txt, ${LOAD_REPORT.geonames} from GeoNames).`);
  console.log(
    `[TOWNDLE] Mounted at ${mountPath} (Socket.IO namespace /towndle). ` +
      (diagnostics.signKeyConfigured
        ? "EulerStream signing key detected - TikTok connections are ready."
        : "No EULERSTREAM_API_KEY found - Test Mode will work, but live TikTok connections will not.")
  );

  return { mountPath };
}

// ============================================================
// Standalone mode
// ============================================================
// Lets you test this game entirely on its own (`node towndle-server.js`)
// without touching your platform's code at all. This block only runs
// when the file is EXECUTED DIRECTLY, never when it's imported by
// mountTowndle above - importing it (the normal merge path) never
// opens a port or starts listening on its own.
const isRunDirectly = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isRunDirectly) {
  const { Server } = await import("socket.io");
  const standaloneApp = express();
  const standaloneServer = http.createServer(standaloneApp);
  const standaloneIo = new Server(standaloneServer);
  await mountTowndle(standaloneApp, standaloneIo, { mountPath: "/" });
  const PORT = process.env.PORT || 3000;
  standaloneServer.listen(PORT, () => {
    console.log(`[TOWNDLE] Standalone test server listening on port ${PORT}`);
  });
}

// Update 42: the HOME page's shared TikTok connection links this game by itself - no need to open the game and press
// Connect. Uses the same actions the game's own buttons send (switch to Live, then connect), only when not linked yet.
PlatformHub.registerGame(
  "towndle",
  (username) => {
    const ws = { emit() {}, send() {} };
    if (game.mode !== "live") handleClientAction(ws, { type: "apply_settings", payload: { mode: "live" } });
    handleClientAction(ws, { type: "connect_tiktok", payload: { username } });
  },
  (username) => {
    const u = String(username || "").replace(/^@/, "").toLowerCase();
    const cur = String(diagnostics.tiktokUsername || "").replace(/^@/, "").toLowerCase();
    return game.mode === "live" && ["live", "connecting", "retrying"].includes(diagnostics.connectionStatus) && (!cur || cur === u);
  }
);
