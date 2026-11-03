// boxdle-server.js
// BOXDLE - a BLINDLE sibling built on the word-hunt idea. Every round shows a GRID of letter tiles (6x6, 8x8, 10x10 or 12x12).
// The audience builds real words out of the grid by chaining tiles that TOUCH each other in every direction (up, down, left, right
// AND the four corners). The grid is the same for everybody; the round is a race against the clock.
//
// How the audience plays: just type a word in the TikTok chat. A word counts when
//   (1) it is a real word (checked against the same big dictionary the other word games use, in the languages the host picked),
//   (2) it can be traced on the grid through touching tiles - and, when "Tiles may be reused" is OFF (default), every tile is used
//       at most once per word. With the switch ON a tile may appear again later in the same word (never twice in a row, because a
//       tile does not touch itself),
//   (3) it is at least "Shortest word" letters long (4 by default) and
//   (4) nobody found it yet in this round (every word can be scored only once per round).
//
// Scoring: points = the number of letters of the word (3 letters = 3 points, 5 letters = 5 points, 10 letters = 10 points ...).
// Points go to the chat leaderboards in Live mode, exactly like the other games (Test / Offline show points but save nothing).
//
// The round lasts 60 seconds by default (host setting "Round time", 10 s to 1 hour). When the clock reaches zero the round ends,
// the viewer with the most points of the round is celebrated and - with auto-continue on - a fresh grid starts.
//
// The grid is built so it is always worth playing: a handful of real words are planted along random touching paths first and
// the remaining tiles are filled with letters that fit them, so the grid holds plenty of words (and a hint can point at one).
//
// Transport: own Socket.IO namespace "/boxdle" (like Minedle / Wordle ...). Mounts at /boxdle.

import "dotenv/config";
import express from "express";
import { registerGameSettings } from "../shared/game-settings-registry.js"; // lets the AFK Autopilot show and set this game's settings
import http from "http";
import path from "path";
import { fileURLToPath } from "url";
import { TikTokLiveConnection, WebcastEvent, SignConfig } from "tiktok-live-connector";
import { explainTikTokError } from "../shared/tiktok-errors.js";
import { ANSWER_WORDS as EN_ANSWER_WORDS } from "../blindle/blindle-answers.js";
import { Engagement } from "../engagement/engagement-hub.js";
import { resolveHostAvatar, adoptHostAvatar, isHostUser } from "../shared/host-avatar.js";
import { dictionaryState, loadDictionary } from "../blindle/blindle-dictionary.js";
import { getOption, setOption } from "../shared/game-options-store.js";
import * as WL from "../shared/word-language.js"; // word language (English / Indonesian / Malay / mixes)

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


// ---- SETTINGS RANGES ---------------------------------------------------------------------------------------------------
const GAME_ID = "boxdle";
const GRID_SIZES = [6, 8, 10, 12];
const DEFAULT_GRID_SIZE = 6;
const DEFAULT_ROUND_SECONDS = 60;   // one minute unless the host chooses another time
const MIN_ROUND_SECONDS = 10;
const MAX_ROUND_SECONDS = 3600;
const DEFAULT_MIN_WORD_LENGTH = 4;      // shortest word that counts (host can change it: 2-8)
const MIN_WORD_LENGTH_LIMIT = 2;
const MAX_WORD_LENGTH_LIMIT = 8;
const MAX_GUESS_LENGTH = 30;        // longest word the game even looks at (a longer chat message is ignored)

const DEFAULT_AUTO_CONTINUE_DELAY = 3;
const DEFAULT_LEADERBOARD_SHOW_SECONDS = 3;
const DEFAULT_REJECTION_TOAST_SECONDS = 4;
// The win celebration walks through 3 stages (winner, this-round leaderboard, all-time leaderboard), each shown for
// leaderboardShowSeconds. Auto-continue never cuts it short: the celebration time is added on top of the configured delay.
const CELEBRATION_STAGE_COUNT = 3;

function clampGridSize(n) {
  const v = Number(n);
  return GRID_SIZES.includes(v) ? v : DEFAULT_GRID_SIZE;
}
function clampRoundSeconds(n) {
  const v = Math.round(Number(n));
  if (!Number.isFinite(v)) return DEFAULT_ROUND_SECONDS;
  return Math.min(MAX_ROUND_SECONDS, Math.max(MIN_ROUND_SECONDS, v));
}
function clampMinWordLength(n) {
  const v = Math.round(Number(n));
  if (!Number.isFinite(v)) return DEFAULT_MIN_WORD_LENGTH;
  return Math.min(MAX_WORD_LENGTH_LIMIT, Math.max(MIN_WORD_LENGTH_LIMIT, v));
}
function asBool(v, fallback) {
  if (typeof v === "boolean") return v;
  if (v === "true" || v === 1 || v === "1") return true;
  if (v === "false" || v === 0 || v === "0") return false;
  return fallback;
}

