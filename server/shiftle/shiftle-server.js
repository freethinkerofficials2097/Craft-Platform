// shiftle-server.js
// SHIFTLE - a BLINDLE sibling built on the SHUFFL-O idea. After every guess each letter turns WHITE, PINK or BLUE,
// and the meaning of those three colors is SHUFFLED at the start of every round:
//     one color = the letter is in the CORRECT spot
//     one color = the letter is in the word but in the WRONG spot
//     one color = the letter is NOT in the word
// (e.g. this round blue may mean "correct spot", pink "not in the word" and white "wrong spot"; the next round
// the three meanings are dealt to the colors again.) The audience uses the shifting colors to uncover the word.
// Every tile stands alone (a uniform rounded square).
// Everything else follows BLINDLE: unlimited guesses for the whole chat, an automatic starter
// word opens each round, unlimited hints, Live / Test / Offline modes, host-set secret word,
// difficulty tiers, win celebration + leaderboards.
//
// Guess rule: like BLINDLE, "Strict fit" is ON by default - a guess must still fit the colors of every guess
// already on the board (the host can switch that off in Settings to accept any real, not-yet-guessed word).
//
// Differences from BLINDLE:
//   - the clue is one of three colors per LETTER (not three color counts) - no number columns
//   - the colors' meanings are shuffled every round (a new random deal that always differs from the previous round)
//   - the on-screen alphabet is NOT a manual scratchpad: every key colors itself with the SAME color its letter
//     earned on the tiles (best clue wins: correct spot > wrong spot > not in the word)
//   - the colors are explained by a legend placed under the floating message window (the legend can tell the
//     audience this round's meanings, or hide them so chat has to deduce them - host setting)
//   - scoring: 1 point for every guess that fits the board, 5 points for solving the round
//
// Transport: like ORACLE / COLORBLINDLE / TEXTLE it runs on its own Socket.IO namespace "/shiftle"
// (NOT a raw WebSocket path), so it can never collide with BLINDLE's WebSocketServer. Mounts at /shiftle.

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
import { getStrictFit, setStrictFit } from "../shared/strict-fit-store.js";
import * as HC from "../shared/hint-config-store.js"; // update 58: three hint types + host hint settings
import * as WH from "../shared/word-hints.js";
import { getStarterWord, setStarterWord } from "../shared/starter-word-store.js";
import { getKeyAutoColor, setKeyAutoColor } from "../shared/key-autocolor-store.js";
import { getLegendShow, setLegendShow, getLegendReveal, setLegendReveal } from "../shared/shiftle-settings-store.js";
import { dictionaryState, loadDictionary } from "../blindle/blindle-dictionary.js";
import { buildDifficultyIndex } from "../blindle/blindle-difficulty.js";
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

// Clue MEANINGS per letter position (the real, round-independent answer):
//   0 = the letter is in the right spot
//   1 = the letter is in the word, but in another spot
//   2 = the letter is not in the word (or all its copies are already used up)
// Standard two-pass duplicate-letter handling, so a guess with two E's against a word with one E only
// marks one of them.
function scoreShift(guess, answer) {
  const n = answer.length;
  const out = new Array(n).fill(2);
  const left = {};
  for (let i = 0; i < n; i++) {
    if (guess[i] === answer[i]) out[i] = 0;
    else left[answer[i]] = (left[answer[i]] || 0) + 1;
  }
  for (let i = 0; i < n; i++) {
    if (out[i] === 0) continue;
    const ch = guess[i];
    if (left[ch] > 0) { out[i] = 1; left[ch] -= 1; }
  }
  return out;
}

function cluesEqual(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

// ---- THE SHIFT: which color wears which meaning this round ----
// Color indexes shown on screen: 0 = white, 1 = pink, 2 = blue.
// game.palette[meaning] = the color index that meaning wears this round.
const COLOR_NAMES = ["white", "pink", "blue"];
const MEANING_NAMES = ["correct spot", "wrong spot", "not in the word"];

function shufflePalette(previous) {
  const perms = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]];
  const pool = previous ? perms.filter((p) => !cluesEqual(p, previous)) : perms; // a new deal every round
  return pool[Math.floor(Math.random() * pool.length)].slice();
}

