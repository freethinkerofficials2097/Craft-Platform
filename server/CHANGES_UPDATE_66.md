# Update 66 - new game BETWEENDLE (`/betweendle/`)

BETWEENDLE is a BLINDLE copy built on the "List-O" idea (cloned from WORDLE, so every host feature is already there).

**The clue.** The secret word hides inside ONE big alphabetical list of every word of the current word bank (all lengths, all ticked
languages). After every guess the audience sees its **distance** from the secret word: distance 120 = 119 words between the guess and
the secret word. Distance 0 = the secret word is found and the round is won.

**The bounds.** A guess that comes BEFORE the secret word becomes the new **lower bound** (top row); a guess that comes AFTER it becomes the
new **upper bound** (bottom row). The middle row shows `?` (turns green with the word when found). The board opens on `AAA` / `ZZZ`.
A guess outside the bounds (or equal to one) is skipped with "Word outside the allowed range" in the floating message window and under
the alphabet circles. A word already on the board is skipped silently.

**Board (as in the List-O screenshots).** Give Up button + guess counter (chat has unlimited guesses, so "Guesses: N" replaces "Attempts left"),
the three rows with the guesser's avatar and the distance on the right, 26 alphabet circles (they light up gold with the letters of the latest
guess, not clickable), a status line ("You win!" / "The correct answer was: ..." / the out-of-range message).

**Legend.** A compact legend (Lower bound, Secret word ?, Upper bound, Distance, AAA / ZZZ, Alphabet circles, Outside range) is a normal block
of the page flow: floating message window -> legend -> guess board, so nothing overlaps. Host option: Settings -> Legend (default ON,
remembered in `data/betweendle-settings.json`).

**Removed vs WORDLE / BLINDLE:** colored tiles, number columns, the manual/auto colored keyboard, Strict fit.

**Scoring (Live).** 1 point for the guess that finds the secret word. Nothing else scores. The automatic starter word never scores and never wins.

**Hints.** Word idea = a word from the middle of the current window (a binary-search step, never the answer); Reveal a letter; Rule out letters.

**Everything else** is as in BLINDLE / WORDLE: unlimited guesses, starter word (it also sets the first bound), Live / Test / Offline, host-set secret word,
word language (EN / ID / MS + mixes), difficulty tiers (these pick the SECRET word), secret length (fixed or random range), win celebration,
leaderboards, Color shades (grey rows / green found row / gold circles), Records, shared TikTok connection from HOME.
Guesses may be any real word of 3-20 letters; a real word that is not in the list is still measured (placed where it would sit).

## Files
- NEW `server/betweendle/betweendle-server.js`, `server/betweendle/public/betweendle-index.html`, `betweendle-game.js`, `betweendle-style.css`
- NEW `server/shared/betweendle-settings-store.js`
- Registered in: `server.js`, `server/shared/home-cards-store.js`, `server/shared/hint-config-store.js`, `server/engagement/engagement-hub.js`,
  `public/index.html` (home card), `public/home.js`, `public/home-views.js` (NEW tag moved to BETWEENDLE), `public/shared/platform-sync.js`,
  `public/shared/records-ui.js`, `public/shared/game-chrome.css`, `public/shared/color-shades.js`, `package.json`, `README.md`, `DEPLOY_GUIDE.md`.

All other games are unchanged.