// ---- WORD LANGUAGE -----------------------------------------------------------------------------------------------------
// The host picks the language(s) in the 🌏 popup. ANSWER_WORDS (the curated word bank) is what the grid is built from; the full
// dictionary of the chosen language(s) decides which chat words are real.
let wordLanguage = WL.getLanguage(GAME_ID);
let ANSWER_WORDS = WL.getBank(wordLanguage, EN_ANSWER_WORDS).answers;
let bankWordSet = new Set(Object.values(ANSWER_WORDS).flat());
function applyWordLanguage(mode) {
  const bank = WL.getBank(mode, EN_ANSWER_WORDS);
  wordLanguage = bank.mode;
  ANSWER_WORDS = bank.answers;
  bankWordSet = new Set(Object.values(ANSWER_WORDS).flat());
}
// A word is real when it is in the curated bank or in the big dictionary of the chosen language(s).
function isRealWord(word) {
  return bankWordSet.has(word) || WL.isValidGuess(wordLanguage, word);
}

// ---- THE GRID ----------------------------------------------------------------------------------------------------------
// Rough English letter frequencies - only used to flavour the filler letters.
const LETTER_FREQ = {
  a: 8.2, b: 1.5, c: 2.8, d: 4.3, e: 12.0, f: 2.2, g: 2.0, h: 6.1, i: 7.0, j: 0.4, k: 0.8, l: 4.0, m: 2.4,
  n: 6.7, o: 7.5, p: 1.9, q: 0.2, r: 6.0, s: 6.3, t: 9.1, u: 2.8, v: 1.0, w: 2.4, x: 0.3, y: 2.0, z: 0.3
};
const ALPHABET = "abcdefghijklmnopqrstuvwxyz".split("");

function pickWeighted(items, weightOf) {
  let total = 0;
  for (const it of items) total += weightOf(it);
  let r = Math.random() * total;
  for (const it of items) {
    r -= weightOf(it);
    if (r <= 0) return it;
  }
  return items[items.length - 1];
}
function shuffled(list) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Touching tiles of every cell: up, down, left, right AND the four corners (8 directions). Cached per grid size.
const neighbourCache = new Map();
function neighboursOf(size) {
  if (neighbourCache.has(size)) return neighbourCache.get(size);
  const out = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const list = [];
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          const rr = r + dr;
          const cc = c + dc;
          if (rr < 0 || cc < 0 || rr >= size || cc >= size) continue;
          list.push(rr * size + cc);
        }
      }
      out.push(list);
    }
  }
  neighbourCache.set(size, out);
  return out;
}

// Traces `word` on the grid through touching tiles. Returns the list of tile indexes (one per letter) or null.
//   allowReuse = false : every tile may be used only once in the word (classic word hunt)
//   allowReuse = true  : a tile may be used again later in the same word (never twice in a row - a tile does not touch itself)
function findPath(word, letters, size, allowReuse) {
  const n = word.length;
  const total = size * size;
  if (n === 0 || n > MAX_GUESS_LENGTH) return null;
  const nb = neighboursOf(size);
  const starts = [];
  for (let i = 0; i < total; i++) if (letters[i] === word[0]) starts.push(i);
  if (starts.length === 0) return null;
  const path = new Array(n);

  if (!allowReuse) {
    const used = new Uint8Array(total);
    let budget = 400000; // safety valve: a pathological grid can never freeze the server
    const dfs = (idx, cell) => {
      if (--budget < 0) return false;
      used[cell] = 1;
      path[idx] = cell;
      if (idx === n - 1) return true;
      const want = word[idx + 1];
      for (const nx of nb[cell]) {
        if (!used[nx] && letters[nx] === want && dfs(idx + 1, nx)) return true;
      }
      used[cell] = 0;
      return false;
    };
    for (const s of starts) if (dfs(0, s)) return path.slice();
    return null;
  }

  // reuse allowed: whether "letter idx at this tile" leads anywhere does not depend on the history, so failures are remembered
  const failed = new Uint8Array(n * total);
  const dfs = (idx, cell) => {
    path[idx] = cell;
    if (idx === n - 1) return true;
    const key = idx * total + cell;
    if (failed[key]) return false;
    const want = word[idx + 1];
    for (const nx of nb[cell]) if (letters[nx] === want && dfs(idx + 1, nx)) return true;
    failed[key] = 1;
    return false;
  };
  for (const s of starts) if (dfs(0, s)) return path.slice();
  return null;
}

