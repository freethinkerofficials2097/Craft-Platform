# Update 65 - new game WORDLE (`/wordle/`)

WORDLE is a BLINDLE copy that uses the classic Word-O / Wordle clue colors (it was cloned from SHIFTLE with the color
shuffle taken out, so every host feature is already there).

**The clue.** After every guess each letter turns one of three colors, and the meanings never change:

| Color | Meaning |
|-------|---------|
| Green  | the letter is in the word and in the correct position |
| Yellow | the letter is in the word, but in the wrong position |
| Grey   | the letter is not in the word (or all its copies are already used) |

Duplicate letters follow the standard Wordle rule (a second E is only marked if the word really has a second E).
There are no number columns and no manual keyboard coloring.

**Tiles.** Every letter is its own rounded square, in the same green / yellow / grey look as the Word-O screenshots.

**Keyboard.** The A-Z keyboard colors itself: every key gets the same color its letter has on the tiles. A letter can
appear in several colors across guesses, so the best clue wins (green, then yellow, then grey). Host can switch it off in
Settings -> "Auto-color keyboard keys".

**Legend.** A short "What the colors mean" legend (Green / Yellow / Grey with their meanings) is a normal block of the page
flow, directly under the floating message window and above the keyboard + guess board, so nothing overlaps. Host option:
Settings -> Color legend -> *Show the color legend above the board* (default ON, remembered in `data/wordle-settings.json`).

**Scoring (Live).** 1 point for every guess that fits the board, 5 points for solving the round. "Fits the board" = Strict fit
(ON by default): the guess must also fit the colors of every earlier guess; the host can switch Strict fit off in Settings.
The automatic starter word never scores; a word already on the board is skipped.

**Everything else** is the same as BLINDLE / SHIFTLE: unlimited guesses, automatic starter word, 3 hint types, Live / Test /
Offline, word language (EN / ID / MS and mixes, also via the toolbar's 🌏 button), difficulty tiers, win celebration,
leaderboards, Color shades (green / yellow / grey), Records, shared TikTok connection from HOME.

## Files
- NEW `server/wordle/wordle-server.js`, `server/wordle/public/wordle-index.html`, `wordle-game.js`, `wordle-style.css`
- NEW `server/shared/wordle-settings-store.js`
- Registered in: `server.js`, `server/shared/home-cards-store.js`, `server/shared/hint-config-store.js`,
  `server/engagement/engagement-hub.js`, `public/index.html` (home card), `public/home.js`, `public/home-views.js` (NEW tag),
  `public/shared/platform-sync.js`, `public/shared/records-ui.js`, `public/shared/game-chrome.css`,
  `public/shared/color-shades.js`, `package.json`, `README.md`, `DEPLOY_GUIDE.md`.

SHIFTLE is unchanged (including update 64: legend meanings off by default + 🌏 Languages button).
