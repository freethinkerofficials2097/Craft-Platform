# UPDATE 132 - "nothing is ever cut off"

Fixes the tiles / rows that were cut off on phones (seen in Minedle, Crossdle, Findle and the other games).

## Root causes found
1. **One-screen mode clipped instead of scrolling (update 131).** `fit-screen` shrinks a game to at most 70% and then hides
   whatever still does not fit (`overflow:hidden`). With a long word, the legend and a big board, the guess list (and in
   Minedle the letter bank too) ended up completely outside the card: 0 px visible, no way to reach it.
2. **Tile size was measured once.** Each game works out its tile size from the width it saw at that moment and keeps it until the
   next guess. A scrollbar appearing, a zoom change or a resize could push the last tile of a long word past the card edge.
3. **Guess list could shrink to 130 px** (about two half-rows).
4. **"Display & layout" card was dropped into the header** on Crossdle (covering the title) and into Findle's top bar (running off
   the right edge of the screen). `theme.js` inserted it right next to the theme picker.
5. **Crossdle long words:** guess + decoy (up to 20 tiles) were squeezed onto one line; tiles turned into slivers and the letters
   spilled outside them.

## What changed
| File | Change |
|---|---|
| `public/shared/fit-screen.js` | Scroll fallback (`html.fs-scroll`) when the game cannot fit even at the smallest zoom; row fitter (shrinks any guess row wider than its box, re-checked on resize / redraw / scrollbar change); list keeps ~3 rows when it has guesses (`MIN_LIST_ROWS`); "grow back" measured in one-screen mode so zoom cannot flip-flop |
| `public/shared/fit-screen.css` | Rules for the scroll fallback; stable scrollbar gutter on the guess list; wide rows capped to the box |
| `public/shared/theme.js` / `theme.css` | The Display & layout card is moved out of any header into the game's own settings panel (Crossdle host panel, Flagle, Travle, ...) |
| `server/findle/findle-public/findle-host.html` | Display & layout card moved into Findle's Settings sheet (own card); top bar wraps instead of overflowing |
| `public/crossdle/app.js`, `style.css` | 7+ letter words: decoy row under the guess row; letter size follows the real tile width |
| `package.json` | version 2.80.0 |

No server logic, scoring, data files or socket events were touched. No new dependencies.

## Behaviour you will notice
* Small phone + long word + legend showing: the page now **scrolls** (at 70% zoom) instead of hiding the guess list.
  Hide the legend in Settings to get back to a single screen on most phones.
* Games that fit on one screen behave exactly as in update 131.

## Tested (headless Chromium, 360x740 / 390x844 / 412x915 / 768x1024, before vs after)
* Minedle 8 & 12 letters: guess list 0 px visible -> fully reachable, all tiles whole.
* Oracle, Blindle, Numberblindle, Colorblindle (8 & 12 letters): every row whole, no last-tile clipping, list 2-3x taller.
* Crossdle 5 / 10 letters; Findle settings; all 25 game pages load with no new JS errors and no sideways overflow.
* Zoom / scroll mode stayed constant over time (no flicker).
Not covered: real TikTok LIVE traffic, real devices with non-overlay scrollbars beyond the emulation above, Flagle's host
settings (button is host-only), Travle's own `fit-travle.js` (unchanged).

## Deploy
Same as before: upload the whole folder (or push to your Git repo), `npm install`, `npm start` (see DEPLOY_GUIDE.md).
The server already sends `no-cache` for CSS/JS, so phones pick up the change on the next load (a hard refresh is only needed if a browser ignores that).