// How long the planted words get on each grid size (the audience can build words of 15 or even 20 letters on the big grids).
function plantPlan(size) {
  return {
    maxLen: size <= 6 ? 10 : size <= 8 ? 13 : size <= 10 ? 16 : 20,
    longCount: size <= 6 ? 1 : size <= 8 ? 2 : size <= 10 ? 3 : 4
  };
}

// Builds the grid of a round. Real words are PLANTED first along random touching paths (they may cross and share tiles): first a few LONG
// words (up to 20 letters on a 12x12 grid), then shorter ones, so the board is guaranteed to hold words of every length - in both
// tile-reuse modes. Then the leftover tiles are filled with letters that fit, which makes many more words possible.
function buildBoard(size) {
  const total = size * size;
  const nb = neighboursOf(size);
  const cells = new Array(total).fill("");
  const { maxLen, longCount } = plantPlan(size);
  const lens = [];
  for (let L = 4; L <= maxLen; L++) if ((ANSWER_WORDS[L] || []).length > 0) lens.push(L);

  const planted = [];
  const seen = new Set();
  let filled = 0;
  const tryPath = (word) => {
    for (let tries = 0; tries < 30; tries++) {
      const start = Math.floor(Math.random() * total);
      if (cells[start] && cells[start] !== word[0]) continue;
      const used = new Set([start]);
      const path = [start];
      let budget = 500;
      const walk = (idx) => {
        if (idx === word.length) return true;
        if (--budget < 0) return false;
        const here = path[idx - 1];
        for (const nx of shuffled(nb[here])) {
          if (used.has(nx)) continue;
          if (cells[nx] && cells[nx] !== word[idx]) continue;
          used.add(nx);
          path.push(nx);
          if (walk(idx + 1)) return true;
          path.pop();
          used.delete(nx);
        }
        return false;
      };
      if (walk(1)) return path;
    }
    return null;
  };
  const plant = (L) => {
    const list = ANSWER_WORDS[L];
    if (!list || list.length === 0) return false;
    const word = list[Math.floor(Math.random() * list.length)];
    if (!word || seen.has(word) || !/^[a-z]+$/.test(word)) return false;
    const path = tryPath(word);
    if (!path) return false;
    for (let i = 0; i < path.length; i++) {
      if (!cells[path[i]]) {
        cells[path[i]] = word[i];
        filled++;
      }
    }
    seen.add(word);
    planted.push({ word, path });
    return true;
  };

  if (lens.length > 0) {
    // 1. the long words first (the grid is still empty, so they fit easily)
    const longLens = lens.filter((L) => L >= 9);
    for (let n = 0, att = 0; n < longCount && longLens.length > 0 && att < 60; att++) {
      if (plant(longLens[Math.floor(Math.random() * longLens.length)])) n++;
    }
    // 2. then short and medium words until the grid is mostly filled
    const shortLens = lens.filter((L) => L <= 8);
    const targetFilled = Math.round(total * 0.85);
    const maxPlanted = Math.round(total / 3);
    for (let attempts = 0; planted.length < maxPlanted && filled < targetFilled && attempts < 700 && shortLens.length > 0; attempts++) {
      plant(shortLens[Math.floor(Math.random() * shortLens.length)]);
    }
  }

  // filler letters: the letters the planted words used most are the likeliest, so the filler makes new words possible too
  const counts = {};
  for (const c of cells) if (c) counts[c] = (counts[c] || 0) + 1;
  const english = wordLanguage === "en";
  for (let i = 0; i < total; i++) {
    if (cells[i]) continue;
    cells[i] = pickWeighted(ALPHABET, (ch) => (counts[ch] || 0) + 0.25 + (english ? LETTER_FREQ[ch] * 0.12 : 0));
  }
  return { letters: cells, planted };
}

