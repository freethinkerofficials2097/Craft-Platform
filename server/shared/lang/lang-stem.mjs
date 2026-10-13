// lang-stem.mjs (update 54) - candidate root(s) of an Indonesian / Malay word after removing meN- peN- ber- ter- di- per- ke- se- and -an -kan -i.
// Used by build-lexicon.mjs (to drop affixed forms of one-language-only words) and by audit-lexicon.mjs.
const PRE = [
  ["", [""]],
  ["di", [""]], ["ke", [""]], ["se", [""]], ["ber", [""]], ["be", ["r"]], ["ter", [""]], ["te", ["r"]], ["per", [""]], ["pe", ["r"]], ["pel", ["ajar"]],
  ["me", [""]], ["mem", ["b", "p", "f", "v"]], ["men", ["d", "t", "c", "j", "z"]], ["meng", ["", "k", "g", "h"]], ["meny", ["s"]], ["menge", [""]],
  ["pem", ["b", "p", "f", "v"]], ["pen", ["d", "t", "c", "j", "z"]], ["peng", ["", "k", "g", "h"]], ["peny", ["s"]], ["penge", [""]],
  ["memper", [""]], ["diper", [""]], ["mempe", ["r"]], ["dipe", ["r"]]
];
const SUF = ["", "an", "kan", "i", "nya", "kannya", "kah", "lah"];
export function candidateStems(w) {
  const out = new Set();
  for (const [p, lead] of PRE) {
    if (!w.startsWith(p)) continue;
    for (const s of SUF) {
      if (s && !w.endsWith(s)) continue;
      const core = w.slice(p.length, s ? w.length - s.length : w.length);
      if (core.length < 3) continue;
      for (const l of lead) {
        const c = p === "pel" ? l : l + core; // "pelajaran" -> ajar
        if (c.length >= 4 && c !== w) out.add(c);
      }
      // "mengambil" style: vowel start has no restoration; "menulis": t dropped
    }
  }
  // double affix: ke-...-an with ber-/per- etc. e.g. "keberhasilan"
  for (const p2 of ["keber", "keter", "keper", "kepe", "keme", "kese", "peran", "perse", "mempe", "dipe", "diper", "memper"]) {
    if (w.startsWith(p2)) for (const s of SUF) if (!s || w.endsWith(s)) {
      const c = w.slice(p2.length, s ? w.length - s.length : w.length);
      if (c.length >= 4) out.add(c);
    }
  }
  return out;
}
/** words of `list` that are affixed forms of a word in `rejected` (and cannot also be explained by a valid, non-rejected stem) */
export function derivedOfRejected(w, rejected, valid) {
  const cands = candidateStems(w);
  let hit = false;
  for (const c of cands) if (rejected.has(c)) { hit = true; break; }
  if (!hit) return false;
  for (const c of cands) if (!rejected.has(c) && valid.has(c)) return false; // ambiguous: a real shared stem explains it
  return true;
}

// Spelling PATTERNS that only exist in one language (key = the language that must NOT contain them):
//   Bahasa Indonesia must not contain Malay -iti / -isyen / kahwin- forms;  Bahasa Melayu (Malaysia) must not contain Indonesian -itas / sepeda- / butuh- forms.
export const OTHER_LANG_RE = {
  id: /[a-z]{3,}iti$|isyen$|^(ber|mem|men|meng|di)?kahwin|^per?kahwinan$|^(pe)?ngahwin/,
  ms: /itas(an|nya)?$|^(ber|mem|di|me)?sepeda|^mem?butuh|butuhan$|^kese?hatan$/
};
/** Removes from an external word list (a downloaded / dropped-in dictionary) every word that exists only in the OTHER language. */
export function cleanExternalList(lang, words, rejectWords) {
  const rejected = new Set([...rejectWords].filter((w) => w.length >= 4));
  const out = new Set();
  for (const w of words) if (!rejectWords.has(w) && !OTHER_LANG_RE[lang].test(w)) out.add(w);
  for (const w of [...out]) if (derivedOfRejected(w, rejected, out)) out.delete(w);
  return out;
}

// ---------- update 56: stems for the "roots first" secret-word filter ----------
// Like candidateStems(), but it also keeps the consonant that stays after a nasal prefix (membaca -> baca, mencari -> cari,
// mengambil -> ambil) and restores the dropped one (memukul -> pukul, menulis -> tulis, mengirim -> kirim, menyapu -> sapu).
const NASAL = {
  mem: ["", "p"], men: ["", "t"], meng: ["", "k"], meny: ["s"], menge: [""], me: [""],
  pem: ["", "p"], pen: ["", "t"], peng: ["", "k"], peny: ["s"], penge: [""], pe: [""]
};
const PLAIN = ["di", "ke", "se", "ber", "ter", "per", "memper", "diper", "pel", "be", "te"];
const SUF2 = ["", "an", "kan", "i", "nya", "kannya", "kah", "lah"];
export function rootStems(w) {
  const out = new Set();
  const pre = [["", [""]]];
  for (const [p, leads] of Object.entries(NASAL)) pre.push([p, leads]);
  for (const p of PLAIN) pre.push([p, p === "be" || p === "te" ? ["r"] : [""]]);
  pre.push(["keber", [""]], ["keter", [""]], ["keper", [""]], ["kese", [""]], ["perse", [""]], ["pere", [""]]);
  for (const [p, leads] of pre) {
    if (!w.startsWith(p)) continue;
    for (const s of SUF2) {
      if (s && !w.endsWith(s)) continue;
      if (p === "" && s === "") continue;
      const core = w.slice(p.length, s ? w.length - s.length : w.length);
      if (core.length < 3) continue;
      for (const l of leads) {
        const c = l + core;
        if (c.length >= 4 && c !== w) out.add(c);
      }
      if (p === "pel") out.add("ajar");
    }
  }
  return out;
}
