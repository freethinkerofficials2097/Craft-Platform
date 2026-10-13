// ===================================================================
// WORD HINTS  (update 58) - the two extra hint types every letter word game shares.
//   letterHint  : reveals one letter of the secret word + its position (always leaves at least one letter hidden)
//   ruleHint    : names three letters that are NOT in the secret word (favours common letters, so it is useful)
// "Word idea" (suggest) stays in each game because every game fits clues differently.
// ===================================================================
const COMMON = "aniekutrsmdlbghpoycwjfvzxqk".split("");

export function letterHint(secret, hints = []) {
  const word = String(secret || "");
  if (word.length < 2) return null;
  const done = new Set(hints.filter((h) => h.type === "letter").map((h) => h.index));
  const free = [];
  for (let i = 0; i < word.length; i++) if (!done.has(i)) free.push(i);
  if (free.length <= 1) return null; // never give the whole word away
  const index = free[Math.floor(Math.random() * free.length)];
  const letter = word[index].toUpperCase();
  return { type: "letter", index, letter, text: `Letter ${index + 1} is “${letter}”` };
}

export function ruleHint(secret, hints = [], alsoKnownAbsent = []) {
  const inWord = new Set(String(secret || "").toLowerCase().split(""));
  const used = new Set(alsoKnownAbsent.map((c) => String(c).toLowerCase()));
  for (const h of hints) if (h.type === "rule" && Array.isArray(h.letters)) h.letters.forEach((c) => used.add(c.toLowerCase()));
  const pool = COMMON.filter((c) => !inWord.has(c) && !used.has(c));
  if (!pool.length) return null;
  const top = pool.slice(0, Math.max(3, Math.min(pool.length, 10)));
  const picked = [];
  while (picked.length < 3 && top.length) picked.push(top.splice(Math.floor(Math.random() * top.length), 1)[0]);
  const letters = picked.map((c) => c.toUpperCase());
  return { type: "rule", letters, text: `Not in the word: ${letters.join(", ")}` };
}
