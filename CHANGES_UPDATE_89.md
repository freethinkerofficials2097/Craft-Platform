# Update 89 - new game MINEDLE (`/minedle/`)

MINEDLE is a BLINDLE copy built on the Sweep-O idea. Every round shows a grid of tiles; each tile has a letter and a number.

## The grid
- 4-5 letter words: 5x5. 6-9 letters: 8x8. 10-20 letters: 10x10.
- The number = how many touching tiles (diagonals included, the tile itself not counted) hold a letter used in the secret word.
- Every distinct letter of the secret word is on the grid (about 40% of tiles carry word letters); the rest are decoys.

## Marking (host, shared by every screen, reset each round)
- Tap a tile: 1x blue (letter is in the word), 2x red (not in the word), 3x clear. All tiles with the same letter change together.
- Blue letters fill the Letter bank (own teal color, customizable in Color shades). The host can hide or show it in Settings -> Letter bank (shared by every screen, remembered).
- "Reset marks" (own purple color, customizable in Color shades) clears everything. The host can hide or show it in Settings -> Reset marks button (shared by every screen, remembered).
- When a round is solved (or given up) every tile is painted automatically: blue = letter is in the word, red = not, so the audience sees the answer's letters.

## Guesses and score
- A guess must be a real word of the right length made only of grid letters. Letters turn green / yellow / grey. No number columns.
- Scoring: 1 point for the guess that solves the round; nothing else scores.
- Strict fit and Starter word default to OFF in MINEDLE (host can switch them on in Settings).

## Layout (one normal flow, nothing overlaps)
floating message window -> legend -> grid + Reset marks + Letter bank -> guess board.
The legend (customizable like the other games) explains numbers, blue, red, 3-tap clear, Letter bank, auto-reveal, green/yellow/grey, score and Reset marks.

## Files
- NEW `server/minedle/minedle-server.js`, `server/minedle/public/minedle-index.html`, `minedle-game.js`, `minedle-style.css`
- `server/shared/strict-fit-store.js`, `starter-word-store.js`: optional per-game default.
- Registered in: `server.js`, `home-cards-store.js`, `hint-config-store.js`, `engagement-hub.js`, `public/index.html`, `home.js`, `home-views.js`, `platform-sync.js`, `records-ui.js`, `game-chrome.css`, `color-shades.js`, `legend.js`, `package.json`, `DEPLOY_GUIDE.md`.