// What the audience sees: the meaning codes turned into color indexes of THIS round.
function toColors(meanings) {
  return meanings.map((m) => game.palette[m]);
}
function formatClue(meanings) {
  return toColors(meanings).map((c) => COLOR_NAMES[c]).join(" ");
}

// ---- WORD LANGUAGE (update 48) -------------------------------------------------------------
// The host picks the word language in Settings (English / Indonesian / Bahasa Melayu / 4 mixes).
// ANSWER_WORDS, MAX_WORD_LENGTH and the difficulty index follow that choice.
const WORD_GAME_ID = "shiftle";
let wordLanguage = WL.getLanguage(WORD_GAME_ID);
let ANSWER_WORDS = WL.getBank(wordLanguage, EN_ANSWER_WORDS).answers;
let MAX_WORD_LENGTH = WL.getBank(wordLanguage, EN_ANSWER_WORDS).maxLength;
let difficultyIndex = buildDifficultyIndex(ANSWER_WORDS);
const getWordsForDifficulty = WL.getWordsForDifficulty;
function isValidGuessWord(word) {
  return WL.isValidGuess(wordLanguage, word);
}
function applyWordLanguage(mode) {
  const bank = WL.getBank(mode, EN_ANSWER_WORDS);
  wordLanguage = bank.mode;
  ANSWER_WORDS = bank.answers;
  MAX_WORD_LENGTH = bank.maxLength;
  difficultyIndex = buildDifficultyIndex(ANSWER_WORDS);
  game.usedWords.clear();
  game.wordLength = clampWordLength(game.wordLength);
  if (game.lengthMin !== undefined) game.lengthMin = clampWordLength(game.lengthMin);
  if (game.lengthMax !== undefined) game.lengthMax = clampWordLength(game.lengthMax);
}

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

// Points: 1 for every guess that fits the board, 5 for solving the round.
const WIN_POINTS = 5;
const GUESS_POINTS = 1;

const game = {
  mode: "test",
  status: "idle",
  wordLength: 5,
  difficulty: "random",
  // "fixed" plays game.wordLength every round (as before); "random"
  // picks a new random length inside [lengthMin, lengthMax] (still
  // filtered by `difficulty`) at the start of every round.
  lengthMode: "fixed",
  lengthMin: 4,
  lengthMax: 8,
  secretWord: null,
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
  // true (default): BLINDLE's rule - the guess must also fit the colors of every guess already on the board.
  // false (host's choice in Settings): any real, not-yet-guessed word is accepted.
  strictFit: getStrictFit("shiftle"),
  // true (default): every round opens with one automatic, never-winning starter word.
  // The host can switch it off in Settings (remembered in data/starter-word.json).
  starterWord: getStarterWord("shiftle"),
  // true (default): the on-screen keyboard colors itself from the tiles. Host can switch it off.
  keyAutoColor: getKeyAutoColor("shiftle"),
  // SHIFTLE: palette[meaning] = color index (0 white / 1 pink / 2 blue) that meaning wears this round; re-dealt every round.
  palette: [0, 1, 2],
  // Legend choices (remembered in data/shiftle-settings.json).
  legendShow: getLegendShow(),
  legendReveal: getLegendReveal(),
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

function clampWordLength(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return 5;
  return Math.min(MAX_WORD_LENGTH, Math.max(MIN_WORD_LENGTH, Math.round(v)));
}

function randomWordLengthInRange() {
  const lo = clampWordLength(game.lengthMin);
  const hi = Math.max(lo, clampWordLength(game.lengthMax));
  return lo + Math.floor(Math.random() * (hi - lo + 1));
}

function pickAnswer(wordLength, difficulty) {
  const candidates = getWordsForDifficulty(ANSWER_WORDS, difficultyIndex, wordLength, difficulty);
  const unused = candidates.filter((w) => !game.usedWords.has(w));
  const list = unused.length > 0 ? unused : candidates;
  if (unused.length === 0) game.usedWords.clear();
  const pick = list[Math.floor(Math.random() * list.length)];
  game.usedWords.add(pick);
  return pick;
}

function awardPoints(caller, points) {
  if (game.mode !== "live" || !caller) return;
  game.roundScores.set(caller, (game.roundScores.get(caller) || 0) + points);
  game.totalScores.set(caller, (game.totalScores.get(caller) || 0) + points);
}

// SHIFTLE strict-fit rule (update 81, ORACLE style).
// The audience is not told which color wears which meaning this round (and different viewers hold different
// theories), so a guess is NOT required to line up with this round's real deal. For EACH earlier guess it only has
// to be possible that the shown colors come from SOME arrangement of the three meanings over the three colors
// (3 colors x 3 meanings = 6 arrangements). The arrangement may differ from clue to clue. The real secret word
// always passes (its true arrangement fits every clue) and accepting / rejecting reveals nothing about the real deal.
const ALL_PALETTES = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]];

