# Update 91 - new game LINEDLE (`/linedle/`)

LINEDLE is a BLINDLE copy built on the Wave-O idea. Open it from the HOME screen (new card) or at `/linedle/`.

## The wave board
- One vertical **pillar** per letter of the secret word (5 pillars = a 5-letter word; the pillar count always equals the word length chosen in Settings).
- A **light-blue wave-line** runs through the pillars. The height where it crosses a pillar is the letter at that position: **the lower the line, the closer to A; the higher, the closer to Z** (A at the bottom, Z at the top; an A-F-K-P-U-Z scale is drawn on the left).
- Every guess is drawn as a **white wave-line** with the same rule (the newest guess is the bold white line; the 4 guesses before it stay as faint dotted trails).
- Each pillar also shows a **green / yellow / grey** dot (with the letter) on the white line.
- **The round is won when the white line sits exactly on the blue line.** When the round ends the letters appear under the pillars.

## Guesses and score
- Any real word of the right length is accepted (a word already on the board is skipped). Letters turn green (right letter, right spot), yellow (in the word, wrong spot) or grey (not in the word). No number columns.
- Scoring: **1 point** for the guess that solves the round; nothing else scores.
- Strict fit and Starter word are OFF by default (host can switch them on in Settings).

## Layout (one normal flow, nothing overlaps)
floating message window -> **legend** -> wave board -> guess board.
The legend (customizable like the other games) explains pillars, the blue wave, the white wave, height A-Z, green / yellow / grey, score, round-over reveal and the floating window.

## Files
- NEW `server/linedle/linedle-server.js`, `server/linedle/public/linedle-index.html`, `linedle-game.js`, `linedle-style.css`
- Registered in: `server.js`, `home-cards-store.js`, `hint-config-store.js`, `engagement-hub.js`, `length-panel-hub.js`, `public/index.html`, `home.js`, `home-views.js`, `platform-sync.js`, `records-ui.js`, `game-chrome.css`, `color-shades.js`, `legend.js`, `package.json`, `DEPLOY_GUIDE.md`.
- Color shades: green / yellow / grey plus the light-blue and white wave colors are adjustable in Settings -> Color shades.
