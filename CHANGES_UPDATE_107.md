# Update 107 - NEW GAME: TOWNDLE (Malaysia places)

TOWNDLE is a copy of CITYDLE that only knows **Malaysia**. Chat guesses a secret **city, municipal, district or town**.
It lives at `/towndle/` (Socket.IO namespace `/towndle`) and has its own card on the HOME page.

## Colors
| Color | Meaning |
|---|---|
| GREEN | the right place (round won, 5 points in Live mode) |
| YELLOW | the right **state**, but the wrong place. 14 states = 13 states + the 3 Federal Territories (Kuala Lumpur, Putrajaya, Labuan) counted together as the 14th |
| ORANGE | a **direct neighbour** of the secret place (same district, or a district that touches it - the state border does not matter) |
| GREY | wrong place, not a neighbour and not in the right state |

A place that is both a neighbour and in the right state shows **ORANGE** (the more exact clue wins).
Like CITYDLE, every guess also shows a direction arrow and the distance in km (or miles), the board lists the nearest guesses first,
and the newest guess is repeated in a framed top row.

## Difficulty (Settings -> Difficulty)
* **Normal** - famous + well-known places (tier 1 + 2)
* **Medium** - well-known + lesser-known (tier 2 + 3)
* **Hard** - lesser-known and rare places only (tier 3)
* **Random** - every tier mixed
Settings -> "Secret place state" lets the host limit the SECRET place to the ticked states (chat can still guess any place).

## Place list
`server/towndle/towns-data-1..4.js` (one line per district: `State|District|Place lat lon <tier><type>`), borders in
`server/towndle/towns-adjacency.js`. See `data/README-towns.txt` to make the list bigger (towns-extra.txt or a GeoNames `MY.txt`).
`npm run check:towns` checks the list (counts, unknown district names, suspicious coordinates).

## Files
* NEW `server/towndle/` (server, `towns.js`, data, `public/` page), `server/shared/towndle-colors-store.js`, `tools/check-towns.mjs`,
  `data/README-towns.txt`, `data/towns-extra.txt`
* Registered in: `server.js`, `server/shared/home-cards-store.js`, `server/shared/hint-config-store.js`, `server/engagement/engagement-hub.js`,
  `public/index.html` (card), `public/home.js`, `public/home-views.js`, `public/shared/{legend.js,platform-sync.js,records-ui.js,game-chrome.css}`
* `package.json`: version 2.56.0, new script `check:towns`

Run `npm install` as usual (no new dependencies). Redeploy the whole folder.