// ---- THE BOARD SOLVER --------------------------------------------------------------------------------------------------
// Finds the real words (3-20 letters, any word of the dictionary - not only the planted ones) that can be traced on a grid.
// It walks the grid and cuts every path as soon as no word starts with it (binary search in a sorted word list), with a time
// limit so a huge grid can never freeze the server. Used by Test Mode's chat bot, the hint, the "words possible" counter and the
// list of words nobody found.
let solverCache = { key: "", list: [] };
function solverList() {
  const hasEn = wordLanguage === "en" || wordLanguage.split("-").includes("en") || wordLanguage === "all";
  const key = wordLanguage + "|" + dictionaryState.wordCount + "|" + dictionaryState.source + "|" + bankWordSet.size;
  if (solverCache.key === key) return solverCache.list;
  const set = new Set();
  const ok = (w) => w.length >= 3 && w.length <= 20 && /^[a-z]+$/.test(w);
  for (const w of bankWordSet) if (ok(w)) set.add(w);
  if (hasEn) for (const w of dictionaryState.words) if (ok(w)) set.add(w);
  const list = [...set].sort();
  solverCache = { key, list };
  return list;
}

function solveBoard(letters, size, allowReuse, minLen, budgetMs) {
  const arr = solverList();
  const nb = neighboursOf(size);
  const total = size * size;
  const found = new Map();
  const used = new Uint8Array(total);
  const path = [];
  const t0 = Date.now();
  let nodes = 0;
  let stop = false;
  const lower = (s, lo) => {
    let a = lo;
    let b = arr.length;
    while (a < b) {
      const mid = (a + b) >> 1;
      if (arr[mid] < s) a = mid + 1;
      else b = mid;
    }
    return a;
  };
  const dfs = (cell, s, lo) => {
    if (stop) return;
    if ((++nodes & 511) === 0 && Date.now() - t0 > budgetMs) { stop = true; return; }
    const idx = lower(s, lo);
    if (idx >= arr.length || !arr[idx].startsWith(s)) return;
    if (s.length >= minLen && arr[idx] === s && !found.has(s)) found.set(s, path.slice());
    if (s.length >= 20) return;
    for (const nx of nb[cell]) {
      if (!allowReuse && used[nx]) continue;
      if (!allowReuse) used[nx] = 1;
      path.push(nx);
      dfs(nx, s + letters[nx], idx);
      path.pop();
      if (!allowReuse) used[nx] = 0;
    }
  };
  for (let c = 0; c < total && !stop; c++) {
    if (!allowReuse) used[c] = 1;
    path.push(c);
    dfs(c, letters[c], 0);
    path.pop();
    if (!allowReuse) used[c] = 0;
  }
  return [...found].map(([word, p]) => ({ word, path: p }));
}

