# Update 55 - Secret words for Bahasa Indonesia / Bahasa Melayu (Malaysia): quality filter

Goal: the SECRET words (the answers) of the Indonesian and Malay games must follow the same spirit as the English guidelines:
real, familiar words an average adult has met in daily life, school, work or media; nothing rare, archaic, regional, technical, slang,
or unsuitable for a public livestream. English rules were adapted to Indonesian / Malay grammar (affixes, one-language words).

## Result
| Secret words | Update 54 | Update 55 |
|---|---|---|
| Indonesian | 8,078 | **5,566** |
| Malay (Malaysia) | 7,939 | **5,326** |

Per length (Indonesian / Malay): 4 letters 554 / 526, 5 letters 1,070 / 999, 6 letters 760 / 733, 7 letters 936 / 867, 8 letters 856 / 826, 9 letters 626 / 616, 10+ letters about 760 / 760.
**Accepted GUESSES are unchanged** (Indonesian 93,701, Malay 92,143): a viewer can still guess any real word, it just will never be the answer.

## What was removed from the secret pool (still guessable)
* **Rare / archaic / literary** (e.g. tanur, gaham, gahar, tepak, jirat, kalor, luwak, zirah).
* **Regional / dialect / Javanese or Minang flavour** (ayem, edan, nyiru, ecer ...).
* **Technical or jargon** (parabola, kromosom, tipologi, sekunder, partikel, retorika ...).
* **Informal slang / abbreviations** (Indonesian: bikin, cewek, cowok, galau, gaul, lebay, mantul, jomblo, kangen, satpam, pemda, pemilu, puskesmas, kades ...).
* **Words mostly used in the OTHER language** (Malay mode: Indonesian-flavoured forms such as efek, enak, gizi, helm, pria, tapi, kondisi, listrik, setrika ...; Indonesian mode: Malay-flavoured words are kept out the same way).
* **Rare regional food / animal / plant / object names** (bakwan, klepon, serundeng, tenggiri, trembesi, rajungan, tempoyak ...).
* **Sensitive for a public livestream** (ganja, dadah, rokok, bugil, mesum, cumbu, sadis ...).
* **Affixed forms of rare verbs** (dibabat, dicolok, dihirup, menyemir, menyunting ... ). Common verbs keep all their forms (membaca, dibeli, menulis, berlari ...).
* Very long abstract nouns were kept ONLY when they are common (pendidikan, pengalaman, kebahagiaan, masyarakat ...). Odd ones (kosmopolitan, hortikultura, ensiklopedia, supranatural ...) were removed.

Not removed on purpose: normal everyday words, words common in BOTH languages, and the longer "hard" words everyone knows (they still lean to Medium / Hard rounds).

## How it works (so you can tune it)
* `server/shared/lang/roots/ms-obscure.txt` and `id-obscure.txt` - exact words that must never be a secret.
* `server/shared/lang/roots/ms-obscure-stems.txt` and `id-obscure-stems.txt` - rare ROOTS; every affixed form of them (di-, me-, ber-, pe-an ...) is also never a secret.
* To make a word eligible again: delete it from these files. To block one: add it (lowercase, space separated).
* Then run `npm run build:lexicon` and `npm run audit:lexicon` (both already run for this delivery; audit: OK, no cross-language leaks).
* `tools/review/removed-secrets-ms.txt` and `removed-secrets-id.txt` list EVERY word taken out of the secret pool, for you to review. If you disagree with some, remove them from the obscure files and rebuild.

## Honest limits
No internet / KBBI / Kamus Dewan lookup was possible in this build, so the judgement of "too rare" is mine, word by word, and strict on purpose. A few borderline words may still be in or out; use the review lists above to adjust.

## Deploy
Replace the whole folder (or copy over Update 54). No new npm packages, no `data/` changes.
Changed: `server/shared/lang/roots/*-obscure*.txt` (new), `server/shared/lang/generated/*`, `tools/build-lexicon.mjs`, `tools/review/*` (new), `package.json` (2.29.0).
