import { EventEmitter } from 'events';
import { ANSWER_WORDS, MIN_WORD_LENGTH, MAX_WORD_LENGTH } from './twistle-answers.js';
import { isValidGuessWord, dictionaryState } from './twistle-dictionary.js';
import { buildDifficultyIndex, getWordsForDifficulty } from './twistle-difficulty.js';

// ===========================================================================
// TWISTLE - the rules, in one place
// ---------------------------------------------------------------------------
// * A secret word is chosen. Its length is set by the host: one fixed length
//   anywhere from 4 to 20 letters, or a random length picked each round from a
//   range the host chooses (say, anywhere from 5 to 9 letters).
// * Every round, 3 symbols are drawn at random and each is secretly assigned
//   one meaning:  "correct spot", "wrong spot", or "not in the guess".
//   Nobody is told which symbol means what - players have to work it out.
//   The 3 symbols are always picked to look VERY different from each other
//   (different colour AND different silhouette) so they can't be confused.
// * When a word is guessed, the board shows one symbol per letter next to it. Symbol #1
//   describes the SECRET word's 1st letter, symbol #2 its 2nd letter, and so on
//   (NOT the letters of the guess!):
//       correct   -> the guess has that same letter in that same position
//       misplaced -> the guess contains that letter, but somewhere else
//       absent    -> the guess doesn't contain that letter (or has no spare copy)
// * Duplicate letters: a misplaced letter is marked on the EARLIEST matching
//   letter of the secret word that isn't already "correct".
// * The colours of the guessed tiles stay hidden until the round is over.
//
// HOW IT PLAYS ON TIKTOK LIVE
// * Every valid word of the round's length typed in chat that hasn't been
//   guessed yet goes straight onto the board as a new row, with no vote and
//   no waiting.
// * Anyone who types the SECRET word wins the round instantly.
// * There's no timer and no cap on the number of guesses: the round keeps
//   going until someone solves it, the host reveals the answer, or the host
//   skips the round.
//
// WORD BANK, DIFFICULTY & SCORING - ported straight from BLINDLE
// ---------------------------------------------------------------------------
// * Secret words are drawn from the same curated ANSWER_WORDS bank BLINDLE
//   uses (twistle-answers.js, an identical copy) - always a real,
//   recognizable English word for every length from 4 to 20 letters.
// * Guesses are checked against the same enormous (370,000+ word) dictionary
//   BLINDLE fetches at startup (twistle-dictionary.js) - any real English
//   word of the round's length is accepted onto the board, not just words
//   from the curated answer bank.
// * The same 4-factor difficulty engine (twistle-difficulty.js) scores every
//   candidate secret word and buckets it into Normal / Medium / Hard, and
//   the host picks which tier (or Random, which skips the filter entirely)
//   is in play - exactly like BLINDLE's difficulty selector.
// * Winning is worth WIN_POINTS, a valid-but-wrong guess is worth
//   GUESS_POINTS, both tallied into a this-round leaderboard and an
//   all-time leaderboard (Live mode only) - the same 10x ratio BLINDLE uses.
// ===========================================================================

export const MIN_LENGTH = MIN_WORD_LENGTH;
export const MAX_LENGTH = MAX_WORD_LENGTH;
export const DEFAULT_LENGTH_CONFIG = { mode: 'fixed', fixed: 5, min: 4, max: 8 };
export const DEFAULT_DIFFICULTY = 'normal';

// Points awarded per guess, same ratio as BLINDLE (solving is worth 10x a
// plain wrong-but-valid guess, which still earns a small participation point).
export const WIN_POINTS = 10;
export const GUESS_POINTS = 1;

const DEFAULT_LEADERBOARD_SHOW_SECONDS = 3;
const DEFAULT_AUTO_CONTINUE_DELAY_SECONDS = 3;
// A win walks through 3 celebration stages client-side (winner -> this
// round's leaderboard -> all-time leaderboard), each shown for
// leaderboardShowSeconds - see shared/celebration.js on the client. A
// reveal/skip with no winner has no celebration at all.
const CELEBRATION_STAGE_COUNT = 3;