// ---- COLORS (the host's choices, shared by every connected screen) -------------------------------------------------------
const COLOR_KEYS = ["page", "card", "cardBorder", "clockBox", "gridBox", "wordsBox", "tile", "tileInk", "ink", "accent", "navy"];
function sanitizeColors(raw) {
  const out = {};
  if (!raw || typeof raw !== "object") return out;
  for (const k of COLOR_KEYS) {
    const v = raw[k];
    if (typeof v === "string" && /^#[0-9a-fA-F]{6}$/.test(v)) out[k] = v.toLowerCase();
  }
  return out;
}

// ---- THE GAME STATE ----------------------------------------------------------------------------------------------------
const game = {
  mode: "test",
  status: "idle",          // idle | live | won | lost   (won = the round ended and somebody scored, lost = it ended with no word found)
  // host settings (saved on the server, restored after a restart)
  gridSize: clampGridSize(getOption(GAME_ID, "gridSize", DEFAULT_GRID_SIZE)),
  allowReuse: asBool(getOption(GAME_ID, "allowReuse", false), false), // false: every tile once per word   true: a tile may be reused
  roundSeconds: clampRoundSeconds(getOption(GAME_ID, "roundSeconds", DEFAULT_ROUND_SECONDS)),
  minWordLength: clampMinWordLength(getOption(GAME_ID, "minWordLen4", DEFAULT_MIN_WORD_LENGTH)),
  // the board of the running round
  boardSize: 0,
  letters: [],
  planted: [],             // [{ word, path }] words planted when the grid was built
  solutions: [],           // [{ word, path }] every word the solver found on this grid (hints, Test Mode bot, words nobody found)
  colors: sanitizeColors(getOption(GAME_ID, "colors", {})), // the host's color choices (shared by every screen)
  found: [],               // [{ word, caller, points, path, avatarUrl, at }] in the order they were found
  foundMap: new Map(),     // word -> the found entry
  lastToast: null,         // { kind: "ok" | "bad", text, at } - the floating window
  hint: null,              // { word, cell, length, letter, at }
  hintsUsed: 0,
  hintNote: null,
  roundNumber: 0,
  roundStartedAt: null,
  roundEndsAt: null,       // epoch ms - when the clock reaches zero
  endReason: null,
  lastWinInfo: null,       // { username, points, roundPoints, word, words, ... } - the top scorer of the round
  recentComments: [],
  roundScores: new Map(),
  totalScores: new Map(),
  autoContinue: true,
  autoContinueDelaySeconds: DEFAULT_AUTO_CONTINUE_DELAY,
  autoContinueAt: null,
  leaderboardShowSeconds: DEFAULT_LEADERBOARD_SHOW_SECONDS,
  rejectionToastSeconds: DEFAULT_REJECTION_TOAST_SECONDS
};

function awardPoints(caller, points) {
  if (game.mode !== "live" || !caller || !(points > 0)) return;
  game.roundScores.set(caller, (game.roundScores.get(caller) || 0) + points);
  game.totalScores.set(caller, (game.totalScores.get(caller) || 0) + points);
}

function toast(kind, text) {
  game.lastToast = { kind, text, at: Date.now() };
}

// One guess (a chat word or the host's own word). Returns { ok, error?, kind?, points? }.
// opts.fromChat: chat words that are not real words / too short are skipped silently (random chat must not flood the screen).
function attemptGuess(word, caller, opts = {}) {
  if (game.status !== "live") return { ok: false, error: "No round in progress.", kind: "idle" };

  if (word.length < game.minWordLength) {
    return { ok: false, error: `Words need at least ${game.minWordLength} letters.`, kind: "short" };
  }

  const already = game.foundMap.get(word);
  if (already) {
    const error = `Already found by ${already.caller}.`;
    if (isRealWord(word) || !opts.fromChat) toast("bad", `✗ ${word.toUpperCase()} — ${error}`);
    return { ok: false, error, kind: "dup" };
  }

  if (!isRealWord(word)) {
    const error = "That's not a real word.";
    if (!opts.fromChat) toast("bad", `✗ ${word.toUpperCase()} — ${error}`);
    return { ok: false, error, kind: "notword" };
  }

  const path = findPath(word, game.letters, game.boardSize, game.allowReuse);
  if (!path) {
    const error = game.allowReuse
      ? "Can't be traced through touching tiles."
      : "Can't be traced through touching tiles (each tile only once).";
    toast("bad", `✗ ${word.toUpperCase()} — ${error}`);
    return { ok: false, error, kind: "offgrid" };
  }

  const points = word.length; // points = number of letters
  const entry = { word, caller, points, path, avatarUrl: knownAvatars.get(caller) || null, at: Date.now() };
  game.found.push(entry);
  game.foundMap.set(word, entry);
  awardPoints(caller, points);
  if (game.hint && game.hint.word === word) game.hint = null;
  toast("ok", `✓ ${word.toUpperCase()} +${points} — ${caller}`);
  return { ok: true, points };
}

// The round is over: time is up or the host ended it. The viewer with the most points of the round is the round's winner
// (ties go to whoever reached that score first).
function endRound(reason) {
  if (game.status !== "live") return;
  game.roundEndsAt = null;
  game.endReason = reason;
  game.hint = null;

  if (game.found.length > 0) {
    const pts = new Map();
    const reachedAt = new Map();
    for (const f of game.found) {
      pts.set(f.caller, (pts.get(f.caller) || 0) + f.points);
      reachedAt.set(f.caller, f.at);
    }
    let top = null;
    for (const [name, p] of pts) {
      if (!top || p > top.p || (p === top.p && reachedAt.get(name) < top.at)) top = { name, p, at: reachedAt.get(name) };
    }
    const mine = game.found.filter((f) => f.caller === top.name);
    const longest = mine.reduce((a, b) => (b.word.length > a.word.length ? b : a), mine[0]);
    game.status = "won";
    game.lastWinInfo = {
      username: top.name,
      points: game.mode === "live" ? top.p : null,
      roundPoints: top.p,
      word: longest.word,
      words: mine.length,
      totalWords: game.found.length,
      avatarUrl: knownAvatars.get(top.name) || longest.avatarUrl || null
    };
    const celebrationSeconds = game.leaderboardShowSeconds * CELEBRATION_STAGE_COUNT;
    if (game.autoContinue) game.autoContinueAt = Date.now() + (celebrationSeconds + game.autoContinueDelaySeconds) * 1000;
  } else {
    game.status = "lost";
    game.lastWinInfo = null;
    if (game.autoContinue) game.autoContinueAt = Date.now() + game.autoContinueDelaySeconds * 1000;
  }
  broadcastState();
}

function startRound() {
  game.gridSize = clampGridSize(game.gridSize);
  game.roundSeconds = clampRoundSeconds(game.roundSeconds);
  game.minWordLength = clampMinWordLength(game.minWordLength);
  game.allowReuse = asBool(game.allowReuse, false);

  const board = buildBoard(game.gridSize);
  game.boardSize = game.gridSize;
  game.letters = board.letters;
  game.planted = board.planted;
  game.solutions = [];
  try {
    game.solutions = solveBoard(board.letters, game.gridSize, game.allowReuse, game.minWordLength, 250);
  } catch (err) {
    console.error("[BOXDLE] solver error:", err);
  }
  // words planted on purpose are always possible, even if the time limit cut the solver short
  for (const p of board.planted) if (p.word.length >= game.minWordLength && !game.solutions.some((x) => x.word === p.word)) game.solutions.push(p);
  game.found = [];
  game.foundMap = new Map();
  game.lastToast = null;
  game.hint = null;
  game.hintsUsed = 0;
  game.hintNote = null;
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
  if (["live", "test", "offline"].includes(mode)) {
    if (mode !== "live" && game.mode === "live") stopEverything();
    game.mode = mode;
    if (mode !== "live") {
      diagnostics.connectionStatus = mode === "test" ? "test_mode" : "idle";
      diagnostics.lastErrorMessage = null;
    }
  }
  if (settings.gridSize !== undefined) game.gridSize = setOption(GAME_ID, "gridSize", clampGridSize(settings.gridSize));
  if (settings.allowReuse !== undefined) game.allowReuse = setOption(GAME_ID, "allowReuse", asBool(settings.allowReuse, game.allowReuse));
  if (settings.roundSeconds !== undefined) game.roundSeconds = setOption(GAME_ID, "roundSeconds", clampRoundSeconds(settings.roundSeconds));
  if (settings.minWordLength !== undefined) game.minWordLength = setOption(GAME_ID, "minWordLen4", clampMinWordLength(settings.minWordLength));
  if (typeof settings.autoContinue === "boolean") game.autoContinue = settings.autoContinue;
  if (settings.autoContinueDelaySeconds !== undefined) {
    const v = Number(settings.autoContinueDelaySeconds);
    game.autoContinueDelaySeconds = Number.isFinite(v) ? Math.min(120, Math.max(3, Math.round(v))) : DEFAULT_AUTO_CONTINUE_DELAY;
  }
  startRound();
}

function playAgain() {
  startRound();
}

// "End round now": the clock stops and the round is scored like a normal finish.
function giveUp() {
  if (game.status !== "live") return;
  endRound("host");
}

function endGame() {
  game.status = "idle";
  game.letters = [];
  game.planted = [];
  game.solutions = [];
  game.found = [];
  game.foundMap = new Map();
  game.boardSize = 0;
  game.hint = null;
  game.roundEndsAt = null;
  game.autoContinueAt = null;
  game.lastWinInfo = null;
  broadcastState();
}

// Hint: points at ONE tile where a hidden word starts and tells its length (never the word itself). Unlimited.
function useHint() {
  if (game.status !== "live") return;
  const now = Date.now();
  const open = (game.solutions.length ? game.solutions : game.planted).filter((p) => !game.foundMap.has(p.word) && p.word.length >= game.minWordLength);
  if (open.length === 0) {
    game.hintNote = { text: "No more hint words - look for your own!", at: now };
    broadcastState();
    return;
  }
  const pick = open[Math.floor(Math.random() * open.length)];
  game.hint = { word: pick.word, cell: pick.path[0], length: pick.word.length, letter: pick.word[0], at: now };
  game.hintsUsed += 1;
  game.hintNote = null;
  broadcastState();
}

function getLeaderboard(map) {
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([username, score]) => ({ username, score, avatarUrl: knownAvatars.get(username) || null }));
}

