# Update 53 - FINDLE: many more puzzles in every language

Only the three FINDLE puzzle data files changed. No server, client, settings or `data/` changes - deploy over Update 52 (or on its own as one folder).

| Puzzles per difficulty | Update 52 (easy / medium / hard) | Update 53 (easy / medium / hard) |
|---|---|---|
| English | 52 / 54 / 53 | **99 / 129 / 100** |
| Indonesian | 17 / 8 / 8 | **54 / 49 / 46** |
| Malay (Malaysia) | 17 / 8 / 8 | **54 / 49 / 46** |

* All existing puzzles are kept exactly as they were; the new ones are added after them.
* Mixed modes (EN+ID, EN+MS, MS+ID, all) use the same lists, so they get the bigger pool automatically.
* A theme is never repeated until every theme of that difficulty has been played once (existing behaviour), so the longer lists mean far fewer repeats per live.
* English new puzzles follow the existing length rule (easy 3-5 letters, medium 5-7, hard 7-9). Indonesian/Malay allow up to 12 letters because their words are longer.
* Indonesian and Malay each use their own spelling where it differs (e.g. kendaraan/kenderaan, telepon/telefon, sore/petang, ban/tayar, kasur/tilam), and Malay-only or Indonesian-only words are not shared between the two lists.
* Every puzzle was test-built into a grid (about 6,000 test grids): all words always placed, grids never larger than 13x13.

Files changed: `server/findle/findle-puzzles.cjs`, `findle-puzzles-id.cjs`, `findle-puzzles-ms.cjs`.
To add your own themes later, add `{ "theme": "...", "words": ["..."] }` rows to the right tier (lowercase a-z only, 7-15 words).
