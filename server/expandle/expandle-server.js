// expandle-server.js
// EXPANDLE - a BLINDLE sibling (built on the EXPANDLE board) where the audience GROWS a word, one letter per row.
//
// Every round starts with a 3-letter word (row 1, free). Row 2 must be a real 4-letter word made of the letters of row 1 (shuffled
// in any order) PLUS exactly one new letter; row 3 a real 5-letter word made of row 2's letters plus one new letter; and so on:
//     ARE -> TEAR (+T) -> STARE (+S) -> ... one more letter every row, as far as the chat can take it before the clock runs out.
// Only the FIRST valid word for each row is accepted (the next row then builds on it). The newest row is always on top.
//
// The round is timed (60 seconds by default, the host can change it). Every accepted word scores 1 point for the viewer who
// typed it. When the time is up (or the word can not grow any further) the round ends with the usual celebration: the top
// scorer, this round's leaderboard and the all-time leaderboard.
//
// Everything else follows BLINDLE: Live / Test / Offline modes, word languages, hints, host-set start word, leaderboards.
//
// Transport: its own Socket.IO namespace "/expandle" (never collides with BLINDLE's WebSocketServer). Mounts at /expandle.

import "dotenv/config";
import express from "express";
import http from "http";
import path from "path";
import { fileURLToPath } from "url";
import { TikTokLiveConnection, WebcastEvent, SignConfig } from "tiktok-live-connector";
import { explainTikTokError } from "../shared/tiktok-errors.js";
import { ANSWER_WORDS as EN_ANSWER_WORDS, MIN_WORD_LENGTH } from "../blindle/blindle-answers.js";
import { Engagement } from "../engagement/engagement-hub.js";
import { resolveHostAvatar, adoptHostAvatar, isHostUser } from "../shared/host-avatar.js";
import * as HC from "../shared/hint-config-store.js"; // update 58: three hint types + host hint settings
import * as WH from "../shared/word-hints.js";
import { getStarterWord, setStarterWord } from "../shared/starter-word-store.js";
import { getOption, setOption } from "../shared/game-options-store.js"; // update 98: start length / max length / difficulty
import { getColors, patchColors, resetColors } from "../shared/expandle-colors-store.js"; // update 96: one tile color, shared with the legend
import { isValidShortWord, listShortWords } from "./short-words.js";
import { dictionaryState, loadDictionary, getWordsOfLength } from "../blindle/blindle-dictionary.js";
import * as WL from "../shared/word-language.js"; // update 48: word language

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

// ---- THE WORD LIST + THE SCORE ---------------------------------------------------------------
// Every word of the current word bank (all lengths, all ticked languages). Used for the starter word, the hint and the
// Test Mode simulator. Chat / host guesses are accepted when they are real words (see isValidGuessWord).
let wordList = [];
let wordIndex = new Set();
function buildWordList(answers) {
  const set = new Set();
  for (const k of Object.keys(answers || {})) {
    const arr = answers[k];
    if (!Array.isArray(arr)) continue;
    for (const raw of arr) {
      const w = String(raw).toLowerCase();
      if (/^[a-z]+$/.test(w)) set.add(w);
    }
  }
  wordList = [...set].sort();
  wordIndex = set;
}

// ---- THE GROWING RULE -----------------------------------------------------------------------
// `extraLetter(base, word)`: if `word` is made of exactly the letters of `base` plus ONE new letter (any order) it returns that
// new letter, otherwise null. ARE + TEAR -> "t".   ARE + AREA -> "a" (a letter may repeat).
function extraLetter(base, word) {
  if (!base || !word || word.length !== base.length + 1) return null;
  const counts = new Array(26).fill(0);
  for (const ch of base) counts[ch.charCodeAt(0) - 97]++;
  let extra = null;
  for (const ch of word) {
    const i = ch.charCodeAt(0) - 97;
    if (i < 0 || i > 25) return null;
    if (counts[i] > 0) counts[i]--;
    else if (extra === null) extra = ch;
    else return null;
  }
  return extra;
}
const sigOf = (w) => w.split("").sort().join("");

