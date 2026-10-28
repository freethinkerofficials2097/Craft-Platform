# Update 111 - TOWNDLE: place database merged with the 2,400-place list

Based on update 110 (includes the AFK Autopilot panel fix). Only the TOWNDLE place data was taken from the uploaded
"CRAFT_UPDATE_108 (ALTERNATE 2400)" project; none of its other features were copied.

## Result
| | before | after |
|---|---|---|
| Places with a checked position (can be the secret place) | 1,352 | 1,352 (untouched) |
| Bulk places (guessable, approximate position) | 0 | **1,170** |
| **Total places** | 1,352 | **2,522** (158 districts, all 14 states) |

## How it was merged
* New data files `server/towndle/towns-bulk-1..4.js` (unchanged from the uploaded list: 1,527 names, one line per district).
* They are loaded by the platform's CURRENT place book (`towns.js`), LAST - after every place with a real position and after their
  spelling-variant keys - so nothing that worked before can change. Verified: all 4,227 old lookup keys still resolve to the same place;
  all 1,352 original places are identical.
* **Skipped on purpose (357 names):** 286 already in the book, 28 the same place under another spelling / prefix (Redang = Pulau Redang,
  Wakaf Baharu = Wakaf Bharu, Seri = Sri ...) or filed under a wrong neighbouring state, 25 whose name is already taken by an alias,
  18 unusable (under 4 letters, e.g. "Jus", "Rim", or containing a digit, e.g. "Seksyen 9 Bangi" - the matcher reads letters only).
  Kampung X / Felda X are NOT treated as the same place as Gunung X / Pulau X.
* The same name in a far-away other state is kept as a different place (Jelutong Johor vs Jelutong Penang); the second one is typed with its state.
* No coordinates exist in the list, so each new place is put a few km from a REAL place of its own district. The state and neighbour
  colors are therefore exact; distance and arrow are a rough guide.

## Game behaviour
* Bulk places can be GUESSED but never become the secret place and are never used for hints (the platform already did this for non-curated places).
* The page shows **~** in front of the distance of a bulk place (floating window, board, tooltips) and a line in "How to play" explains it.
* Everyday chat words are not taken for guesses: 205 typical chat phrases give exactly the same result as before. Single words that are
  also everyday words (Salak, Kijang, Jambu ...) must be typed with the state, as before.
* A place from `data/towns-extra.txt` or GeoNames (real position) always wins over a bulk duplicate.

## Files
NEW `server/towndle/towns-bulk-1..4.js` | `server/towndle/towns.js` (merge loader) | `server/towndle/towndle-server.js` (approx flag, log line)
`server/towndle/public/towndle-game.js` + `towndle-index.html` (the "~") | `tools/check-towns.mjs` (bulk report) | `data/README-towns.txt` | version 2.60.0.

## Tested
Syntax check of every .js/.mjs/.cjs; old-vs-new regression of all lookup keys; typeability of all 1,170 new places exactly as the page shows them;
20,000 random clue pairs (levels, distance, bearing); same-district = orange / same-state = yellow for approximate places; `npm run check:towns`.
No new dependencies. Run `npm install` as usual and redeploy the whole folder.