// Would `word`, scored against this earlier guess, give the colors that are on the board - under ANY arrangement?
function fitsClueUnderSomePalette(word, past) {
  const hypothetical = scoreShift(past.word, word); // meanings, if `word` were the secret
  const shown = toColors(past.clue);                // colors the audience actually sees for that guess
  return ALL_PALETTES.some((pal) => hypothetical.every((m, i) => pal[m] === shown[i]));
}

function checkConsistency(word) {
  for (let i = 0; i < game.guesses.length; i++) {
    const past = game.guesses[i];
    if (!fitsClueUnderSomePalette(word, past)) {
      return { ok: false, conflictIndex: i, conflictWord: past.word, conflictClue: past.clue };
    }
  }
  return { ok: true };
}

// Exact check (uses this round's real deal) - only for hints, so a suggested word is a genuine candidate.
function fitsRealClues(word) {
  return game.guesses.every((past) => cluesEqual(scoreShift(past.word, word), past.clue));
}

function processGuess(word, caller) {
  const clue = scoreShift(word, game.secretWord);
  const avatarUrl = knownAvatars.get(caller) || null;
  game.guesses.push({ word, clue, caller, avatarUrl });

  if (word === game.secretWord) {
    // Solving the round is worth WIN_POINTS (5) instead of the 1 point a plain valid guess earns.
    const points = game.mode === "live" ? WIN_POINTS : null;
    awardPoints(caller, WIN_POINTS);
    game.status = "won";
    game.streak += 1;
    game.lastWinInfo = { username: caller, points, word, avatarUrl };
  } else {
    awardPoints(caller, GUESS_POINTS);
  }

  if (game.status === "won" && game.autoContinue) {
    // Wait out the full win celebration (winner → this round's leaderboard
    // → all-time leaderboard, each shown for leaderboardShowSeconds) before
    // even starting the configured auto-continue delay, so a new round
    // never interrupts the all-time leaderboard window mid-display.
    const celebrationSeconds = game.leaderboardShowSeconds * CELEBRATION_STAGE_COUNT;
    game.autoContinueAt = Date.now() + (celebrationSeconds + game.autoContinueDelaySeconds) * 1000;
  }
}

function attemptGuess(word, caller) {
  if (game.status !== "live") return { ok: false, error: "No round in progress." };

  // A word already on the board is never accepted twice (otherwise one viewer could farm the
  // 1-point-per-guess reward by repeating a word). Silent for chat; offline shows the message.
  if (game.guesses.some((g) => g.word === word)) {
    return { ok: false, error: "That word is already on the board.", duplicate: true };
  }

  const consistency = game.strictFit ? checkConsistency(word) : { ok: true };
  if (!consistency.ok) {
    const reason = `Doesn't fit the colors of guess #${consistency.conflictIndex + 1} (${consistency.conflictWord.toUpperCase()}: ${formatClue(consistency.conflictClue)}) under any color meaning`;
    game.lastRejection = { word, reason, at: Date.now() };
    return { ok: false, error: reason, rejected: true };
  }

  processGuess(word, caller);
  return { ok: true };
}

// A round used to open on a totally blank board, so the very first
// audience guess had zero information to reason from. Every round now
// opens with one random, automatically-played guess before any audience
// guessing happens - never the secret word itself, and never worth
// points to anyone - so its per-letter colors give viewers an
// immediate starting clue instead of a cold guess.
const STARTER_GUESS_LABEL = "🎲 Starter word";