/**
 * Tidy up a word-length setting from the host.
 *   mode  'fixed'  -> every round uses `fixed` letters
 *         'random' -> every round picks a random length from min..max
 * Numbers are clamped to 4-20, and min/max are swapped if they're the wrong way round.
 */
export function normalizeLengthConfig(cfg = {}, base = DEFAULT_LENGTH_CONFIG) {
  const clampLen = (n, fallback) => {
    n = Math.round(Number(n));
    return Number.isFinite(n) ? Math.min(MAX_LENGTH, Math.max(MIN_LENGTH, n)) : fallback;
  };
  const mode = cfg.mode === 'random' ? 'random' : cfg.mode === 'fixed' ? 'fixed' : base.mode;
  let min = clampLen(cfg.min ?? base.min, base.min);
  let max = clampLen(cfg.max ?? base.max, base.max);
  if (min > max) [min, max] = [max, min];
  return { mode, fixed: clampLen(cfg.fixed ?? base.fixed, base.fixed), min, max };
}

export function normalizeDifficulty(value, fallback = DEFAULT_DIFFICULTY) {
  return ['normal', 'medium', 'hard', 'random'].includes(value) ? value : fallback;
}

export const CONCEPTS = ['correct', 'misplaced', 'absent'];
// ---------------------------------------------------------------------------
// Symbols. Ids must match the SVG symbols drawn in public/twistle/index.html.
//   hue   - the symbol's main colour as an angle on the colour wheel (0-360).
//           null = white/neutral.
//   tone  - 'light' or 'mid'. Two light symbols are never used together
//           (e.g. a yellow star next to a white cloud would blur together).
//   shape - silhouette family. Two symbols of the same family are never used
//           together (the clover and the cloud are both "lobed", for example).
// ---------------------------------------------------------------------------
export const SYMBOL_INFO = {
  heart:  { hue: 348,  tone: 'mid',   shape: 'heart' },
  star:   { hue: 45,   tone: 'light', shape: 'spiky' },
  moon:   { hue: 258,  tone: 'mid',   shape: 'crescent' },
  drop:   { hue: 216,  tone: 'mid',   shape: 'teardrop' },
  clover: { hue: 145,  tone: 'mid',   shape: 'lobed' },
  cat:    { hue: 27,   tone: 'mid',   shape: 'ears' },
  gem:    { hue: 180,  tone: 'mid',   shape: 'faceted' },
  donut:  { hue: 325,  tone: 'mid',   shape: 'ring' },
  cloud:  { hue: null, tone: 'light', shape: 'lobed' },
  frog:     { hue: 100, tone: 'mid', shape: 'frog' },
  mushroom: { hue: 4,   tone: 'mid', shape: 'mushroom' },
  ghost:    { hue: 292, tone: 'mid', shape: 'ghost' },
};
export const SYMBOL_POOL = Object.keys(SYMBOL_INFO);
export const MIN_HUE_GAP = 70; // degrees on the colour wheel between any two symbols in a round

/** True if two symbols are too alike in colour or shape to share a round. */
export function symbolsClash(idA, idB) {
  const a = SYMBOL_INFO[idA], b = SYMBOL_INFO[idB];
  if (a.shape === b.shape) return true;
  if (a.hue === null || b.hue === null) return a.tone === 'light' && b.tone === 'light';
  const gap = Math.abs(a.hue - b.hue);
  return Math.min(gap, 360 - gap) < MIN_HUE_GAP;
}