// Every real word of one length in the current language(s), grouped by its sorted letters ("signature"), cached per length.
// A guess is checked with the full dictionary; this index only drives hints, the start-word picker and Test Mode.
const sigIndexCache = new Map();
function wordsOfLength(n) {
  const out = new Set();
  const parts = WL.modeInfo(wordLanguage).parts;
  if (n === 3) for (const w of listShortWords(parts)) out.add(w);
  for (const w of wordList) if (w.length === n) out.add(w);
  if (n >= 4 && parts.includes("en")) for (const w of getWordsOfLength(n)) out.add(w);
  // update 99: Indonesian / Bahasa Melayu - the WHOLE guess dictionary of those languages (not only their answer list), so a round does not
  // end early as a "dead end" while real words that grow the row still exist (every guess is checked against the same dictionaries).
  const others = parts.filter((p) => p !== "en");
  if (n >= 4 && others.length) {
    const mode = others.length === 2 ? "ms-id" : others[0];
    for (const set of WL.guessWordSets(mode).sets) for (const w of set) if (w.length === n && /^[a-z]+$/.test(w)) out.add(w);
  }
  return [...out];
}
function sigIndex(n) {
  if (!sigIndexCache.has(n)) {
    const map = new Map();
    for (const w of wordsOfLength(n)) {
      const k = sigOf(w);
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(w);
    }
    sigIndexCache.set(n, map);
  }
  return sigIndexCache.get(n);
}
// All real words that grow `base` by one letter: [{ word, extra }].
function nextWordsFor(base) {
  const idx = sigIndex(base.length + 1);
  const out = [];
  for (let c = 97; c <= 122; c++) {
    const extra = String.fromCharCode(c);
    const list = idx.get(sigOf(base + extra));
    if (list) for (const word of list) out.push({ word, extra });
  }
  return out;
}
// How many more rows a start word can grow (capped), used to pick start words that make a good round.
const depthMemo = new Map();
function chainDepth(base, cap) {
  if (cap <= 0 || base.length >= MAX_WORD_LENGTH) return 0;
  const key = sigOf(base) + ":" + cap;
  if (depthMemo.has(key)) return depthMemo.get(key);
  let best = 0;
  const seen = new Set();
  for (const { word } of nextWordsFor(base)) {
    const k = sigOf(word);
    if (seen.has(k)) continue;
    seen.add(k);
    best = Math.max(best, 1 + chainDepth(word, cap - 1));
    if (best >= cap) break;
  }
  depthMemo.set(key, best);
  return best;
}
const GUESS_MIN_LENGTH = 3;
const START_LENGTH = 3; // the standard start-word length (the host can change it in Settings -> Start word length)
const MIN_START_LENGTH = 3;
const MAX_START_LENGTH = 5;
const MIN_MAX_LENGTH = 6; // the lowest "Maximum word length" the host can pick (0 = automatic)

// ---- WORD LANGUAGE (update 48) -------------------------------------------------------------
// The host picks the word language in Settings (English / Indonesian / Bahasa Melayu / 4 mixes).
// ANSWER_WORDS, MAX_WORD_LENGTH and the difficulty index follow that choice.
const WORD_GAME_ID = "expandle";
let wordLanguage = WL.getLanguage(WORD_GAME_ID);
let ANSWER_WORDS = WL.getBank(wordLanguage, EN_ANSWER_WORDS).answers;
let MAX_WORD_LENGTH = WL.getBank(wordLanguage, EN_ANSWER_WORDS).maxLength;
buildWordList(ANSWER_WORDS);
function isValidGuessWord(word) {
  // EXPANDLE only: 3-letter guesses are checked against the small short-word lists (the shared dictionaries start at 4 letters).
  if (word.length === 3) return isValidShortWord(WL.modeInfo(wordLanguage).parts, word) || WL.isValidGuess(wordLanguage, word);
  return WL.isValidGuess(wordLanguage, word);
}
function applyWordLanguage(mode) {
  const bank = WL.getBank(mode, EN_ANSWER_WORDS);
  wordLanguage = bank.mode;
  ANSWER_WORDS = bank.answers;
  MAX_WORD_LENGTH = bank.maxLength;
  buildWordList(ANSWER_WORDS);
  sigIndexCache.clear();
  depthMemo.clear();
}

