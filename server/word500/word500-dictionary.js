// dictionary.js
// Loads a huge list of real English words (the "is this a legit word?"
// check for viewer guesses) — separate from answers.js, which only
// holds the small curated list of possible SECRET words.
//
// Source: dwyl/english-words on GitHub, a widely used, MIT-licensed
// list of ~370,000 English words (alphabetic only, one per line).
// We fetch it once when the server starts and keep it in memory.
//
// If the fetch fails for any reason (no internet during build, GitHub
// hiccup, etc.) we fall back to a much smaller built-in list so the
// game still works — just with fewer recognized guesses — and the
// Diagnostics panel tells you plainly which mode you're in.

const DICTIONARY_URL = "https://raw.githubusercontent.com/dwyl/english-words/master/words_alpha.txt";
const FETCH_RETRIES = 2;
const FETCH_RETRY_DELAY_MS = 3000;
const FETCH_TIMEOUT_MS = 20000;

// A small emergency fallback so the game never fully breaks if the
// big list can't be downloaded (e.g. no outbound internet).
import { ANSWER_WORDS } from "./word500-answers.js";
const FALLBACK_WORDS = new Set([
  ...ANSWER_WORDS[4],
  ...ANSWER_WORDS[5],
  ...ANSWER_WORDS[6],
  "about", "after", "again", "below", "could", "every", "first", "found", "great",
  "house", "large", "learn", "never", "other", "place", "plant", "point", "right",
  "small", "sound", "spell", "still", "study", "their", "there", "these", "thing",
  "think", "three", "water", "where", "which", "world", "would", "write", "table",
  "chair", "phone", "video", "music", "movie", "paper", "cloud", "field", "money"
]);

export const dictionaryState = {
  words: FALLBACK_WORDS,
  source: "fallback",
  wordCount: FALLBACK_WORDS.size,
  loading: true,
  lastError: null
};

function fetchWithTimeout(url, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { signal: controller.signal }).finally(() => clearTimeout(timer));
}

export async function loadDictionary() {
  for (let attempt = 0; attempt <= FETCH_RETRIES; attempt++) {
    try {
      console.log(`[Dictionary] Fetching word list (attempt ${attempt + 1})...`);
      const response = await fetchWithTimeout(DICTIONARY_URL, FETCH_TIMEOUT_MS);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const text = await response.text();
      const words = text
        .split("\n")
        .map((w) => w.trim().toLowerCase())
        .filter((w) => w.length > 0);

      if (words.length < 50000) {
        // Sanity check — if we somehow got a tiny/garbled response,
        // don't trust it as "the enormous dictionary".
        throw new Error(`Unexpectedly small word list (${words.length} words)`);
      }

      dictionaryState.words = new Set(words);
      dictionaryState.source = "full";
      dictionaryState.wordCount = dictionaryState.words.size;
      dictionaryState.loading = false;
      dictionaryState.lastError = null;
      clearLengthCache();
      console.log(`[Dictionary] Loaded ${dictionaryState.wordCount.toLocaleString()} words.`);
      return;
    } catch (err) {
      console.error(`[Dictionary] Attempt ${attempt + 1} failed:`, err?.message || err);
      dictionaryState.lastError = err?.message || String(err);
      if (attempt < FETCH_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, FETCH_RETRY_DELAY_MS));
      }
    }
  }

  // All attempts failed — stay on the fallback list, but stop
  // reporting "loading" so the UI shows an accurate final state.
  dictionaryState.words = FALLBACK_WORDS;
  dictionaryState.source = "fallback";
  dictionaryState.wordCount = FALLBACK_WORDS.size;
  dictionaryState.loading = false;
  clearLengthCache();
  console.warn(
    `[Dictionary] Falling back to the built-in ${FALLBACK_WORDS.size}-word list after ${FETCH_RETRIES + 1} failed attempts.`
  );
}

export function isValidGuessWord(word) {
  return dictionaryState.words.has(word);
}

// Cache "all dictionary words of length N" so Test Mode and the
// "start with N random words" feature don't have to scan the entire
// 370,000-word set every time they need a random word of the right
// length. Cleared automatically whenever the dictionary (re)loads.
const lengthCache = new Map();

export function getWordsOfLength(n) {
  if (!lengthCache.has(n)) {
    const list = [];
    for (const w of dictionaryState.words) {
      if (w.length === n) list.push(w);
    }
    lengthCache.set(n, list);
  }
  return lengthCache.get(n);
}

export function clearLengthCache() {
  lengthCache.clear();
}