// auto-continue: a new round starts by itself after the celebration + delay
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

  // BOXDLE: a chat message counts as a guess only when it is ONE word (no spaces) made of letters.
  const trimmed = String(text || "").trim();
  if (game.status === "live" && game.mode !== "offline" && /^[\p{L}]+$/u.test(trimmed)) {
    const normalized = normalizeGuess(trimmed);
    if (normalized.length >= game.minWordLength && normalized.length <= MAX_GUESS_LENGTH) {
      attemptGuess(normalized, username, { fromChat: true });
    }
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
      Engagement.attach(connection, { game: "boxdle", tiktokUsername: username });
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
const FAKE_OFF_GRID_WORDS = ["quiz", "jazz", "waltz", "zephyr", "oxygen", "banjo", "fjord"];

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

      // The Test Mode bot really plays: it answers with words that are on the grid (found by the solver, long ones too),
      // now and then repeats a word or tries a word that is not on the grid, plus some normal chat chatter.
      const unfound = game.solutions.filter((p) => !game.foundMap.has(p.word) && p.word.length >= game.minWordLength);
      if (game.status === "live" && unfound.length > 0 && roll < 0.55) {
        let pick;
        if (Math.random() < 0.3) {
          pick = unfound.reduce((a, b) => (b.word.length > a.word.length ? b : a), unfound[0]); // sometimes the longest word left
        } else {
          pick = unfound[Math.floor(Math.random() * unfound.length)];
        }
        text = pick.word;
      } else if (game.status === "live" && game.found.length > 0 && roll < 0.62) {
        text = game.found[Math.floor(Math.random() * game.found.length)].word; // somebody repeats a word (skipped)
      } else if (game.status === "live" && roll < 0.68) {
        text = FAKE_OFF_GRID_WORDS[Math.floor(Math.random() * FAKE_OFF_GRID_WORDS.length)]; // a real word that is not on this grid
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
    700
  );
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// `nsp` is the Socket.IO namespace "/boxdle", created inside mountBoxdle() below -
// broadcastState() and the namespace's "connection" handler both close over it.
let nsp = null;
let testAutoStarted = false;

function buildStatePayload() {
  const idle = game.status === "idle";
  const ended = game.status === "won" || game.status === "lost";
  const totalPoints = game.found.reduce((s, f) => s + f.points, 0);
  const players = new Set(game.found.map((f) => f.caller));
  return {
    game: {
      mode: game.mode,
      status: game.status,
      gridSize: game.gridSize,
      boardSize: idle ? 0 : game.boardSize,
      letters: idle ? [] : game.letters,
      allowReuse: game.allowReuse,
      minWordLength: game.minWordLength,
      roundSeconds: game.roundSeconds,
      roundEndsAt: game.status === "live" ? game.roundEndsAt : null,
      serverNow: Date.now(),
      endReason: game.endReason,
      // every valid word found this round (the board of guessed words): word, who, points and the tiles it runs through
      found: game.found.slice(-300).map((f) => ({
        word: f.word,
        caller: f.caller,
        points: f.points,
        path: f.path,
        avatarUrl: knownAvatars.get(f.caller) || f.avatarUrl || null,
        at: f.at
      })),
      foundCount: game.found.length,
      totalPoints,
      playerCount: players.size,
      // after the round: words that were hiding on the board and nobody found
      missed: ended ? game.solutions.filter((p) => !game.foundMap.has(p.word)).sort((a, b) => b.word.length - a.word.length).map((p) => p.word).slice(0, 14) : [],
      possibleCount: idle ? 0 : game.solutions.length,
      colors: game.colors,
      lastToast: game.lastToast,
      hint: game.status === "live" && game.hint ? { cell: game.hint.cell, length: game.hint.length, letter: game.hint.letter, at: game.hint.at } : null,
      hintNote: game.hintNote,
      hintsUsed: game.hintsUsed,
      wordLanguage,
      wordLanguages: WL.languageOptionsForClient(),
      wordLanguageInfo: WL.describeLanguage(wordLanguage),
      lastWinInfo: game.lastWinInfo,
      autoContinue: game.autoContinue,
      autoContinueDelaySeconds: game.autoContinueDelaySeconds,
      leaderboardShowSeconds: game.leaderboardShowSeconds,
      rejectionToastSeconds: game.rejectionToastSeconds,
      autoContinueSecondsLeft: game.autoContinueAt ? Math.max(0, Math.ceil((game.autoContinueAt - Date.now()) / 1000)) : 0,
      roundNumber: game.roundNumber,
      gridSizes: GRID_SIZES,
      minRoundSeconds: MIN_ROUND_SECONDS,
      maxRoundSeconds: MAX_ROUND_SECONDS
    },
    roundLeaderboard: getLeaderboard(game.roundScores),
    totalLeaderboard: getLeaderboard(game.totalScores),
    recentComments: game.recentComments.slice(0, 12),
    diagnostics: {
      ...diagnostics,
      dictionarySource: dictionaryState.source,
      dictionaryWordCount: dictionaryState.wordCount,
      dictionaryLoading: dictionaryState.loading
    }
  };
}

let broadcastPending = false;
function broadcastState(lightweight = false) {
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
        // Stay connected if we already were - only stop the Test Mode simulator (if it happened to still be running).
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
      useHint();
      break;
    case "submit_offline_guess": {
      const word = normalizeGuess(String((payload && payload.word) || ""));
      let result;
      if (!word) {
        result = { ok: false, error: "Type a word first." };
      } else if (word.length > MAX_GUESS_LENGTH) {
        result = { ok: false, error: "That word is too long." };
      } else {
        result = attemptGuess(word, "Host");
        broadcastState();
      }
      ws.emit("offline_guess_result", result);
      break;
    }
    case "set_word_language": {
      const prevLanguage = wordLanguage;
      const nextLanguage = WL.setLanguage(GAME_ID, payload && payload.mode);
      if (nextLanguage !== prevLanguage) {
        applyWordLanguage(nextLanguage);
        if (game.status === "live") playAgain(); // the running board was built from the old language
      }
      broadcastState();
      break;
    }
    case "set_colors":
      game.colors = setOption(GAME_ID, "colors", sanitizeColors(payload && payload.colors));
      broadcastState(true);
      break;
    case "reset_colors":
      game.colors = setOption(GAME_ID, "colors", {});
      broadcastState(true);
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
//   import { mountBoxdle } from "./server/boxdle/boxdle-server.js";
//   await mountBoxdle(app, io, { mountPath: "/boxdle" });
//
// `app` is the shared Express app, `io` the shared Socket.IO Server. BOXDLE serves its own
// static folder at `mountPath` and talks to its page over the Socket.IO namespace "/boxdle".
// Call once per process (a second call would start a second dictionary load and a second
// auto-continue timer against the same shared game state).
export async function mountBoxdle(app, io, options = {}) {
  const mountPath = options.mountPath || "/boxdle";

  app.use(mountPath, express.static(path.join(__dirname, "public")));
  app.get(mountPath, (req, res) => {
    res.sendFile(path.join(__dirname, "public", "boxdle-index.html"));
  });

  nsp = io.of("/boxdle");
  nsp.on(
    "connection",
    safely("boxdle-connection", (socket) => {
      // Test Mode plays by itself: the first time a screen opens the game while nothing is running, a round starts and the chat bot joins in.
      if (!testAutoStarted && game.status === "idle" && game.mode === "test") {
        testAutoStarted = true;
        startRound();
        startTestMode();
      }
      socket.emit("state", buildStatePayload());
      socket.on(
        "action",
        safely("boxdle-action", (msg) => {
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
    `[BOXDLE] Mounted at ${mountPath} (Socket.IO namespace /boxdle). ` +
      (diagnostics.signKeyConfigured
        ? "EulerStream signing key detected - TikTok connections are ready."
        : "No EULERSTREAM_API_KEY found - Test Mode will work, but live TikTok connections will not.")
  );

  return { mountPath };
}

// ============================================================
// Standalone mode
// ============================================================
// Lets you test this game entirely on its own (`node boxdle-server.js`)
// without touching your platform's code at all. This block only runs
// when the file is EXECUTED DIRECTLY, never when it's imported by
// mountBoxdle above - importing it (the normal merge path) never
// opens a port or starts listening on its own.
const isRunDirectly = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isRunDirectly) {
  const { Server } = await import("socket.io");
  const standaloneApp = express();
  const standaloneServer = http.createServer(standaloneApp);
  const standaloneIo = new Server(standaloneServer);
  await mountBoxdle(standaloneApp, standaloneIo, { mountPath: "/" });
  const PORT = process.env.PORT || 3000;
  standaloneServer.listen(PORT, () => {
    console.log(`[BOXDLE] Standalone test server listening on port ${PORT}`);
  });
}

// Update 42: the HOME page's shared TikTok connection links this game by itself - no need to open the game and press
// Connect. Uses the same actions the game's own buttons send (switch to Live, then connect), only when not linked yet.
PlatformHub.registerGame(
  "boxdle",
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

// update 113: the AFK Autopilot reads this game's live settings (difficulty, length, pause ...) to show them in its "Game settings"
registerGameSettings("boxdle", () => game);