const DEFAULT_AUTO_CONTINUE_DELAY = 3;
const DEFAULT_LEADERBOARD_SHOW_SECONDS = 3;
const DEFAULT_REJECTION_TOAST_SECONDS = 4;
const DEFAULT_ROUND_SECONDS = 60; // the time limit of every round (the host can change it in Settings)
const MIN_ROUND_SECONDS = 10;
const MAX_ROUND_SECONDS = 600;
// The win celebration always walks through 3 stages (winner, this-round
// leaderboard, all-time leaderboard), each shown for leaderboardShowSeconds.
// Auto-continue must never cut that celebration short, so when a round is
// WON we add this celebration runtime on top of the configured delay (see
// processGuess below). A "give up" / timeout loss has no celebration, so
// it keeps using autoContinueDelaySeconds on its own (see giveUp below).
const CELEBRATION_STAGE_COUNT = 3;

// Points: every accepted word scores 1 point for the viewer who typed it (the free start word scores nothing).
const WORD_POINTS = 1;

const game = {
  mode: "test",
  status: "idle",
  roundSeconds: DEFAULT_ROUND_SECONDS,
  // update 98: host options (remembered in data/game-options.json)
  startLength: cleanStartLength(getOption("expandle", "startLength", 3)),   // 3, 4 or 5 letters; 0 = a random 3-5 every round
  maxLength: cleanMaxLength(getOption("expandle", "maxLength", 0)),         // 0 = automatic (as long as the dictionary allows)
  difficulty: cleanDifficulty(getOption("expandle", "difficulty", "random")), // how the start word is picked
  activeStartLength: START_LENGTH,                                           // the start length of the round that is running
  roundEndsAt: null, // epoch ms - when the running round's clock reaches zero
  roundStartedAt: null,
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
  starterWord: getStarterWord("expandle"),
  // game.guesses = every accepted guess of the round, in the order they came: { word, score, caller, avatarUrl, isStarter }.
  // The page sorts them (highest score first) and repeats the newest one in the darker top row.
  lastGuess: null, // { word, score, caller } - the newest accepted guess
  lastEvent: null, // { id, kind: "guess", word, score, caller, at } - what the floating message window announces
  eventSeq: 0,
  lastWinInfo: null, // { username, points, word } - set the instant a round is won
  recentComments: [],
  usedWords: new Set(),
  endReason: null, // "time" | "dead_end" | "max" | "host"
  roundScores: new Map(),
  totalScores: new Map(),
  autoContinue: true,
  autoContinueDelaySeconds: DEFAULT_AUTO_CONTINUE_DELAY,
  autoContinueAt: null,
  leaderboardShowSeconds: DEFAULT_LEADERBOARD_SHOW_SECONDS,
  rejectionToastSeconds: DEFAULT_REJECTION_TOAST_SECONDS
};

function cleanStartLength(v) {
  const n = Math.round(Number(v));
  if (n === 0) return 0;
  return Number.isFinite(n) ? Math.min(MAX_START_LENGTH, Math.max(MIN_START_LENGTH, n)) : START_LENGTH;
}
function cleanMaxLength(v) {
  const n = Math.round(Number(v));
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.max(MIN_MAX_LENGTH, n);
}
function cleanDifficulty(v) { return ["normal", "medium", "hard", "random"].includes(v) ? v : "normal"; }
// the longest word of a round: the host's cap (never below start length + 1) or what the dictionary allows
function effectiveMax() {
  const cap = game.maxLength > 0 ? Math.min(game.maxLength, MAX_WORD_LENGTH) : MAX_WORD_LENGTH;
  return Math.max(cap, Math.min(MAX_WORD_LENGTH, game.activeStartLength + 1));
}

