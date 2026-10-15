# Update 54 - Bahasa Indonesia / Bahasa Melayu (Malaysia) word separation

Goal: when you play **only Bahasa Melayu (Malaysia)**, no word that exists only in Indonesian may be a secret word or an accepted guess - and the other way round. Mixed modes (MS+ID, EN+MS, EN+ID, all) are unchanged.

## What was wrong
The "shared" word lists (words said to be identical in both languages) contained a lot of one-language words, e.g. in Malay mode: *kantor, kamar, dokter, mobil, sepatu, celana, bioskop, nomor, obat, rusak, coba, film, jahe, salju, truk, uang, wasit, kampanye, khawatir, tauge ...* and in Indonesian mode: *tentera, terung, cuba, rosak, halia, cili, filem, fail, solat, peladang, rekod, pasaraya, atuk ...* Their affixed forms (ber-, me-, pe-an, ke-an ...) came along too (berobat, perkantoran, bertetangga, kualitas...).

## What changed
| | before | after |
|---|---|---|
| Indonesian secret words | 8,110 | 8,078 |
| Malay secret words | 8,119 | 7,939 |
| Indonesian accepted guesses | 96,635 | 93,701 |
| Malay accepted guesses | 95,912 | 92,143 |

* **Hard reject lists** (`server/shared/lang/roots/ms-reject.txt` = Indonesian-only words, `id-reject.txt` = Malay-only words). A rejected word is never a secret, never an accepted guess, and gets no derived forms in that language. About 200 words each, checked word by word. Words that are real in BOTH languages (e.g. *peraturan, doktor, polis, lori, peluang, maklumat, pengacara, kaus, jamban*) were taken OUT of the old reject lists, so valid guesses are no longer refused.
* **"Never a secret" lists** (`ms-nosecret.txt`, `id-nosecret.txt`): borderline words (rare, colloquial or mostly used in the other language, e.g. Malay mode: *bapak, bensin, laptop, cabai, toko*; Indonesian mode: *isteri, datuk, bilik, jadual, encik*). Still accepted as a guess, never picked as the secret.
* **Spelling patterns** removed automatically: Malay `-iti / -isyen / kahwin-` can never appear in Indonesian mode; Indonesian `-itas / sepeda- / butuh-` can never appear in Malay mode.
* **Stem-aware pruning**: every affixed form of a rejected word is removed as well (berobat, pengobatan, perkantoran, bertetangga, penyetir ...), unless a real shared word explains it.
* Junk guess forms such as *kamaran, dokteran, bahwaan* (plain noun + "-an") are no longer generated.
* **Downloaded / dropped-in dictionaries** (`data/dictionary-id.txt`, `data/dictionary-ms.txt`, `ID_DICTIONARY_URL`, `MS_DICTIONARY_URL`) are now cleaned with the same reject lists, so a big external list can not bring the other language's words back.
* **FINDLE Malay puzzles**: replaced Indonesian-only words (*wortel, jahe, bakso, bapak, pepaya, polisi*) with Malay ones (*lobak, halia, karipap, bapa, tembikai, polis*). The Indonesian puzzles were checked too - nothing to change.
* A few valid words that were missing from the guess lists were added (`ms-extra-dict.txt`, `id-extra-dict.txt`).

## New tool: the audit
`npm run audit:lexicon` (or `node tools/audit-lexicon.mjs`) checks a hand-made table of ~80 Indonesian/Malay word pairs, every reject-list word, every affixed form of them and the spelling patterns against the generated lists. It exits with an error if anything leaks. Result for this update: **OK - no cross-language leaks**. An independent 290-word test battery was also run against the live game module (e.g. `kantor`, `dokter`, `sepatu` are refused in Malay mode; `pejabat`, `kasut`, `seluar` are refused in Indonesian mode; both are accepted in MS+ID mode).

## How to keep it clean
1. Found a wrong word? Add it (lowercase, space separated) to `server/shared/lang/roots/ms-reject.txt` (Indonesian-only, must not appear in Malay mode) or `id-reject.txt` (Malay-only, must not appear in Indonesian mode). Use `*-nosecret.txt` if the word is real in both but should never be the secret.
2. Run `npm run build:lexicon` then `npm run audit:lexicon`, restart the server.

## Deploy
Replace the whole folder (or copy it over Update 53). No new npm packages, no `data/` changes. Generated files in `server/shared/lang/generated/` are already rebuilt.
Changed: `server/shared/lang/roots/*reject*|*nosecret*|*extra-dict*`, `server/shared/lang/generated/*`, `server/shared/lang/lang-stem.mjs` (new), `server/shared/word-language.js`, `server/findle/findle-puzzles-ms.cjs`, `tools/build-lexicon.mjs`, `tools/audit-lexicon.mjs` (new), `package.json` (2.28.0).
