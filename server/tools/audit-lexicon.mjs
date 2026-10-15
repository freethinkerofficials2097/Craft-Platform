// audit-lexicon.mjs  (update 54)
// Checks that no word (or affixed form of a word) that exists ONLY in Bahasa Indonesia is a secret word / accepted guess
// in Bahasa Melayu (Malaysia) mode, and vice versa.   Run:  node tools/audit-lexicon.mjs      (exit code 1 on any leak)
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { derivedOfRejected } from "../server/shared/lang/lang-stem.mjs";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const LANG = path.join(ROOT, "server/shared/lang");
const GEN = path.join(LANG, "generated");
const RT = path.join(LANG, "roots");
const lines = (f) => (fs.existsSync(f) ? fs.readFileSync(f, "utf8").split("\n") : []);
const words = (f) => lines(f).flatMap((l) => (l.trim().startsWith("#") ? [] : l.trim().split(/\s+/))).filter((w) => /^[a-z]+$/.test(w));
const load = (f, tab) => new Set(lines(f).map((l) => l.trim().split("\t")[0]).filter(Boolean));
const SECRET = { id: load(path.join(GEN, "secret-id.txt")), ms: load(path.join(GEN, "secret-ms.txt")) };
const GUESS = {};
for (const l of ["id", "ms"]) GUESS[l] = new Set([...load(path.join(GEN, `dict-${l}.txt`)), ...load(path.join(GEN, `dict-ext-${l}.txt`)), ...SECRET[l]]);

// 1) the reject lists: words that exist ONLY in the other language
const ONLY = { // lang -> set of words that must NOT be in that language
  ms: new Set([...words(path.join(RT, "ms-reject.txt"))]),
  id: new Set([...words(path.join(RT, "id-reject.txt"))])
};
// 2) a hand-checked table of pairs  [Indonesian form, Malay form]  (both directions must hold)
const PAIRS = `
mobil kereta|sepeda basikal|sepatu kasut|celana seluar|kamar bilik|kantor pejabat|dokter doktor|dosen pensyarah|stasiun stesen|universitas universiti
televisi televisyen|telepon telefon|kakek datuk|istri isteri|tetangga jiran|kemarin semalam|karena kerana|bahwa bahawa|sopir pemandu|tentara tentera
gubernur gabenor|jenderal jeneral|parlemen parlimen|partai parti|pasien pesakit|kulkas peti|bioskop panggung|bandara lapangan|handuk tuala|gorden langsir
agustus ogos|desember disember|maret mac|juni jun|juli julai|senin isnin|kamis khamis|jumat jumaat|delapan lapan|kesehatan kesihatan|sehat sihat
resmi rasmi|rekor rekod|rusak rosak|coba cuba|jahe halia|film filem|sirup sirap|sosis sosej|semangka tembikai|wortel lobak|terong terung|cabai cili
kualitas kualiti|kuantitas kuantiti|aktivitas aktiviti|kreativitas kreativiti|identitas identiti|kapasitas kapasiti|komunitas komuniti|stabilitas stabiliti
pensiun pencen|perbedaan perbezaan|kepemimpinan kepimpinan|salju salji|surga syurga|nomor nombor|obat ubat|taksi teksi|truk lori|uang wang
kampanye kempen|karcis tiket|arsitek arkitek|miliar bilion|tauge taugeh|wasit pengadil|omset pusing|sembako barang|pulsa kredit|surel emel
kecepatan kelajuan|fisika fizik|kondisi keadaan|impor import|ekspor eksport|informasi maklumat|beda beza|jembatan jambatan|pikiran fikiran|film filem|jadwal jadual|kendaraan kenderaan|keuangan kewangan|olimpiade olimpik|otomatis automatik|otonomi autonomi|sendok sudu|sastrawan sasterawan|triliun trilion|persen peratus|standar standard|teknis teknikal|konkret konkrit|keramik seramik|ubin jubin|akuntan akauntan|insinyur jurutera|bagian bahagian
`.trim().split(/\s*\|\s*|\n/).map((p) => p.trim().split(/\s+/)).filter((p) => p.length === 2);
// words that are valid in BOTH on purpose (not leaks): kereta, kemarin->ID only etc. are handled by the table only where truly exclusive
// borderline words (real but rare / mostly the other language): guessable, but NEVER a secret word -> listed in <lang>-nosecret.txt
const NOSECRET = { ms: new Set([...words(path.join(RT, "ms-nosecret.txt")), ...words(path.join(RT, "nosecret.txt"))]), id: new Set([...words(path.join(RT, "id-nosecret.txt")), ...words(path.join(RT, "nosecret.txt"))]) };
// words that are ordinary in BOTH languages although they look like a pair (different meaning or both spellings used)
const SHARED_OK = new Set(["kereta", "polis", "pusing", "tiket", "kredit", "barang", "peti", "panggung", "lapangan", "pemandu", "tuala", "lobak", "tembikai", "kampanye", "uang", "wang", "kempen"]);

let bad = 0;
const report = (kind, lang, w, where) => { bad++; console.log(`LEAK  [${lang.toUpperCase()} mode] ${kind}: ${w}  (${where})`); };

for (const [idw, msw] of PAIRS) {
  if (!SHARED_OK.has(idw)) {
    if (GUESS.ms.has(idw) && !NOSECRET.ms.has(idw)) report("Indonesian-only word accepted", "ms", idw, "guess");
    if (SECRET.ms.has(idw)) report("Indonesian-only word is a secret", "ms", idw, "secret");
  }
  if (!SHARED_OK.has(msw)) {
    if (GUESS.id.has(msw) && !NOSECRET.id.has(msw)) report("Malay-only word accepted", "id", msw, "guess");
    if (SECRET.id.has(msw)) report("Malay-only word is a secret", "id", msw, "secret");
  }
}
// reject-list words themselves
for (const lang of ["ms", "id"]) for (const w of ONLY[lang]) {
  if (GUESS[lang].has(w)) report("rejected word accepted", lang, w, "guess");
  if (SECRET[lang].has(w)) report("rejected word is a secret", lang, w, "secret");
}
// 3) affixed forms of a rejected word (meN-, di-, ber-, ter-, peN-, per-, ke-an, se-, -an, -kan, -i) - ambiguity-aware, same logic as the builder
for (const lang of ["ms", "id"]) {
  const rejected = new Set([...ONLY[lang]].filter((w) => w.length >= 4));
  const valid = new Set(GUESS[lang]);
  for (const r of ONLY[lang]) valid.delete(r);
  for (const w of GUESS[lang]) if (derivedOfRejected(w, rejected, valid)) report("affixed form of a one-language-only word", lang, w, "guess");
  for (const w of SECRET[lang]) if (NOSECRET[lang].has(w)) report("borderline word is a secret", lang, w, "secret");
}
// 4) spelling patterns that only exist in one language
for (const w of GUESS.ms) if (/[a-z]{3,}itas$/.test(w)) report("Indonesian -itas spelling", "ms", w, "guess");
for (const w of GUESS.id) if (/[a-z]{3,}iti$|isyen$/.test(w)) report("Malay -iti/-isyen spelling", "id", w, "guess");
console.log(bad ? `\n${bad} problem(s) found.` : `OK - no cross-language leaks found.  (secret: ID ${SECRET.id.size}, MS ${SECRET.ms.size}; guessable: ID ${GUESS.id.size}, MS ${GUESS.ms.size}; pairs checked: ${PAIRS.length})`);
process.exit(bad ? 1 : 0);