function clampRoundSeconds(n) {
  const v = Math.round(Number(n));
  if (!Number.isFinite(v)) return DEFAULT_ROUND_SECONDS;
  return Math.min(MAX_ROUND_SECONDS, Math.max(MIN_ROUND_SECONDS, v));
}

// The start word of a round: a random real word of the chosen start length (3 by default) that can grow, picked by the difficulty:
//   normal = a common word that can grow for many rows      medium = any word that grows for 3-5 rows
//   hard   = a word that dead-ends after only 1-2 rows       random = any word that can grow at least once
function pickStartWord() {
  const len = game.startLength === 0 ? MIN_START_LENGTH + Math.floor(Math.random() * (MAX_START_LENGTH - MIN_START_LENGTH + 1)) : game.startLength;
  game.activeStartLength = len;
  const full = wordsOfLength(len);
  const common = wordList.filter((w) => w.length === len);
  const pool = game.difficulty === "normal" && common.length >= 30 ? common : full;
  if (pool.length === 0) return null;
  const ok = (d) => game.difficulty === "medium" ? d >= 3 && d <= 5 : game.difficulty === "hard" ? d >= 1 && d <= 2 : game.difficulty === "random" ? d >= 1 : d >= 6;
  let best = null;
  let bestDepth = -1;
  for (let attempt = 0; attempt < 90; attempt++) {
    const w = pool[Math.floor(Math.random() * pool.length)];
    if (game.usedWords.has(w) && attempt < 60) continue;
    const d = chainDepth(w, 7);
    if (ok(d)) { best = w; bestDepth = d; break; }
    // fallback: the closest to what the difficulty wants (hard wants the SHORTEST chain that still grows, the others the longest)
    const score = game.difficulty === "hard" ? (d >= 1 ? 100 - d : -1) : d;
    if (score > bestDepth) { best = w; bestDepth = score; }
  }
  const pick = best || pool[0];
  game.usedWords.add(pick);
  if (game.usedWords.size > 200) game.usedWords.clear();
  return pick;
}

function awardPoints(caller, points) {
  if (game.mode !== "live" || !caller) return;
  game.roundScores.set(caller, (game.roundScores.get(caller) || 0) + points);
  game.totalScores.set(caller, (game.totalScores.get(caller) || 0) + points);
}

function topRow() {
  return game.guesses.length ? game.guesses[game.guesses.length - 1] : null;
}

// The newest word's letters grown by one: row n+1 must be a real word of length n+1 using the letters of row n plus ONE new letter.
function checkNextWord(word) {
  const top = topRow();
  if (!top) return { ok: false, error: "No round in progress." };
  if (word.length !== top.word.length + 1) return { ok: false, error: `The next row needs a ${top.word.length + 1}-letter word.` };
  const extra = extraLetter(top.word, word);
  if (!extra) return { ok: false, error: `Use the letters of ${top.word.toUpperCase()} plus exactly ONE new letter.` };
  if (!isValidGuessWord(word)) return { ok: false, error: "That's not in the word list." };
  return { ok: true, extra };
}

// Accepts `word` as the next row (the caller already checked it with checkNextWord).
function processGuess(word, extra, caller) {
  const avatarUrl = knownAvatars.get(caller) || null;
  game.guesses.push({ word, extra, caller, avatarUrl });
  game.lastGuess = { word, caller };
  game.lastEvent = { id: ++game.eventSeq, kind: "guess", word, extra, length: word.length, caller, at: Date.now() };
  awardPoints(caller, WORD_POINTS);
  // hints belong to the row they were asked for - a new row starts with a clean slate
  game.hints = [];
  game.hintSuggestions = [];
  game.hintNote = null;
  // the word can not grow any further: end the round right away
  if (word.length >= effectiveMax()) endRound("max");
  else if (nextWordsFor(word).length === 0) endRound("dead_end");
}

