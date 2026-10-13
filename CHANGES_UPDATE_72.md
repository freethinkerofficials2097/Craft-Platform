# UPDATE 72 — new game FIXLE (`/fixle/`)

FIXLE is a BLINDLE copy built on the "Edge-O" idea (cloned from BETWEENDLE, so every host feature is already there).

**The clue.** The secret word is hidden. After every guess the audience sees ONE number, the guess's **score**:

    score = matching prefix + matching suffix with the secret word

* matching prefix = how many letters match counted from the START of both words
* matching suffix = how many letters match counted from the END of both words
* Example (secret `SCRIPT`): `START` = S (1) + T (1) = **2**, `SCARRIEST` = SC (2) + T (1) = **3**, `STRESS` = S (1) + 0 = **1**, `SCRIPT` = 6 + 6 = **12**.
* Guesses may be any real word of any length (3-20 letters). A score of **twice the word length** is the exact secret word: the round is won.

**The board (as in the Edge-O screenshots).** Floating message window -> legend -> board, all normal blocks of the page flow, so nothing
can overlap. The board shows the newest guess in a darker top row (it turns green when the round is won), then EVERY guess sorted from the
highest score to the lowest (equal scores keep the order they were made in). Each row: guesser's avatar + word + score badge.

**Legend** (default entries, all customizable in Settings -> Legends): score, prefix, suffix, win (2 x length), dark top row, grey rows (sorted),
starter word, floating window. It is inserted just above the board and below the floating window.

**Floating message window.** Announces every new guess ("viewer guessed WORD - score N") and still shows skipped-guess messages.
Settings -> "Floating message window" sets how long it stays.

**Scoring (Live).** The guess that finds the secret word wins EXACTLY the score of that secret word = 2 x its length
(6 letters = 12 points, 9 letters = 18 points). Nothing else scores. The automatic starter word never scores and never wins.

**Removed vs BLINDLE / WORDLE:** colored tiles, number columns, the manual / auto colored keyboard, Strict fit, alphabet circles, bounds.

**Hints.** Word idea = a word that fits every score already on the board (never the answer); Reveal a letter; Rule out letters.

**Everything else** is as in BLINDLE / BETWEENDLE: unlimited guesses, starter word, Live / Test / Offline, host-set secret word, word language
(EN / ID / MS + mixes), difficulty tiers, random or fixed secret length (4-12 random by default), Auto-continue ON by default, win celebration,
leaderboards, Color shades (grey rows / dark newest row / green found row), Records, shared TikTok connection from HOME.

## Files
* NEW `server/fixle/fixle-server.js`, `server/fixle/public/fixle-index.html`, `fixle-game.js`, `fixle-style.css`
* Registered in: `server.js`, `server/shared/home-cards-store.js`, `server/shared/hint-config-store.js`, `server/engagement/engagement-hub.js`,
  `public/index.html` (home card), `public/home.js`, `public/home-views.js` (NEW tag), `public/shared/platform-sync.js`,
  `public/shared/records-ui.js`, `public/shared/game-chrome.css`, `public/shared/color-shades.js`, `public/shared/legend.js`,
  `package.json`, `README.md`, `DEPLOY_GUIDE.md`.

All other games are unchanged.
