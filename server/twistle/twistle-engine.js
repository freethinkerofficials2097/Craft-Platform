import { EventEmitter } from 'events';

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
// * Every valid word of the round's length typed in chat that hasn't been guessed yet goes
//   straight onto the board as a new row, with no vote and no waiting.
// * Anyone who types the SECRET word wins the round instantly.
// * There's no timer and no cap on the number of guesses: the round keeps
//   going until someone solves it, the host reveals the answer, or the host
//   skips the round.
//
// PLATFORM INTEGRATION (points/leaderboard)
// * Landing a fresh, valid guess on the board earns a small "participation"
//   point - same idea as CROSSDLE's leaderboard, so chat is rewarded just
//   for playing along, not only for winning.
// * Solving the round earns a bigger bonus, scaled up for longer (harder)
//   secret words and scaled down the more guesses were already on the board
//   when it was solved (so a fast, early solve is worth more than a lucky
//   guess on row 40). Numbers are kept small on purpose - a live chat reads
//   "24 points" faster than "2,400".
// * The leaderboard itself (username -> { score, wins, avatarUrl }) lives on
//   the engine and is persisted to disk by twistle-server.js, exactly the
//   way CROSSDLE persists its own leaderboard.
// ===========================================================================

export const MIN_LENGTH = 4;
export const MAX_LENGTH = 20;
export const DEFAULT_LENGTH_CONFIG = { mode: 'fixed', fixed: 5, min: 4, max: 8 };

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
export const CONCEPTS = ['correct', 'misplaced', 'absent'];
// ---------------------------------------------------------------------------
// Symbols. Ids must match the SVG symbols drawn in public/twistle/app.js.
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
const ROUND_GAP_MS = 6500; // pause between rounds so the reveal is readable

// ---------------------------------------------------------------------------
// Scoring (leaderboard points). Deliberately small numbers - a live chat
// reads "24 points" faster than "2,400", and small round-to-round swings
// keep the leaderboard feeling meaningful instead of noisy. Mirrors the
// shape of CROSSDLE's scoring engine for platform-wide consistency.
// ---------------------------------------------------------------------------
export const PARTICIPATION_SCORE = 1;   // for landing ANY fresh, valid guess on the board
const SOLVE_BASE_SCORE = 14;            // base bonus for solving the round
const SOLVE_SCORE_STEP = 1;             // minus this per guess already on the board before the solve
const SOLVE_SCORE_MIN = 6;              // solving is always worth at least this many points
const LENGTH_BONUS_PER_LETTER = 1;      // longer secret words are worth more (0 extra at 4 letters)
const QUICK_SOLVE_BONUS = 5;            // solved with 2 or fewer guesses already on the board
const QUICK_SOLVE_MAX_ROWS = 2;