function attemptGuess(word, caller) {
  if (game.status !== "live") return { ok: false, error: "No round in progress." };
  const check = checkNextWord(word);
  if (!check.ok) return check;
  processGuess(word, check.extra, caller);
  return { ok: true };
}

// The round is over: time is up, the word can not grow any more, the max length was reached, or the host ended it.
function endRound(reason) {
  if (game.status !== "live") return;
  game.roundEndsAt = null;
  game.endReason = reason;
  const made = game.guesses.filter((g) => !g.isStarter);
  if (made.length > 0) {
    // the top scorer of the round = the viewer with the most accepted words (the earliest one wins a tie)
    const counts = new Map();
    for (const g of made) counts.set(g.caller, (counts.get(g.caller) || 0) + 1);
    let top = null;
    for (const [name, n] of counts) if (!top || n > top.n) top = { name, n };
    const longest = [...made].reverse().find((g) => g.caller === top.name) || made[made.length - 1];
    game.status = "won";
    game.streak += 1;
    game.lastWinInfo = {
      username: top.name,
      points: game.mode === "live" ? top.n * WORD_POINTS : null,
      word: longest.word,
      words: top.n,
      rows: made.length,
      reached: game.guesses[game.guesses.length - 1].word.length,
      reason,
      avatarUrl: longest.avatarUrl || null
    };
    const celebrationSeconds = game.leaderboardShowSeconds * CELEBRATION_STAGE_COUNT;
    if (game.autoContinue) game.autoContinueAt = Date.now() + (celebrationSeconds + game.autoContinueDelaySeconds) * 1000;
  } else {
    game.status = "lost";
    game.streak = 0;
    if (game.autoContinue) game.autoContinueAt = Date.now() + game.autoContinueDelaySeconds * 1000;
  }
  broadcastState();
}

// A round used to open on a totally blank board, so the very first
// audience guess had zero information to reason from. Every round now
// opens with one random, automatically-played guess before any audience
// guessing happens - never the secret word itself, and never worth
// points to anyone - so its per-letter colors give viewers an
// immediate starting clue instead of a cold guess.
const STARTER_GUESS_LABEL = "🎲 Start word";

function startRound(overrideWord) {
  const start = overrideWord || pickStartWord();
  game.guesses = [];
  if (start) {
    // row 1: the free start word (it scores nothing and shows the LIVE host's picture)
    game.guesses.push({ word: start, extra: null, caller: STARTER_GUESS_LABEL, avatarUrl: null, isStarter: true });
  }
  game.lastGuess = start ? { word: start, caller: STARTER_GUESS_LABEL } : null;
  game.lastEvent = null;
  game.hintsUsed = 0;
  game.hintSuggestions = [];
  game.hints = [];
  game.hintLastAt = 0;
  game.hintAutoAt = 0;
  game.hintNote = null;
  game.lastRejection = null;
  game.lastWinInfo = null;
  game.endReason = null;
  game.roundScores.clear();
  game.status = "live";
  game.roundNumber += 1;
  game.autoContinueAt = null;
  game.roundStartedAt = Date.now();
  game.roundEndsAt = Date.now() + game.roundSeconds * 1000;
  broadcastState();
}