function pickStarterWord(wordLength) {
  const pool = getWordsForDifficulty(ANSWER_WORDS, difficultyIndex, wordLength, "random")
    .filter((w) => w !== game.secretWord);
  if (pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}

function seedStarterGuess() {
  if (!game.starterWord) return;
  const starter = pickStarterWord(game.wordLength);
  if (!starter) return; // nothing eligible at this length - round still starts fine, just blank
  const clue = scoreShift(starter, game.secretWord);
  game.guesses.push({ word: starter, clue, caller: STARTER_GUESS_LABEL, avatarUrl: null, isStarter: true });
}

function startRound(overrideWord) {
  if (!overrideWord && game.lengthMode === "random") {
    game.wordLength = randomWordLengthInRange();
  }
  game.secretWord = overrideWord || pickAnswer(game.wordLength, game.difficulty);
  game.palette = shufflePalette(game.roundNumber > 0 ? game.palette : null); // the colors' meanings shift every round
  game.guesses = [];
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

function validateWord(raw, wordLength) {
  const word = normalizeGuess(raw);
  if (!word) return null;
  if (word.length !== wordLength) return null;
  return word;
}

function applySettings(settings) {
  const mode = settings.mode;
  const wordLength = settings.wordLength;
  const difficulty = settings.difficulty;
  const lengthMode = settings.lengthMode;
  const lengthMin = settings.lengthMin;
  const lengthMax = settings.lengthMax;
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
  if (wordLength !== undefined) game.wordLength = clampWordLength(wordLength);
  if (["normal", "medium", "hard", "random"].includes(difficulty)) game.difficulty = difficulty;
  if (["fixed", "random"].includes(lengthMode)) game.lengthMode = lengthMode;
  if (lengthMin !== undefined || lengthMax !== undefined) {
    let lo = clampWordLength(lengthMin !== undefined ? lengthMin : game.lengthMin);
    let hi = clampWordLength(lengthMax !== undefined ? lengthMax : game.lengthMax);
    if (lo > hi) [lo, hi] = [hi, lo]; // never let the range invert
    game.lengthMin = lo;
    game.lengthMax = hi;
  }
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
  const validated = validateWord(rawWord, game.wordLength);
  if (!validated) {
    return { ok: false, error: `Must be exactly ${game.wordLength} letters, A-Z only.` };
  }
  startRound(validated);
  return { ok: true };
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
  game.guesses = [];
  game.autoContinueAt = null;
  broadcastState();
}

// Hint: suggests a word that BEST FITS the colors on the board so far (it matches as many of the
// per-letter clues as possible) - never the answer itself, never a word already on the board and
// never the same hint twice. Picked at random among the few best fits so repeated hints vary.
function suggestHint() {
  if (game.status !== "live") return;

  let candidates = getWordsForDifficulty(ANSWER_WORDS, difficultyIndex, game.wordLength, game.difficulty);
  if (candidates.length === 0) candidates = ANSWER_WORDS[game.wordLength] || [];
  const onBoard = new Set(game.guesses.map((g) => g.word));
  candidates = candidates.filter(
    (w) => w !== game.secretWord && !onBoard.has(w) && !game.hintSuggestions.includes(w)
  );
  if (candidates.length === 0) return;

  // Words that fit every clue under this round's real deal are always accepted by Strict fit, so they come first.
  const exact = candidates.filter(fitsRealClues);
  if (exact.length > 0) candidates = exact;
  const scored = candidates.map((w) => {
    let fit = 0;
    for (const g of game.guesses) {
      const c = scoreShift(g.word, w);
      for (let i = 0; i < c.length; i++) if (c[i] === g.clue[i]) fit++;
    }
    return { w, fit };
  });
  scored.sort((a, b) => b.fit - a.fit);
  const top = scored.slice(0, Math.min(5, scored.length));
  const suggestion = top[Math.floor(Math.random() * top.length)].w;
  game.hintSuggestions.push(suggestion);
  game.hintsUsed += 1;
  broadcastState();
}

// update 58: three hint types (Word idea / Reveal a letter / Rule out letters) + the host's hint settings
const HINT_GAME_ID = "shiftle";
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
      hint = { type: "suggest", word, text: "Try: " + word.toUpperCase() };
    }
  } else if (chk.type === "letter") {
    hint = WH.letterHint(game.secretWord, game.hints);
    if (hint) game.hintsUsed += 1;
  } else if (chk.type === "rule") {
    hint = WH.ruleHint(game.secretWord, game.hints, []);
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

  const normalized = normalizeGuess(text);
  if (
    game.status === "live" &&
    game.mode !== "offline" &&
    normalized.length === game.wordLength &&
    (normalized === game.secretWord || isValidGuessWord(normalized))
  ) {
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
      Engagement.attach(connection, { game: "shiftle", tiktokUsername: username });
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

      if (game.status === "live" && game.secretWord && roll < 0.06) {
        text = game.secretWord;
      } else if (game.status === "live" && roll < 0.4) {
        const pool = getWordsForDifficulty(ANSWER_WORDS, difficultyIndex, game.wordLength, game.difficulty);
        text = pool.length > 0 ? pool[Math.floor(Math.random() * pool.length)] : FAKE_JUNK_WORDS[0];
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

// `nsp` is the Socket.IO namespace "/shiftle", created inside mountShiftle() below -
// broadcastState() and the namespace's "connection" handler both close over it.
let nsp = null;

function buildStatePayload() {
  return {
    game: {
      mode: game.mode,
      status: game.status,
      wordLength: game.wordLength,
      difficulty: game.difficulty,
      lengthMode: game.lengthMode,
      lengthMin: game.lengthMin,
      lengthMax: game.lengthMax,
      secretWord: game.status === "lost" ? game.secretWord : null,
      // The automatic starter word shows the LIVE host's profile picture.
      // `clue` is sent as COLOR indexes (0 white / 1 pink / 2 blue) - the round's real meanings are never sent
      // unless the legend is allowed to reveal them (see `legend` below).
      guesses: game.guesses.slice(-12).map((g) => ({
        ...(g.isStarter ? { ...g, avatarUrl: hostAvatarUrl } : g),
        clue: toColors(g.clue)
      })),
      guessesMade: game.guesses.length,
      roundNumber: game.roundNumber,
      // The color every keyboard key should wear, worked out from EVERY guess this round (not only the last 12
      // sent in `guesses`): { letter: 0 white | 1 pink | 2 blue } - the same color the letter's tiles have.
      // Best clue wins: a letter matched in the right spot even once wears the "correct spot" color; otherwise
      // the "wrong spot" color if it was ever in the word, otherwise the "not in the word" color.
      keyColors: game.status === "idle" ? {} : computeKeyColors(),
      // The color legend. `colorMeaning[colorIndex]` = 0 correct spot / 1 wrong spot / 2 not in the word, or null
      // while the host keeps the meanings hidden (they are always revealed once the round has ended).
      legend: buildLegendPayload(),
      streak: game.streak,
      hintsUsed: game.hintsUsed,
      hintSuggestions: game.hintSuggestions,
      hints: game.hints,
      hintConfig: HC.publicHintInfo("shiftle", game.hintsUsed, game.hintLastAt),
      hintNote: game.hintNote,
      lastRejection: game.lastRejection,
      strictFit: game.strictFit,
      wordLanguage,
      wordLanguages: WL.languageOptionsForClient(),
      wordLanguageInfo: WL.describeLanguage(wordLanguage),
      starterWord: game.starterWord,
      keyAutoColor: game.keyAutoColor,
      legendShow: game.legendShow,
      legendReveal: game.legendReveal,
      lastWinInfo: game.lastWinInfo,
      autoContinue: game.autoContinue,
      autoContinueDelaySeconds: game.autoContinueDelaySeconds,
      leaderboardShowSeconds: game.leaderboardShowSeconds,
      rejectionToastSeconds: game.rejectionToastSeconds,
      autoContinueSecondsLeft: game.autoContinueAt ? Math.max(0, Math.ceil((game.autoContinueAt - Date.now()) / 1000)) : 0,
      minWordLength: MIN_WORD_LENGTH,
      maxWordLength: MAX_WORD_LENGTH
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

function computeKeyColors() {
  // best meaning per letter (0 correct > 1 wrong spot > 2 not in word), then dressed in this round's color
  const best = {};
  for (const g of game.guesses) {
    for (let i = 0; i < g.word.length; i++) {
      const letter = g.word[i];
      const m = g.clue[i];
      if (best[letter] === undefined || m < best[letter]) best[letter] = m;
    }
  }
  const colors = {};
  for (const letter of Object.keys(best)) colors[letter] = game.palette[best[letter]];
  return colors;
}

function buildLegendPayload() {
  const ended = game.status === "won" || game.status === "lost";
  const revealed = game.status !== "idle" && (game.legendReveal || ended);
  let colorMeaning = null;
  if (revealed) {
    colorMeaning = [0, 0, 0];
    for (let m = 0; m < 3; m++) colorMeaning[game.palette[m]] = m;
  }
  return { show: game.legendShow, revealed, colorMeaning };
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
      HC.setHintConfig("shiftle", payload);
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
      if (word.length !== game.wordLength) {
        result = { ok: false, error: `Guess must be ${game.wordLength} letters.` };
      } else if (word !== game.secretWord && !isValidGuessWord(word)) {
        result = { ok: false, error: "That's not in the word list." };
      } else {
        result = attemptGuess(word, "Host");
        broadcastState();
      }
      ws.emit("offline_guess_result", result);
      break;
    }
    case "set_key_autocolor":
      game.keyAutoColor = setKeyAutoColor("shiftle", Boolean(payload && payload.on));
      broadcastState();
      break;
    case "set_legend_show":
      game.legendShow = setLegendShow(Boolean(payload && payload.on));
      broadcastState();
      break;
    case "set_legend_reveal":
      game.legendReveal = setLegendReveal(Boolean(payload && payload.on));
      broadcastState();
      break;
    case "set_starter_word":
      game.starterWord = setStarterWord("shiftle", Boolean(payload && payload.on));
      broadcastState();
      break;
    case "set_word_language": {
      const prevLanguage = wordLanguage;
      const nextLanguage = WL.setLanguage(WORD_GAME_ID, payload && payload.mode);
      if (nextLanguage !== prevLanguage) {
        applyWordLanguage(nextLanguage);
        if (game.status === "live") playAgain(); // the running round's word is in the old language
      }
      broadcastState();
      break;
    }
    case "set_strict_fit":
      game.strictFit = setStrictFit("shiftle", Boolean(payload && payload.on));
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
//   import { mountShiftle } from "./server/shiftle/shiftle-server.js";
//   await mountShiftle(app, io, { mountPath: "/shiftle" });
//
// `app` is the shared Express app, `io` the shared Socket.IO Server. SHIFTLE serves its own
// static folder at `mountPath` and talks to its page over the Socket.IO namespace "/shiftle".
// Call once per process (a second call would start a second dictionary load and a second
// auto-continue timer against the same shared game state).
export async function mountShiftle(app, io, options = {}) {
  const mountPath = options.mountPath || "/shiftle";

  app.use(mountPath, express.static(path.join(__dirname, "public")));
  app.get(mountPath, (req, res) => {
    res.sendFile(path.join(__dirname, "public", "shiftle-index.html"));
  });

  nsp = io.of("/shiftle");
  nsp.on(
    "connection",
    safely("shiftle-connection", (socket) => {
      socket.emit("state", buildStatePayload());
      socket.on(
        "action",
        safely("shiftle-action", (msg) => {
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
    `[SHIFTLE] Mounted at ${mountPath} (Socket.IO namespace /shiftle). ` +
      (diagnostics.signKeyConfigured
        ? "EulerStream signing key detected - TikTok connections are ready."
        : "No EULERSTREAM_API_KEY found - Test Mode will work, but live TikTok connections will not.")
  );

  return { mountPath };
}

// ============================================================
// Standalone mode
// ============================================================
// Lets you test this game entirely on its own (`node shiftle-server.js`)
// without touching your platform's code at all. This block only runs
// when the file is EXECUTED DIRECTLY, never when it's imported by
// mountShiftle above - importing it (the normal merge path) never
// opens a port or starts listening on its own.
const isRunDirectly = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isRunDirectly) {
  const { Server } = await import("socket.io");
  const standaloneApp = express();
  const standaloneServer = http.createServer(standaloneApp);
  const standaloneIo = new Server(standaloneServer);
  await mountShiftle(standaloneApp, standaloneIo, { mountPath: "/" });
  const PORT = process.env.PORT || 3000;
  standaloneServer.listen(PORT, () => {
    console.log(`[SHIFTLE] Standalone test server listening on port ${PORT}`);
  });
}

// Update 42: the HOME page's shared TikTok connection links this game by itself - no need to open the game and press
// Connect. Uses the same actions the game's own buttons send (switch to Live, then connect), only when not linked yet.
PlatformHub.registerGame(
  "shiftle",
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
