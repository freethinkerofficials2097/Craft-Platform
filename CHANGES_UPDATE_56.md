# Update 56 - Secret words for Bahasa Indonesia / Bahasa Melayu (Malaysia): ROOT WORDS FIRST + second quality pass

Same spirit as the English guidelines (real, familiar words an average adult has met; no rare / archaic / regional / jargon / slang / other-language
words; nothing unsuitable for a public livestream), adapted to Indonesian / Malay grammar, with one new strict rule: **root words come first.**

## Result
| Secret words | Update 55 | Update 56 | of which root / plain words | affixed or 9+ letters ("hard" tier) |
|---|---|---|---|---|
| Indonesian | 5,566 | **2,967** | 2,406 | 561 |
| Malay (Malaysia) | 5,326 | **2,887** | 2,389 | 498 |

Accepted GUESSES are unchanged (Indonesian 93,701, Malay 92,143): a viewer can still guess any real word, it just will not be the answer.
Longest answer length: Indonesian 13 letters, Malay 12 letters (the game picks this automatically from the pool size).

## The root-first rule
1. **Root / plain words** (rumah, makan, baca, sekolah ...) are the everyday tier. Normal rounds draw from them first.
2. **Affixed words** (meN-, ber-, ter-, peN-, per-an, -an, ke-an ...) are only allowed when they are everyday vocabulary, and they are always the "hard" tier
   (the difficulty engine already leans on that tier for Medium / Hard rounds, never for easy ones). An affixed word is allowed when
   * it is on `roots/affix-lexical-ok.txt` (hand-picked everyday words: membaca, bermain, pelajar, makanan, pendidikan, sekarang, terbaik ...), or
   * it is a **ber- verb or ke-an noun of a common root** from `roots/affix-common-stems.txt` (bertanya, berhasil, kebaikan, keadilan ...).
3. **Never a secret**: passive di- forms (dibeli, dikirim ...), meN-...-kan / -i forms and memper- forms that are not hand-picked, odd generated forms
   (hasilan, hentian, menggabung, mengubahkan, kedinginan, bersenyum ...), and ter- superlatives other than the common ones (terbaik, terbaru, terbesar ...).
4. Long plain words (9+ letters, mostly loanwords) are also "hard" tier, and only the common ones stay (komunikasi, teknologi, pendidikan ...).

## Second quality pass (roots)
Every remaining root word was re-read. Removed from the secret pool (still guessable):
* rare / archaic / literary (alim, ajal, arca, aren, daur, dera, fana, jati, kala, mumi, riak, umbi ...),
* regional or colloquial (acah, apik, awet, duit [Indonesian mode], ecer, edan, laga ...),
* technical / jargon (parameter, paradigma, kualitatif, antropologi, sosiologi, metropolis, kaligrafi, manuskrip ...),
* Malay-flavoured in Indonesian mode (bapa, budak, cakap, cawan, hutang, petang, putera, puteri, rentak, coklat, peribadi, sempadan ...),
* Indonesian-flavoured in Malay mode (kendaraan, kesempatan, kesulitan, keberhasilan, keterampilan, informasi, investasi, gravitasi, kompetisi,
  konstitusi, perusahaan, pemerintah, lingkungan, prioritas, kualitas, berhasil, berpikir, terjadi, perbaikan, pelayanan, ember, elang ...),
* very formal / abstract long words and rare institutions (bupati, apoteker, auditor, kerjasama, kedondong, kelenteng, sayembara, dirgahayu ...).
The full list of words taken out compared with Update 55 is in `tools/review/removed-secrets-update56-id.txt` and `removed-secrets-update56-ms.txt`
(the older Update 55 review lists are still there).

## How to tune (no coding)
* Make a word a secret again / block one: edit `server/shared/lang/roots/id-obscure.txt` or `ms-obscure.txt` (blocked exact words, lowercase, space separated).
* Allow one more affixed word: add it to `roots/affix-lexical-ok.txt`. Allow ber- / ke-an forms of a root: add the root to `roots/affix-common-stems.txt`.
* Then run `npm run build:lexicon` and `npm run audit:lexicon` (both already run for this delivery; audit: OK, no cross-language leaks, every secret is also an accepted guess).

## Honest limits
No internet / KBBI / Kamus Dewan lookup was possible in this build, so "too rare" is my own judgement word by word, and strict on purpose.
A few borderline words may still be in or out; use the review lists to adjust.

## Deploy
Replace the whole folder (or copy over Update 55). No new npm packages, no `data/` changes, no settings changes.
Changed: `server/shared/lang/roots/*` (new: `affix-common-stems.txt`, `affix-lexical-ok.txt`; extended: `id-obscure.txt`, `ms-obscure.txt`),
`server/shared/lang/generated/*` (rebuilt), `server/shared/lang/lang-stem.mjs` (new `rootStems`), `tools/build-lexicon.mjs`, `tools/review/*` (new lists),
`package.json` (2.30.0), `README.md` (banner).
