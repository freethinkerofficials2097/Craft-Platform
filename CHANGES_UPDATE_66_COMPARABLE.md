# Update 66 - new game COMPARABLE (`/comparable/`)

COMPARABLE is a BLINDLE copy built on the Compar-o idea. Instead of an empty board, every round opens with a **symbol row**
that describes the hidden word without naming a letter.

## The symbol row
One ROUND tile per letter of the hidden word:

| Symbol | Meaning |
|--------|---------|
| Blue round tile | the letter is a **consonant** |
| Orange round tile | the letter is a **vowel** (A E I O U) |
| `<` between two tiles | the right letter is **larger** (A is the smallest letter, Z the largest) |
| `>` between two tiles | the right letter is **smaller** |
| `=` between two tiles | both letters are **equal** |
| up arrow inside a blue tile | the **next consonant** of the word (vowels are skipped) is larger |
| down arrow inside a blue tile | the next consonant is smaller |
| dash inside a blue tile | the next consonant is the same letter |

The last consonant of a word has no arrow (there is no consonant after it). Example from the original game: **CATER**
= blue(up) `>` orange `<` blue(down) `>` orange `<` blue.

**Every guess must match the symbol row** of the hidden word (same consonant/vowel layout, same signs, same arrows) and be a
real word of the right length. Chat words that do not match are skipped silently (so random chat never floods the screen);
the host's Offline box explains why a word was not accepted.

## The clue colors
After every guess each letter turns **green** (the right letter in the right position) or **grey** (incorrect), exactly like
the screenshots of the original game (e.g. a letter that is in the word but in another spot is grey). No yellow, no number
columns.

## Keyboard
The A-Z keyboard colors itself: a key gets the same color its letter has on the tiles (green wins over grey when a letter
was green anywhere). It is not clickable and there is no manual coloring. Host can switch it off in Settings ->
"Auto-color keyboard keys".

## Legend
A short legend under the floating message window and above the symbol row explains the guess colors, the blue/orange tiles,
the `< > =` signs and the three arrows. Host option: Settings -> Legend -> *Show the legend above the board* (default ON,
remembered in `data/comparable-settings.json`). The how-to-play window (the question-mark button) explains the same.

## Scoring (Live)
1 point for every guess that fits the board, 5 points for solving the round. "Fits the board" = a real word that matches the
symbol row and (Strict fit, ON by default) also fits the colors of every earlier guess. A word already on the board is skipped.
The automatic starter word never scores. The starter word, the hints and the Test Mode simulator only use words that match
the symbol row (if no other word fits a row, the round simply starts without a starter word).

## Everything else
Same as WORDLE / BLINDLE: unlimited guesses, 3 hint types, Live / Test / Offline, word language (EN / ID / MS and mixes, also
via the toolbar's globe button), difficulty tiers, win celebration, leaderboards, **Color shades** (green, grey and now also
the blue and orange of the round tiles - 10 shades each), Records, shared TikTok connection from HOME.

## Files
- NEW `server/comparable/comparable-server.js`, `server/comparable/public/comparable-index.html`, `comparable-game.js`, `comparable-style.css`
- NEW `server/shared/comparable-settings-store.js`
- Registered in: `server.js`, `server/shared/home-cards-store.js`, `server/shared/hint-config-store.js`,
  `server/engagement/engagement-hub.js`, `public/index.html` (home card), `public/home.js`, `public/home-views.js` (NEW tag),
  `public/shared/platform-sync.js`, `public/shared/records-ui.js`, `public/shared/game-chrome.css`,
  `public/shared/color-shades.js`, `package.json`, `README.md`, `DEPLOY_GUIDE.md`.

WORDLE is unchanged.
