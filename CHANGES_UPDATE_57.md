# Update 57 - Bahasa Indonesia / Bahasa Melayu (Malaysia): cross-language clean-up

Goal: in Malay mode no Indonesian-only word may be a secret word or an accepted guess, and in Indonesian mode no Malay-only word.

## What was done
* Every shared root word (about 6,200 in `roots/common-*.txt` + `lexicon-common.js`) and both secret lists were re-read word by word.
* About 230 Indonesian-only words were added to `roots/ms-reject.txt` (for example kecepatan, ginjal, fisika, beda/berbeda, kondisi, informasi, impor, ekspor, jadwal, jembatan, keuangan, kendaraan, listrik, materi, metode, militer, olahraga, pikir/pikiran, wawancara, wisata, triliun, persen, salat, otomatis, standar, teknis, sendok, bebek, toko, tombol, kacamata, korupsi).
* About 50 Malay-only words were added to `roots/id-reject.txt` (for example fikir/fikiran, filem, jadual, kenderaan, hospital, kewangan, kelajuan, kejohanan, pingat, jurulatih, automatik, standard, teknikal, peratus, trilion, seramik, jubin, terowong, nenas, almari).
* A rejected word is removed from secrets, accepted guesses and the extended list, together with its affixed forms (berbeda, pemikiran of pikir, kerosakan ...). The same lists also clean any dictionary downloaded at run time (ID_DICTIONARY_URL / data/dictionary-*.txt).
* Borderline words (real in both, but flavoured) went to `ms-nosecret.txt`: guessable, never a secret.
* `tools/audit-lexicon.mjs` now checks 109 word pairs (was 81). `npm run audit:lexicon`: OK.

Result: secrets Indonesian 2,965, Malay 2,873. Guess dictionaries: Indonesian 93,440, Malay 90,385.

## Honest limits
No online dictionary was reachable here, so the review is my own judgement. If you still spot a word, add it (lowercase) to `server/shared/lang/roots/ms-reject.txt` (Indonesian-only) or `id-reject.txt` (Malay-only), then run `npm run build:lexicon` and `npm run audit:lexicon`.

## Deploy
Replace the whole folder. No new packages, no settings changes.