function scoreForSolve(length, rowsBeforeSolve) {
  const lengthBonus = Math.max(0, length - MIN_LENGTH) * LENGTH_BONUS_PER_LETTER;
  let score = SOLVE_BASE_SCORE + lengthBonus - SOLVE_SCORE_STEP * rowsBeforeSolve;
  score = Math.max(SOLVE_SCORE_MIN, score);
  if (rowsBeforeSolve <= QUICK_SOLVE_MAX_ROWS) score += QUICK_SOLVE_BONUS;
  return score;
}

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
   * @param {string[]} answers     words that can be the secret word (any mix of lengths 4-20)
   * @param {string[]} validWords  extra words that are accepted as guesses
   * @param {object}   lengthConfig  { mode, fixed, min, max } - see normalizeLengthConfig
   * @param {Array}    savedLeaderboard  previously-persisted leaderboard rows to restore
   */
  constructor(answers = [], validWords = [], lengthConfig = {}, savedLeaderboard = []) {
    super();
    const clean = (list) => [...new Set(
      (Array.isArray(list) ? list : [])
        .map((w) => String(w?.answer ?? w ?? '').toUpperCase().trim())
        .filter((w) => /^[A-Z]{4,20}$/.test(w))
    )];
    this.answers = clean(answers);
    if (!this.answers.length) this.answers = ['SHAKE', 'THICK', 'SHOOK', 'STARE', 'SOLID'];
    this.valid = new Set([...this.answers, ...clean(validWords)]);
    this._indexAnswers();

    this.config = normalizeLengthConfig(lengthConfig);
    this.usedRecently = new Map(); // length -> recently used secret words of that length
    this.lastLength = null;
    this.roundNumber = 0;

    this.status = STATUS.IDLE;
    this.current = null;
    this.nextRoundTimeout = null;

    // -------------------------------------------------------------------
    // Leaderboard: username (lowercased) -> { username, displayName, score, wins, avatarUrl }
    // -------------------------------------------------------------------
    this.leaderboard = new Map();
    for (const row of Array.isArray(savedLeaderboard) ? savedLeaderboard : []) {
      const key = String(row?.username || '').toLowerCase().trim();
      if (!key) continue;
      this.leaderboard.set(key, {
        username: row.username,
        displayName: row.displayName || row.username,
        score: Number(row.score) || 0,
        wins: Number(row.wins) || 0,
        avatarUrl: row.avatarUrl || null,
      });
    }
  }

  // -------------------------------------------------------------------
  // Word bank
  // -------------------------------------------------------------------

  get wordBankSize() { return this.answers.length; }

  _indexAnswers() {
    this.byLength = new Map();
    for (const w of this.answers) {
      if (!this.byLength.has(w.length)) this.byLength.set(w.length, []);
      this.byLength.get(w.length).push(w);
    }
  }

  /** Lengths that have at least one secret word, e.g. [4, 5, 6, ...]. */
  availableLengths() {
    return [...this.byLength.keys()].sort((a, b) => a - b);
  }

  /** How many secret words there are for each length: { 4: 669, 5: 885, ... } */
  lengthCounts() {
    const out = {};
    for (const n of this.availableLengths()) out[n] = this.byLength.get(n).length;
    return out;
  }

  addWord(entry) {
    const answer = String(entry?.answer ?? entry ?? '').toUpperCase().trim();
    if (!/^[A-Z]{4,20}$/.test(answer)) {
      throw new Error(`A Twistle word must be ${MIN_LENGTH}-${MAX_LENGTH} letters (A-Z, no spaces).`);
    }
    if (!this.answers.includes(answer)) {
      this.answers.push(answer);
      this._indexAnswers();
    }
    this.valid.add(answer);
    this.emit('wordBankUpdated', this.answers.length);
    this.emit('stateChanged', this.getPublicState());
    return { answer };
  }

  /** A familiar word of the current round's length, used by Test Mode for fake guesses. */
  randomValidWord(length = this.current?.length) {
    const list = this.byLength.get(length) || this.answers;
    return list[Math.floor(Math.random() * list.length)];
  }

  // -------------------------------------------------------------------
  // Word-length setting (host chooses fixed or a random range)
  // -------------------------------------------------------------------

  /** Change the word-length setting. It takes effect from the next round. */
  setLengthConfig(cfg) {
    this.config = normalizeLengthConfig(cfg, this.config);
    this.emit('configChanged', this.config);
    this.emit('stateChanged', this.getPublicState());
    return this.config;
  }

  /** The lengths a new round may use under the current setting (only lengths that have words). */
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
  // Leaderboard
  // -------------------------------------------------------------------

  /** Add (or subtract) points for a viewer, and remember their latest photo/display name. */
  _bumpScore(username, displayName, delta, avatarUrl) {
    const key = String(username || '').toLowerCase().trim();
    if (!key) return;
    const existing = this.leaderboard.get(key) || {
      username,
      displayName: displayName || username,
      score: 0,
      wins: 0,
      avatarUrl: null,
    };
    existing.score += delta;
    if (displayName) existing.displayName = displayName;
    if (avatarUrl) existing.avatarUrl = avatarUrl;
    this.leaderboard.set(key, existing);
    this.emit('leaderboardChanged', this.getLeaderboardTop(50));
    return existing;
  }

  getLeaderboardTop(n = 10) {
    return [...this.leaderboard.values()]
      .sort((a, b) => b.score - a.score)
      .slice(0, n)
      .map((row) => ({ name: row.displayName || row.username, score: row.score, wins: row.wins, avatarUrl: row.avatarUrl || null }));
  }

  resetLeaderboard() {
    this.leaderboard.clear();
    this.emit('leaderboardChanged', []);
    this.emit('stateChanged', this.getPublicState());
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

  _clearTimers() {
    if (this.nextRoundTimeout) clearTimeout(this.nextRoundTimeout);
    this.nextRoundTimeout = null;
  }

  // -------------------------------------------------------------------
  // Round setup
  // -------------------------------------------------------------------

  _pickWord(length) {
    const all = this.byLength.get(length);
    const used = this.usedRecently.get(length) || [];
    const pool = all.filter((w) => !used.includes(w));
    const source = pool.length ? pool : all;
    const word = source[Math.floor(Math.random() * source.length)];
    used.push(word);
    if (used.length > Math.min(150, Math.floor(all.length / 2))) used.shift();
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
      symbolMap,        // { correct: 'sun', misplaced: 'drop', absent: 'heart' } - secret until the reveal
      rows: [],          // guesses, in the order they landed on the board
      guessed: new Set(), // words already on the board, so nobody can repeat one
      startedAt: Date.now(),
      winner: null,
      reason: null,
      over: false,
    };
    this.status = STATUS.ACTIVE;
    this.emit('roundStarted', this.getPublicState());
    this.emit('stateChanged', this.getPublicState());
  }

  _scheduleNextRound() {
    if (this.nextRoundTimeout) clearTimeout(this.nextRoundTimeout);
    this.nextRoundTimeout = setTimeout(() => {
      this.nextRoundTimeout = null;
      if (this.status === STATUS.REVEAL) this._startRound(); // only continue if the game hasn't been stopped
    }, ROUND_GAP_MS);
  }

  _endRound(reason, winner) {
    const c = this.current;
    if (!c || c.over) return;
    c.over = true;
    c.reason = reason;
    c.winner = winner;
    this.status = STATUS.REVEAL;
    this.emit('roundEnded', { reason, answer: c.answer, length: c.length, winner, leaderboard: this.getLeaderboardTop(10) });
    this.emit('stateChanged', this.getPublicState());
    this._scheduleNextRound();
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
    const rowsBeforeThisGuess = c.rows.length;

    // The secret word always wins, no matter how many guesses are already on the board.
    if (word === c.answer) {
      const points = scoreForSolve(c.length, rowsBeforeThisGuess);
      const entry = this._bumpScore(username || name, name, points, avatarUrl);
      if (entry) entry.wins += 1;
      const winner = { name, avatarUrl: avatarUrl || null, points };
      this._endRound('guessed', winner);
      return { correct: true, name, points };
    }

    if (!this.valid.has(word)) return { rejected: 'not-a-word', word };
    if (c.guessed.has(word)) return { rejected: 'already-played', word };

    // A fresh, valid guess that doesn't conflict with anything already on the
    // board goes straight in as the next row - no vote, no waiting - and
    // earns a small participation point on the leaderboard.
    const { states, symbols } = evaluateGuess(c.answer, word);
    c.guessed.add(word);
    c.rows.push({
      word,
      guessedBy: name,
      states,
      symbols: symbols.map((concept) => c.symbolMap[concept]),
    });
    this._bumpScore(username || name, name, PARTICIPATION_SCORE, avatarUrl);

    this.emit('rowAdded', { word, name });
    this.emit('stateChanged', this.getPublicState());
    return { added: true, word };
  }

  // -------------------------------------------------------------------
  // Read-only view for the front-end
  // -------------------------------------------------------------------

  getPublicState() {
    const base = {
      status: this.status,
      roundNumber: this.roundNumber,
      wordBankSize: this.answers.length,
      // Length of the current round's word (or, before a game starts, the fixed length - or null for a random range).
      wordLength: this.current ? this.current.length : (this.config.mode === 'fixed' ? this.config.fixed : null),
      config: { ...this.config },
      lengthCounts: this.lengthCounts(),
      leaderboard: this.getLeaderboardTop(10),
    };
    if (!this.current) return { ...base, rows: [] };

    const c = this.current;
    const revealed = this.status === STATUS.REVEAL;

    // Tile colours (states) stay secret until the round is over.
    const rows = c.rows.map((r) => ({
      word: r.word,
      guessedBy: r.guessedBy,
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
}
