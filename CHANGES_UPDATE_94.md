# Update 94 - new game CITYDLE (`/citydle/`)

CITYDLE is a BLINDLE sibling (built on the FIXLE board) where chat guesses a SECRET CITY. Open it from the HOME screen (new card) or at `/citydle/`.

## Clues
- **Green** = the right city (round won) - **Yellow** = right country, wrong city - **Orange** = right continent, wrong country - **Grey** = wrong continent (and so wrong country).
- Instead of BLINDLE's number columns every guess has 2 columns: a **direction arrow** (toward the secret city, 8 compass directions) and the **distance in km** from the secret city.
- No keyboard / no manual coloring.

## Board
- The newest guess is repeated in a framed row at the very top (a darker shade of its color; it turns green when the city is found).
- Below it every guess is listed from the **nearest to the farthest** city (same system as FIXLE).
- A small column header (City / Direction / Distance) sits above the rows.

## Guesses
- Chat types a city name: spaces, hyphens, capitals and accents do not matter ("sao paulo", "São Paulo", "saopaulo"). Common aliases work (NYC, Bombay, Saigon, Peking, Munchen ...). Over 500 cities on every continent (list in `server/citydle/cities-data.js`; add a city by adding one entry).
- A city already on the board is skipped (the floating window says so).

## Score
- **5 points** for the guess that finds the secret city; nothing else scores.

## Legend + layout
floating message window -> **legend** (explains every color, the arrow, the km, the score, the starter city, the floating window) -> guess board -> hints. One normal flow; nothing overlaps.

## Settings
Mode / difficulty (Normal = famous + well-known, Medium = well-known + lesser-known, Hard = lesser-known, Random), starter city on/off, hints (suggest a city that fits all clues / reveal a letter / rule out letters), Color shades (green, yellow, orange, grey, dark badges), win celebration, auto-continue. Word-length and language settings are not used.

## Files
- NEW `server/citydle/` (`citydle-server.js`, `cities.js`, `cities-data.js`, `public/citydle-index.html`, `citydle-game.js`, `citydle-style.css`)
- Registered in: `server.js`, `home-cards-store.js`, `hint-config-store.js`, `engagement-hub.js`, `public/index.html`, `home.js`, `home-views.js`, `platform-sync.js`, `records-ui.js`, `game-chrome.css`, `color-shades.js`, `legend.js`, `package.json`, `DEPLOY_GUIDE.md`.