function applySettings(settings) {
  const mode = settings.mode;
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
  if (settings.roundSeconds !== undefined) game.roundSeconds = clampRoundSeconds(settings.roundSeconds);
  if (settings.startLength !== undefined) game.startLength = setOption("expandle", "startLength", cleanStartLength(settings.startLength));
  if (settings.maxLength !== undefined) game.maxLength = setOption("expandle", "maxLength", cleanMaxLength(settings.maxLength));
  if (settings.difficulty !== undefined) game.difficulty = setOption("expandle", "difficulty", cleanDifficulty(settings.difficulty));
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

// The host types the start word of the round (a real 3-letter word).
function setSecretWord(rawWord) {
  const word = normalizeGuess(rawWord);
  if (word.length < MIN_START_LENGTH || word.length > MAX_START_LENGTH) return { ok: false, error: `The start word must have ${MIN_START_LENGTH} to ${MAX_START_LENGTH} letters.` };
  if (!isValidGuessWord(word)) return { ok: false, error: "That's not in the word list." };
  game.activeStartLength = word.length;
  startRound(word);
  return { ok: true };
}

// "End round now" (the host): the round finishes immediately and is scored like a time-out.
function giveUp() {
  endRound("host");
}

function endGame() {
  game.status = "idle";
  game.roundEndsAt = null;
  game.guesses = [];
  game.lastGuess = null;
  game.lastEvent = null;
  game.autoContinueAt = null;
  broadcastState();
}

// update 58 hint types, EXPANDLE flavor - all of them are about the NEWEST row (the word the chat has to grow next):
//   Word idea       -> a real word that grows it            ("Try: STARE")
//   Reveal a letter -> a letter that can be added           ("Add the letter: S")
//   Rule out        -> letters that can NOT be added        ("No word if you add: Q, X, Z")
const HINT_GAME_ID = "expandle";
let hintAutoBusy = false;
function useHint(payload, isAuto = false) {
  if (game.status !== "live") return;
  const now = Date.now();
  const chk = HC.checkHint(HINT_GAME_ID, payload && payload.type, game.hintsUsed, game.hintLastAt, now, isAuto);
  if (!chk.ok) { game.hintNote = { text: chk.reason, at: now }; broadcastState(); return; }
  game.hintNote = null;
  const top = topRow();
  const options = top ? nextWordsFor(top.word) : [];
  const given = game.hints.filter((h) => h.type === chk.type).map((h) => h.key);
  let hint = null;
  if (chk.type === "suggest") {
    const pool = options.filter((o) => !given.includes(o.word));
    if (pool.length) {
      const pick = pool[Math.floor(Math.random() * pool.length)];
      hint = { type: "suggest", key: pick.word, word: pick.word, text: "Try: " + pick.word.toUpperCase() };
      game.hintSuggestions.push(pick.word);
    }
  } else if (chk.type === "letter") {
    const letters = [...new Set(options.map((o) => o.extra))].filter((l) => !given.includes(l));
    if (letters.length) {
      const l = letters[Math.floor(Math.random() * letters.length)];
      hint = { type: "letter", key: l, text: "Add the letter: " + l.toUpperCase() };
    }
  } else if (chk.type === "rule") {
    const good = new Set(options.map((o) => o.extra));
    const bad = "abcdefghijklmnopqrstuvwxyz".split("").filter((l) => !good.has(l) && !given.includes(l));
    if (bad.length) {
      const picks = bad.sort(() => Math.random() - 0.5).slice(0, 3).sort();
      hint = { type: "rule", key: picks.join(""), text: "No word if you add: " + picks.map((l) => l.toUpperCase()).join(", ") };
      // remember them one by one so the next rule hint shows new letters
      for (const l of picks) game.hints.push({ type: "rule", key: l, text: "", hidden: true, at: now });
    }
  }
  if (!hint) { game.hintNote = { text: "Nothing more to reveal with that hint - try another type.", at: now }; broadcastState(); return; }
  game.hintsUsed += 1;
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

// The round clock: checked four times a second so the round ends right when the time is up.
setInterval(
  safely("round-clock", () => {
    if (game.status === "live" && game.roundEndsAt && Date.now() >= game.roundEndsAt) endRound("time");
  }),
  250
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

  // Only a word of exactly the NEXT length is looked at; the first one that uses the newest row's letters plus one new letter wins the row.
  const normalized = normalizeGuess(text);
  const top = topRow();
  if (game.status === "live" && game.mode !== "offline" && top && normalized.length === top.word.length + 1) {
    attemptGuess(normalized, username);
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
      Engagement.attach(connection, { game: "expandle", tiktokUsername: username });
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

      const top = topRow();
      if (game.status === "live" && top && roll < 0.35) {
        // a "smart viewer": a real word that grows the newest row (the chat is quick, but not instant)
        const options = nextWordsFor(top.word);
        text = options.length > 0 ? options[Math.floor(Math.random() * options.length)].word : FAKE_JUNK_WORDS[0];
      } else if (game.status === "live" && top && roll < 0.5) {
        // a near miss: right length, wrong letters
        const w = wordsOfLength(top.word.length + 1);
        text = w.length > 0 ? w[Math.floor(Math.random() * w.length)] : FAKE_JUNK_WORDS[0];
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

// `nsp` is the Socket.IO namespace "/expandle", created inside mountExpandle() below -
// broadcastState() and the namespace's "connection" handler both close over it.
let nsp = null;

function buildStatePayload() {
  const top = topRow();
  return {
    game: {
      mode: game.mode,
      status: game.status,
      roundSeconds: game.roundSeconds,
      roundEndsAt: game.status === "live" ? game.roundEndsAt : null,
      roundStartedAt: game.roundStartedAt,
      serverNow: Date.now(),
      endReason: game.endReason,
      // Every row of the round, in order (row 1 = the start word). The page shows the newest on top.
      guesses: game.guesses.map((g) => ({
        word: g.word, extra: g.extra, caller: g.caller, isStarter: Boolean(g.isStarter),
        avatarUrl: g.isStarter ? hostAvatarUrl : g.avatarUrl
      })),
      nextLength: top ? top.word.length + 1 : game.activeStartLength,
      startLength: game.startLength,
      maxLengthSetting: game.maxLength,
      difficulty: game.difficulty,
      minStartLength: MIN_START_LENGTH, maxStartLength: MAX_START_LENGTH, minMaxLength: MIN_MAX_LENGTH,
      lastGuess: game.lastGuess,
      lastEvent: game.lastEvent,
      guessesMade: game.guesses.filter((g) => !g.isStarter).length,
      winPoints: WORD_POINTS,
      roundNumber: game.roundNumber,
      streak: game.streak,
      hintsUsed: game.hintsUsed,
      hintSuggestions: game.hintSuggestions,
      hints: game.hints.filter((h) => !h.hidden),
      hintConfig: HC.publicHintInfo("expandle", game.hintsUsed, game.hintLastAt),
      hintNote: game.hintNote,
      lastRejection: game.lastRejection,
      starterWord: game.starterWord,
      colors: getColors(), // update 96: tile / frame / clock colors - the page AND the legend follow them
      lastWinInfo: game.lastWinInfo,
      autoContinue: game.autoContinue,
      autoContinueDelaySeconds: game.autoContinueDelaySeconds,
      leaderboardShowSeconds: game.leaderboardShowSeconds,
      rejectionToastSeconds: game.rejectionToastSeconds,
      autoContinueSecondsLeft: game.autoContinueAt ? Math.max(0, Math.ceil((game.autoContinueAt - Date.now()) / 1000)) : 0,
      maxLength: effectiveMax(),
      dictionaryMaxLength: MAX_WORD_LENGTH,
      // update 99: the shared Word length panel ("Next word - 5 letters"): the length the NEXT row needs
      wordLength: top ? top.word.length + 1 : game.activeStartLength,
      lengthMode: "fixed",
      lengthMin: game.activeStartLength,
      lengthMax: effectiveMax(),
      wordLanguage,
      wordLanguages: WL.languageOptionsForClient(),
      wordLanguageInfo: WL.describeLanguage(wordLanguage)
    },
    roundLeaderboard: getLeaderboard(game.roundScores),
    totalLeaderboard: getLeaderboard(game.totalScores),
    recentComments: game.recentComments.slice(0, 12),
    diagnostics: {
      ...diagnostics,
      dictionarySource: dictionaryState.source,
      dictionaryWordCount: dictionaryState.words.size,
      dictionaryLoading: dictionaryState.loading
    }
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
      HC.setHintConfig("expandle", payload);
      broadcastState();
      break;
    case "set_secret_word": {
      const result = setSecretWord(String((payload && payload.word) || ""));
      ws.emit("set_secret_word_result", result);
      break;
    }
    case "submit_offline_guess": {
      const word = normalizeGuess(String((payload && payload.word) || ""));
      let result;
      if (word.length < GUESS_MIN_LENGTH || word.length > MAX_WORD_LENGTH) {
        result = { ok: false, error: `A word has ${GUESS_MIN_LENGTH}-${MAX_WORD_LENGTH} letters.` };
      } else {
        result = attemptGuess(word, "Host");
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
    case "set_starter_word":
      game.starterWord = setStarterWord("expandle", Boolean(payload && payload.on));
      broadcastState();
      break;
    case "set_word_language": {
      const prevLanguage = wordLanguage;
      const nextLanguage = WL.setLanguage(WORD_GAME_ID, payload && payload.mode);
      if (nextLanguage !== prevLanguage) {
        applyWordLanguage(nextLanguage);
        if (game.status === "live") playAgain(); // the running round was built from the old language's words
      }
      broadcastState();
      break;
    }
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
//   import { mountExpandle } from "./server/expandle/expandle-server.js";
//   await mountExpandle(app, io, { mountPath: "/expandle" });
//
// `app` is the shared Express app, `io` the shared Socket.IO Server. EXPANDLE serves its own
// static folder at `mountPath` and talks to its page over the Socket.IO namespace "/expandle".
// Call once per process (a second call would start a second dictionary load and a second
// auto-continue timer against the same shared game state).
export async function mountExpandle(app, io, options = {}) {
  const mountPath = options.mountPath || "/expandle";

  app.use(mountPath, express.static(path.join(__dirname, "public")));
  app.get(mountPath, (req, res) => {
    res.sendFile(path.join(__dirname, "public", "expandle-index.html"));
  });

  nsp = io.of("/expandle");
  nsp.on(
    "connection",
    safely("expandle-connection", (socket) => {
      socket.emit("state", buildStatePayload());
      socket.on(
        "action",
        safely("expandle-action", (msg) => {
          if (!msg || typeof msg !== "object") return;
          handleClientAction(socket, msg);
        })
      );
    })
  );

  // Awaited so the real ~370,000-word dictionary is loaded before the server starts
  // accepting live chat guesses (otherwise correctly spelled guesses could be rejected
  // right after a fresh deploy).
  await loadDictionary();
  console.log(
    `[EXPANDLE] Mounted at ${mountPath} (Socket.IO namespace /expandle). ` +
      (diagnostics.signKeyConfigured
        ? "EulerStream signing key detected - TikTok connections are ready."
        : "No EULERSTREAM_API_KEY found - Test Mode will work, but live TikTok connections will not.")
  );

  return { mountPath };
}

// ============================================================
// Standalone mode
// ============================================================
// Lets you test this game entirely on its own (`node expandle-server.js`)
// without touching your platform's code at all. This block only runs
// when the file is EXECUTED DIRECTLY, never when it's imported by
// mountExpandle above - importing it (the normal merge path) never
// opens a port or starts listening on its own.
const isRunDirectly = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isRunDirectly) {
  const { Server } = await import("socket.io");
  const standaloneApp = express();
  const standaloneServer = http.createServer(standaloneApp);
  const standaloneIo = new Server(standaloneServer);
  await mountExpandle(standaloneApp, standaloneIo, { mountPath: "/" });
  const PORT = process.env.PORT || 3000;
  standaloneServer.listen(PORT, () => {
    console.log(`[EXPANDLE] Standalone test server listening on port ${PORT}`);
  });
}

// Update 42: the HOME page's shared TikTok connection links this game by itself - no need to open the game and press
// Connect. Uses the same actions the game's own buttons send (switch to Live, then connect), only when not linked yet.
PlatformHub.registerGame(
  "expandle",
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
