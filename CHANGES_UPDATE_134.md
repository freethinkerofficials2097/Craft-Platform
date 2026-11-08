# UPDATE 134 - one steady size, titles everywhere, Crossdle space

## 1. Games looked small / medium / big (and left blank screen below)
Root causes (reproduced in a phone-sized browser):
1. `tile-fit.js` puts an inline max-height (~150px) on the guess list. `fit-screen.js` read that as "list too small", shrank the WHOLE
   game to 70-80% and switched to scroll mode -> small game with an empty strip below it. (Oracle: zoom 0.7, game 734px on an 850px screen.)
2. Tiles were sized once from the list width, before the zoom settled, so rows stayed narrow beside a blank strip.
3. Dead space (62px message slot, keyboard heading, banner description) forced the zoom down.

Fix (shared, all games): `public/shared/fit-screen.css` / `fit-screen.js`
* clamp switched off in the one-screen layout (list takes the leftover height);
* two "compact" levels trim dead space before any shrinking; they are undone again when there is room;
* tiles are redrawn once whenever the zoom changes (one `resize` event);
* the games' "available tile height" helper uses the list's real height (16 letter games).
* every page's viewport tag now has `minimum-scale=1, user-scalable=no` so the phone browser cannot zoom the page out on its own
  (precaution - not confirmed as a cause).

## 2. Missing titles
Findle (host + display), Flagle (game screen) and Travle now show the same title banner as the other games
(`public/shared/hero-banner.css`, new).

## 3. Crossdle
Removed "Unlimited guesses - only real words ... added to the board." The guessed-words board now uses that space.

## Tested (headless Chromium, 392x850 and 360x740, stub server, no real TikTok / socket traffic)
Oracle with 0-6 guesses and 5/8/12-letter words: no scroll fallback, fills the screen, steady zoom. All 28 pages load without new JS
errors or sideways overflow. NOT tested: real devices, real game states beyond Oracle, dark themes.