/** Every group of 3 symbols where no two of them clash. */
export const SYMBOL_TRIPLES = (() => {
  const out = [];
  for (let i = 0; i < SYMBOL_POOL.length; i++)
    for (let j = i + 1; j < SYMBOL_POOL.length; j++)
      for (let k = j + 1; k < SYMBOL_POOL.length; k++) {
        const t = [SYMBOL_POOL[i], SYMBOL_POOL[j], SYMBOL_POOL[k]];
        if (!symbolsClash(t[0], t[1]) && !symbolsClash(t[0], t[2]) && !symbolsClash(t[1], t[2])) out.push(t);
      }
  return out;
})();

const STATUS = { IDLE: 'idle', ACTIVE: 'active', REVEAL: 'reveal' };

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

/** Lowercase, strip accents and punctuation - used for user keys. */
export function normalize(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Turn a chat comment into a guess, or null if it isn't one.
 * Accepts "crane", "Crane!", "!guess crane", "!g crane". Only a single word of
 * exactly `length` letters counts; anything else is normal chatter and is ignored.
 */
export function parseGuess(text, length = 5) {
  const tokens = String(text || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (tokens.length && /^[!/](g|guess)$/i.test(tokens[0])) tokens.shift();
  if (tokens.length !== 1) return null;
  const word = tokens[0].replace(/^[!/]/, '').replace(/[!?.,:;'"]+$/, '');
  return word.length === length && /^[A-Za-z]+$/.test(word) ? word.toUpperCase() : null;
}

function shuffle(list) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Score one guess against the answer.
 *   states[i]  - status of the i-th GUESSED letter (Wordle style; hidden until the end)
 *   symbols[i] - status of the i-th letter of the ANSWER (what the symbol column shows)
 * Each is 'correct' | 'misplaced' | 'absent'.
 */
export function evaluateGuess(answer, guess) {
  const n = answer.length;
  const states = new Array(n).fill('absent');
  const symbols = new Array(n).fill('absent');
  const unmatched = {}; // letter -> how many copies in the answer aren't "correct" yet

  for (let i = 0; i < n; i++) {
    if (guess[i] === answer[i]) {
      states[i] = 'correct';
      symbols[i] = 'correct';
    } else {
      unmatched[answer[i]] = (unmatched[answer[i]] || 0) + 1;
    }
  }

  // Guess side: hand out "misplaced" left to right while spare copies remain.
  const spare = { ...unmatched };
  for (let i = 0; i < n; i++) {
    if (states[i] === 'correct') continue;
    if (spare[guess[i]] > 0) {
      states[i] = 'misplaced';
      spare[guess[i]] -= 1;
    }
  }

  // Answer side: each misplaced guess letter marks the EARLIEST unmatched copy in the answer.
  const toMark = {};
  for (const letter of Object.keys(unmatched)) toMark[letter] = unmatched[letter] - spare[letter];
  for (let i = 0; i < n; i++) {
    if (symbols[i] === 'correct') continue;
    if (toMark[answer[i]] > 0) {
      symbols[i] = 'misplaced';
      toMark[answer[i]] -= 1;
    }
  }
  return { states, symbols };
}

// ---------------------------------------------------------------------------
// The engine
// ---------------------------------------------------------------------------

export class GameEngine extends EventEmitter {
  /**
   * @param {object} lengthConfig    { mode, fixed, min, max } - see normalizeLengthConfig
   * @param {string}  difficulty     'normal' | 'medium' | 'hard' | 'random'
   * @param {string[]} customWords   extra host-added secret words, on top of ANSWER_WORDS
   */
  constructor(lengthConfig = {}, difficulty = DEFAULT_DIFFICULTY, customWords = []) {
    super();
    this.difficultyIndex = buildDifficultyIndex(ANSWER_WORDS);
    this.customWords = new Set();
    this._answersByLength = null; // rebuilt lazily whenever custom words change
    this.addCustomWords(customWords, { silent: true });

    this.config = normalizeLengthConfig(lengthConfig);
    this.difficulty = normalizeDifficulty(difficulty);
    this.usedRecently = new Map(); // length -> recently used secret words of that length
    this.lastLength = null;
    this.roundNumber = 0;

    this.mode = 'offline'; // 'live' | 'test' | 'offline' - only 'live' banks points
    this.status = STATUS.IDLE;
    this.current = null;
    this.nextRoundTimeout = null;

    // Live-mode scoring, mirroring BLINDLE.
    this.roundScores = new Map();
    this.totalScores = new Map();
    this.leaderboardShowSeconds = DEFAULT_LEADERBOARD_SHOW_SECONDS;
    this.autoContinue = true;
    this.autoContinueDelaySeconds = DEFAULT_AUTO_CONTINUE_DELAY_SECONDS;
  }

  // -------------------------------------------------------------------
  // Word bank - ANSWER_WORDS (BLINDLE's curated list) plus any host-added
  // custom words layered on top, indexed by length exactly like BLINDLE.
  // -------------------------------------------------------------------

  _rebuildAnswersByLength() {
    // Secret words are compared uppercase against guesses (see
    // parseGuess/handleGuess), but ANSWER_WORDS/the difficulty index are
    // lowercase (BLINDLE's own convention) - keep an uppercase bank for
    // picking/matching, and use lowercase only where BLINDLE's own helpers
    // (difficulty scoring, dictionary lookups) expect it.
    const byLength = new Map();
    for (const [lenStr, words] of Object.entries(ANSWER_WORDS)) {
      byLength.set(Number(lenStr), words.map((w) => w.toUpperCase()));
    }
    for (const w of this.customWords) {
      const len = w.length;
      if (!byLength.has(len)) byLength.set(len, []);
      if (!byLength.get(len).includes(w)) byLength.get(len).push(w);
    }
    this._answersByLength = byLength;
    return byLength;
  }

  get answersByLength() {
    if (!this._answersByLength) this._rebuildAnswersByLength();
    return this._answersByLength;
  }

  /** Lengths that have at least one secret word, e.g. [4, 5, 6, ...]. */
  availableLengths() {
    return [...this.answersByLength.keys()].sort((a, b) => a - b);
  }

  get wordBankSize() {
    let total = 0;
    for (const words of this.answersByLength.values()) total += words.length;
    return total;
  }

  /** How many secret words there are for each length: { 4: 74, 5: 79, ... } */
  lengthCounts() {
    const out = {};
    for (const n of this.availableLengths()) out[n] = this.answersByLength.get(n).length;
    return out;
  }

  addCustomWords(list, { silent } = {}) {
    let added = false;
    for (const raw of Array.isArray(list) ? list : []) {
      const word = String(raw?.answer ?? raw ?? '').toUpperCase().trim();
      if (/^[A-Z]{4,20}$/.test(word) && !this.customWords.has(word)) {
        this.customWords.add(word);
        added = true;
      }
    }
    if (added) this._answersByLength = null; // force a rebuild on next read
    if (added && !silent) {
      this.emit('wordBankUpdated', this.wordBankSize);
      this.emit('stateChanged', this.getPublicState());
    }
    return added;
  }

  addWord(entry) {
    const answer = String(entry?.answer ?? entry ?? '').toUpperCase().trim();
    if (!/^[A-Z]{4,20}$/.test(answer)) {
      throw new Error(`A Twistle word must be ${MIN_LENGTH}-${MAX_LENGTH} letters (A-Z, no spaces).`);
    }
    this.addCustomWords([answer]);
    return { answer };
  }

  /** A familiar word of the current round's length, used by Test Mode for fake guesses. */
  randomValidWord(length = this.current?.length) {
    const list = this.answersByLength.get(length) || [];
    if (list.length) return list[Math.floor(Math.random() * list.length)];
    // Fall back to any real dictionary word of that length, if the curated
    // bank happens to have nothing there.
    return null;
  }

  /** True if `word` (already uppercased) would be accepted as a guess: the
   *  round's own secret word, a curated answer-bank word, or any real word
   *  in the 370,000+ word dictionary BLINDLE also uses. */
  isAcceptedGuess(word) {
    if (this.current && word === this.current.answer) return true;
    return isValidGuessWord(word.toLowerCase());
  }

  // -------------------------------------------------------------------
  // Word-length + difficulty settings (host chooses fixed/random length,
  // and Normal/Medium/Hard/Random difficulty - exactly like BLINDLE).
  // -------------------------------------------------------------------

  /** Change the word-length setting. It takes effect from the next round. */
  setLengthConfig(cfg) {
    this.config = normalizeLengthConfig(cfg, this.config);
    this.emit('configChanged', this.config);
    this.emit('stateChanged', this.getPublicState());
    return this.config;
  }

  setDifficulty(value) {
    this.difficulty = normalizeDifficulty(value, this.difficulty);
    this.emit('stateChanged', this.getPublicState());
    return this.difficulty;
  }

  setMode(mode) {
    if (['live', 'test', 'offline'].includes(mode)) {
      this.mode = mode;
      this.emit('stateChanged', this.getPublicState());
    }
    return this.mode;
  }

  setTiming({ leaderboardShowSeconds, autoContinue, autoContinueDelaySeconds } = {}) {
    if (leaderboardShowSeconds !== undefined) {
      const v = Number(leaderboardShowSeconds);
      this.leaderboardShowSeconds = Number.isFinite(v) ? Math.min(15, Math.max(1, Math.round(v))) : this.leaderboardShowSeconds;
    }
    if (typeof autoContinue === 'boolean') this.autoContinue = autoContinue;
    if (autoContinueDelaySeconds !== undefined) {
      const v = Number(autoContinueDelaySeconds);
      this.autoContinueDelaySeconds = Number.isFinite(v) ? Math.min(120, Math.max(2, Math.round(v))) : this.autoContinueDelaySeconds;
    }
    this.emit('stateChanged', this.getPublicState());
  }

  /** The lengths a new round may use under the current length + difficulty setting. */
  _allowedLengths() {
    const avail = this.availableLengths();
    const { mode, fixed, min, max } = this.config;
    const wanted = mode === 'fixed' ? avail.filter((n) => n === fixed) : avail.filter((n) => n >= min && n <= max);
    if (wanted.length) return wanted;
    // Nothing available there: use the closest length that does have words.
    const target = mode === 'fixed' ? fixed : (min + max) / 2;
    return [avail.reduce((best, n) => (Math.abs(n - target) < Math.abs(best - target) ? n : best), avail[0])];
  }

  _pickLength() {
    const allowed = this._allowedLengths();
    // In random mode, avoid the same length twice in a row when there's a choice.
    const options = allowed.length > 1 ? allowed.filter((n) => n !== this.lastLength) : allowed;
    return options[Math.floor(Math.random() * options.length)];
  }

  // -------------------------------------------------------------------
  // Lifecycle
  // -------------------------------------------------------------------

  start() {
    this._clearTimers();
    this._startRound();
  }

  stop() {
    this._clearTimers();
    this.status = STATUS.IDLE;
    this.current = null;
    this.emit('stateChanged', this.getPublicState());
  }

  /** Host action: end the round right now and show the answer. */
  revealAnswer() {
    if (this.status === STATUS.ACTIVE && this.current) this._endRound('revealed', null);
  }

  /** Host action: abandon the round and move on. */
  skipRound() {
    if (this.status === STATUS.ACTIVE && this.current) this._endRound('skipped', null);
  }

  resetRoundLeaderboard() {
    this.roundScores.clear();
    this.emit('stateChanged', this.getPublicState());
  }

  resetTotalLeaderboard() {
    this.totalScores.clear();
    this.emit('stateChanged', this.getPublicState());
  }

  _clearTimers() {
    if (this.nextRoundTimeout) clearTimeout(this.nextRoundTimeout);
    this.nextRoundTimeout = null;
  }

  // -------------------------------------------------------------------
  // Round setup
  // -------------------------------------------------------------------

  _pickWord(length) {
    // Difficulty-filtered pool first (same 4-factor engine BLINDLE uses).
    // this.answersByLength is uppercase (secret words are matched against
    // uppercased guesses - see handleGuess), but the difficulty index is
    // keyed on BLINDLE's own lowercase words, so filter in lowercase and
    // map back to the uppercase form afterwards.
    const upperPool = this.answersByLength.get(length) || [];
    const lowerToUpper = new Map(upperPool.map((w) => [w.toLowerCase(), w]));
    const lowerCandidates = getWordsForDifficulty(
      { [length]: [...lowerToUpper.keys()] },
      this.difficultyIndex,
      length,
      this.difficulty
    );
    const filtered = lowerCandidates.map((w) => lowerToUpper.get(w)).filter(Boolean);
    const pool = filtered.length ? filtered : upperPool;
    const used = this.usedRecently.get(length) || [];
    const fresh = pool.filter((w) => !used.includes(w));
    const source = fresh.length ? fresh : pool;
    const word = source[Math.floor(Math.random() * source.length)];
    used.push(word);
    if (used.length > Math.min(150, Math.max(1, Math.floor(pool.length / 2)))) used.shift();
    this.usedRecently.set(length, used);
    return word;
  }

  _startRound() {
    const length = this._pickLength();
    this.lastLength = length;
    const answer = this._pickWord(length);
    this.roundNumber += 1;

    // 3 random symbols (always a clearly-different-looking trio), each given
    // one secret meaning for this round only.
    const symbols = shuffle(SYMBOL_TRIPLES[Math.floor(Math.random() * SYMBOL_TRIPLES.length)]);
    const concepts = shuffle(CONCEPTS);
    const symbolMap = {};
    concepts.forEach((concept, i) => { symbolMap[concept] = symbols[i]; });

    this.current = {
      answer,
      length,
      symbolMap,        // { correct: 'star', misplaced: 'drop', absent: 'heart' } - secret until the reveal
      rows: [],          // guesses, in the order they landed on the board
      guessed: new Set(), // words already on the board, so nobody can repeat one
      startedAt: Date.now(),
      winner: null,
      reason: null,
      over: false,
    };
    this.status = STATUS.ACTIVE;
    this.roundScores.clear();
    this.emit('roundStarted', this.getPublicState());
    this.emit('stateChanged', this.getPublicState());
  }

  _scheduleNextRound(delayMs) {
    if (this.nextRoundTimeout) clearTimeout(this.nextRoundTimeout);
    this.nextRoundTimeout = setTimeout(() => {
      this.nextRoundTimeout = null;
      if (this.status === STATUS.REVEAL) this._startRound(); // only continue if the game hasn't been stopped
    }, delayMs);
  }

  _endRound(reason, winner) {
    const c = this.current;
    if (!c || c.over) return;
    c.over = true;
    c.reason = reason;
    c.winner = winner;
    this.status = STATUS.REVEAL;
    this.emit('roundEnded', {
      reason,
      answer: c.answer,
      winner,
      legend: { ...c.symbolMap },
      roundLeaderboard: this.getLeaderboard(this.roundScores),
      totalLeaderboard: this.getLeaderboard(this.totalScores),
    });
    this.emit('stateChanged', this.getPublicState());

    if (this.autoContinue) {
      // A win walks through the full 3-stage celebration (winner -> round
      // leaderboard -> all-time leaderboard) on the client before the next
      // round starts, so the server-side gap must never cut it short. A
      // reveal/skip has no celebration and just uses the plain gap.
      const celebrationMs = reason === 'guessed' ? this.leaderboardShowSeconds * CELEBRATION_STAGE_COUNT * 1000 : 0;
      this._scheduleNextRound(celebrationMs + this.autoContinueDelaySeconds * 1000);
    }
  }

  // -------------------------------------------------------------------
  // Scoring / leaderboards - Live mode only, same points as BLINDLE.
  // -------------------------------------------------------------------

  _awardPoints(name, points) {
    if (this.mode !== 'live' || !name) return;
    this.roundScores.set(name, (this.roundScores.get(name) || 0) + points);
    this.totalScores.set(name, (this.totalScores.get(name) || 0) + points);
  }

  getLeaderboard(map) {
    return [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, score]) => ({ name, score }));
  }

  // -------------------------------------------------------------------
  // Chat input (TikTok comments, test mode, or the host's message box)
  //   returns null            -> not a guess at all (normal chatter / no round)
  //           { rejected }    -> looked like a guess but was refused
  //           { added, word } -> a fresh, valid guess - now a row on the board
  //           { correct ... } -> solved it!
  // -------------------------------------------------------------------

  handleGuess(username, displayName, text, avatarUrl = null) {
    if (this.status !== STATUS.ACTIVE || !this.current) return null;
    const c = this.current;
    const word = parseGuess(text, c.length);
    if (!word) return null;

    const name = displayName || username || 'viewer';

    // The secret word always wins, no matter how many guesses are already on the board.
    if (word === c.answer) {
      this._awardPoints(name, WIN_POINTS);
      const points = this.mode === 'live' ? WIN_POINTS : null;
      this._endRound('guessed', { name, points, avatarUrl });
      return { correct: true, name };
    }

    if (!this.isAcceptedGuess(word)) return { rejected: 'not-a-word', word };
    if (c.guessed.has(word)) return { rejected: 'already-played', word };

    // A fresh, valid guess that doesn't conflict with anything already on the
    // board goes straight in as the next row - no vote, no waiting.
    const { states, symbols } = evaluateGuess(c.answer, word);
    c.guessed.add(word);
    c.rows.push({
      word,
      guessedBy: name,
      avatarUrl,
      states,
      symbols: symbols.map((concept) => c.symbolMap[concept]),
    });
    this._awardPoints(name, GUESS_POINTS);

    this.emit('rowAdded', { word, name });
    this.emit('stateChanged', this.getPublicState());
    return { added: true, word };
  }

  // -------------------------------------------------------------------
  // Read-only view for the front-end
  // -------------------------------------------------------------------

  getPublicState() {
    const base = {
      mode: this.mode,
      status: this.status,
      roundNumber: this.roundNumber,
      wordBankSize: this.wordBankSize,
      difficulty: this.difficulty,
      // Length of the current round's word (or, before a game starts, the fixed length - or null for a random range).
      wordLength: this.current ? this.current.length : (this.config.mode === 'fixed' ? this.config.fixed : null),
      config: { ...this.config },
      lengthCounts: this.lengthCounts(),
      leaderboardShowSeconds: this.leaderboardShowSeconds,
      autoContinue: this.autoContinue,
      autoContinueDelaySeconds: this.autoContinueDelaySeconds,
      roundLeaderboard: this.getLeaderboard(this.roundScores),
      totalLeaderboard: this.getLeaderboard(this.totalScores),
    };
    if (!this.current) return { ...base, rows: [] };

    const c = this.current;
    const revealed = this.status === STATUS.REVEAL;

    // Tile colours (states) stay secret until the round is over.
    const rows = c.rows.map((r) => ({
      word: r.word,
      guessedBy: r.guessedBy,
      avatarUrl: r.avatarUrl || null,
      symbols: r.symbols,
      ...(revealed ? { states: r.states } : {}),
    }));

    return {
      ...base,
      rows,
      startedAt: c.startedAt,
      // Only revealed at the end of the round:
      answer: revealed ? c.answer : null,
      winner: revealed ? c.winner : null,
      reason: revealed ? c.reason : null,
      legend: revealed ? { ...c.symbolMap } : null,
    };
  }

  /** Diagnostics helper: is the underlying 370k-word dictionary loaded yet, or on the small fallback? */
  getDictionaryInfo() {
    return {
      source: dictionaryState.source,
      wordCount: dictionaryState.wordCount,
      loading: dictionaryState.loading,
    };
  }
}
