// difficulty.js
// A modular, tunable difficulty-scoring engine for BLINDLE's secret
// word selection. This does NOT change the feedback mechanic (players
// always get full, honest green/yellow/red counts) - it only changes
// WHICH secret words are eligible for each named tier, by scoring how
// hard a word is to deduce.
//
// Four factors, each scored 0-100 (higher = harder), combined with
// configurable weights into one overall score (0-100), then bucketed
// into NORMAL / MEDIUM / HARD via configurable thresholds. Tune any
// of DIFFICULTY_WEIGHTS or DIFFICULTY_THRESHOLDS below without
// touching the scoring logic itself.
//
// Extension point for future modes (Speed Round, Double Letter, Rare
// Letter, Trick Word, Boss Round, etc.): those can layer additional
// selection or timing rules on top of getWordsForDifficulty() below
// without rebuilding this scoring engine.

export const DIFFICULTY_WEIGHTS = {
  vocabulary: 0.30, // how common/familiar the word is
  structure: 0.25, // repeated/rare letters, awkward letter patterns
  ambiguity: 0.25, // how many same-length words look similar to it
  information: 0.2 // how much a count-based clue actually narrows things down
};

export const DIFFICULTY_THRESHOLDS = {
  normalMax: 35, // score <= this -> NORMAL
  mediumMax: 65 // score <= this -> MEDIUM, above -> HARD
};

const RARE_LETTER_POINTS = { j: 8, q: 10, x: 8, z: 8, v: 4, w: 3, k: 3, y: 2 };
const VOWELS = new Set(["a", "e", "i", "o", "u"]);

// A small set of extremely familiar words, hand-picked, that get an
// "easy to recognize" discount on their vocabulary score. This is a
// heuristic nudge, not a real frequency corpus - documented as such.
const COMMON_CORE = new Set([
  "gold", "moon", "fire", "rain", "snow", "king", "book", "cake", "fish", "bird",
  "tree", "star", "game", "team", "apple", "beach", "candy", "dance", "honey",
  "queen", "robot", "storm", "tiger", "bread", "heart", "juice", "magic", "river",
  "shark", "train", "voice", "watch", "earth", "ghost", "hotel", "image", "planet",
  "guitar", "window", "garden", "island", "nature", "orange", "purple", "silver",
  "anchor", "bridge", "castle", "dragon", "forest", "hammer"
]);

function uniqueLetterCount(word) {
  return new Set(word).size;
}

function vowelRatio(word) {
  let vowels = 0;
  for (const ch of word) if (VOWELS.has(ch)) vowels++;
  return vowels / word.length;
}

function consonantClusterBonus(word) {
  let bonus = 0;
  let run = 0;
  for (const ch of word) {
    if (VOWELS.has(ch)) {
      run = 0;
      continue;
    }
    run++;
    if (run >= 3) bonus += 15;
  }
  return bonus;
}

// Factor 1: how familiar/common the word is likely to be to a casual
// TikTok LIVE audience. Longer + rarer-lettered words score higher
// (harder); a small hand-picked "common core" list gets a discount.
export function computeVocabularyScore(word) {
  let score = Math.min(60, Math.max(0, (word.length - 4) * 5));
  for (const ch of word) score += RARE_LETTER_POINTS[ch] || 0;
  if (COMMON_CORE.has(word)) score = Math.max(0, score - 25);
  return Math.min(100, score);
}

// Factor 2: repeated letters, rare letters, awkward consonant runs,
// and vowel scarcity - all things that make the aggregate-count
// feedback genuinely harder to reason about.
export function computeStructureScore(word) {
  const repeats = word.length - uniqueLetterCount(word);
  let score = repeats * 15;
  score += consonantClusterBonus(word);
  score += Math.max(0, (0.4 - vowelRatio(word)) * 100);
  return Math.min(100, score);
}

// Factor 3: how many other same-length words in the pool are "close"
// to this one (share most of their letters). More look-alikes means
// more genuine ambiguity to sort through while deducing.
export function computeAmbiguityScore(word, sameLengthPool) {
  const wordLetters = new Set(word);
  let similar = 0;
  for (const other of sameLengthPool) {
    if (other === word) continue;
    const otherLetters = new Set(other);
    let shared = 0;
    for (const l of wordLetters) if (otherLetters.has(l)) shared++;
    const overlap = shared / Math.max(wordLetters.size, otherLetters.size);
    if (overlap >= 0.6) similar++;
  }
  return Math.min(100, similar * 10);
}

// Factor 4: a proxy for how much a green/yellow/red count actually
// narrows things down. Repeated letters blur a count's meaning (you
// can't tell which occurrence is which), so lower letter diversity
// roughly means each guess teaches you less.
export function computeInformationScore(word) {
  const diversity = uniqueLetterCount(word) / word.length;
  return Math.min(100, Math.max(0, (1 - diversity) * 100));
}

export function computeDifficultyScore(word, sameLengthPool, weights = DIFFICULTY_WEIGHTS) {
  const vocabulary = computeVocabularyScore(word);
  const structure = computeStructureScore(word);
  const ambiguity = computeAmbiguityScore(word, sameLengthPool);
  const information = computeInformationScore(word);
  const total =
    vocabulary * weights.vocabulary +
    structure * weights.structure +
    ambiguity * weights.ambiguity +
    information * weights.information;
  return { total: Math.round(total), vocabulary, structure, ambiguity, information };
}

export function classifyDifficulty(score, thresholds = DIFFICULTY_THRESHOLDS) {
  if (score <= thresholds.normalMax) return "normal";
  if (score <= thresholds.mediumMax) return "medium";
  return "hard";
}

// Precomputes and caches { score, tier } for every word in a
// length-keyed pool (e.g. ANSWER_WORDS), so ambiguity scoring only
// ever compares words of the same length.
export function buildDifficultyIndex(wordsByLength, weights = DIFFICULTY_WEIGHTS, thresholds = DIFFICULTY_THRESHOLDS) {
  const index = new Map(); // word -> { score, tier }
  for (const words of Object.values(wordsByLength)) {
    for (const word of words) {
      const { total } = computeDifficultyScore(word, words, weights);
      index.set(word, { score: total, tier: classifyDifficulty(total, thresholds) });
    }
  }
  return index;
}

// Returns the candidate words for a given length + tier, falling back
// to the full pool for that length if the tier has nothing to offer
// (common at very long lengths where the curated pool is small).
// tier "random" deliberately skips difficulty filtering entirely -
// every word of that length is eligible, easy to extremely hard.
export function getWordsForDifficulty(wordsByLength, difficultyIndex, wordLength, tier) {
  const pool = wordsByLength[wordLength] || [];
  if (tier === "random") return pool;
  const filtered = pool.filter((w) => difficultyIndex.get(w)?.tier === tier);
  return filtered.length > 0 ? filtered : pool;
}
