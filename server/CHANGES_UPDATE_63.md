# Update 63 - new game SHIFTLE (`/shiftle/`)

SHIFTLE is a BLINDLE copy built on the SHUFFL-O idea (it was cloned from FORBACKLE, so every host feature is already there).

**The clue.** After every guess each letter turns **white**, **pink** or **blue**. The three colors stand for the three classic clues:

| Clue | Meaning |
|------|---------|
| Correct spot | the letter is in the hidden word and in the right place |
| Wrong spot | the letter is in the hidden word, but somewhere else |
| Not in the word | the letter is not in the hidden word (or all its copies are already used) |

**The shift.** Which color wears which clue is **shuffled at the start of every round** (a new random deal that is always different from the previous round). In one round blue may mean "correct spot", in the next blue may mean "not in the word", pink "correct spot", white "wrong spot"... Chat has to use the shifting colors to uncover the secret word. Duplicate letters follow the standard Wordle rule (a second E is only marked if the word really has a second E).

**Tiles.** Every letter is its own uniform rounded square (white with a soft grey edge, pink, light blue) - like the original Shuffl-O screenshots.

**Keyboard.** A small A-M / N-Z reference. No manual coloring. Every key colors itself with the **same color** its letter has on the tiles. A letter can appear in several colors across guesses, so the best clue wins (correct spot, then wrong spot, then not in the word). Host can switch it off in Settings -> "Auto-color keyboard keys".

**Legend.** A "What the colors mean" legend (white / pink / blue, each with its meaning for the **current round**) sits directly under the floating message window and above the keyboard + guess board. It is a normal block in the page flow, so nothing overlaps. The three chips pop in once whenever a new round re-deals the colors. Host options in Settings -> **Color legend**:
- *Show the color legend* (default ON)
- *Legend tells this round's meanings* (default ON). Switch it OFF for the original Shuffl-O challenge: the legend shows the three colors with a "?" and chat must deduce the meanings from the clues. Meanings are always shown once a round has ended.

Both choices apply instantly on every connected screen and are remembered (`data/shiftle-settings.json`). The round's real meanings are never sent to the browser while hidden - only the colors.

**Scoring (Live).** 1 point for every guess that fits the board, 5 points for solving the round. "Fits the board" = Strict fit (ON by default): the guess must also fit the colors of every earlier guess. The host can switch Strict fit off in Settings. The automatic starter word never scores; a word already on the board is skipped.

**Everything else** is the same as FORBACKLE / BLINDLE: unlimited guesses, automatic starter word, 3 hint types, Live / Test / Offline, word language (EN / ID / MS), difficulty tiers, win celebration, leaderboards, Color shades (3 colors: white / pink / blue), Records, shared TikTok connection from HOME.

## Files
- NEW `server/shiftle/shiftle-server.js`, `server/shiftle/public/shiftle-index.html`, `shiftle-game.js`, `shiftle-style.css`
- NEW `server/shared/shiftle-settings-store.js`
- Registered in: `server.js`, `server/shared/home-cards-store.js`, `server/shared/hint-config-store.js`, `server/engagement/engagement-hub.js`, `public/index.html` (home card), `public/home.js`, `public/home-views.js` (NEW tag), `public/shared/platform-sync.js`, `public/shared/records-ui.js`, `public/shared/game-chrome.css`, `public/shared/color-shades.js`, `package.json`, `README.md`, `DEPLOY_GUIDE.md`.
