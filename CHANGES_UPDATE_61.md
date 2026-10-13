# Update 61 - new game FORBACKLE (`/forbackle/`)

FORBACKLE is a BLINDLE copy built on the BETWEEN-O idea (it was cloned from RANGEDLE, so every host feature is already there).

**The clue.** After every guess each letter is compared with the letter in the same spot of the hidden word:

| Color  | Meaning |
|--------|---------|
| Green  | the letter is correct |
| Purple | go **forward** - the hidden letter comes *after* your letter in the alphabet |
| Pink   | go **backward** - the hidden letter comes *before* your letter in the alphabet |

Every letter is its own tile (tiles are never joined). Pink tiles are rounded on the left side only, purple tiles on the right side only, green tiles have the usual tile shape of the other word games.

**Keyboard.** A small A-M / N-Z reference. No manual coloring, no number row. Every key colors itself from the board (all guesses of the round, not only the visible ones): green if that letter was ever matched in the right spot, otherwise the color it had in the latest guess that used it. Host can switch it off in Settings -> "Auto-color keyboard keys".

**Legend.** A "What the colors mean" legend (green / purple / pink) is placed directly under the floating message window and above the keyboard + guess board. It is a normal block in the page flow, so nothing overlaps. It is the shared platform legend, so the host can still move / resize / reword it in Settings -> Color legend.

**Scoring (Live).** 1 point for every guess that fits the board, 5 points for solving the round. "Fits the board" = Strict fit (ON by default): the guess must also fit the colors of every earlier guess. The host can switch Strict fit off in Settings.

**Everything else** is the same as RANGEDLE / BLINDLE: unlimited guesses, automatic starter word, 3 hint types, Live / Test / Offline, word language (EN / ID / MS), difficulty tiers, win celebration, leaderboards, Color shades (3 colors), Records, shared TikTok connection from HOME.

## Files
- NEW `server/forbackle/forbackle-server.js`, `server/forbackle/public/forbackle-index.html`, `forbackle-game.js`, `forbackle-style.css`
- Registered in: `server.js`, `server/shared/home-cards-store.js`, `server/shared/hint-config-store.js`, `server/engagement/engagement-hub.js`, `public/index.html` (home card), `public/home.js`, `public/home-views.js` (NEW tag), `public/shared/platform-sync.js`, `public/shared/records-ui.js`, `public/shared/game-chrome.css`, `public/shared/color-shades.js`, `public/shared/legend.js`, `package.json`, `DEPLOY_GUIDE.md`.
