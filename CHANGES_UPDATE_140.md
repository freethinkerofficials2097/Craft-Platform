# UPDATE 140

Client-side only (CSS + 1 JS file). No server code, settings or data files changed. Deploy by replacing the folder and restarting as usual.
Files changed: `public/twistle/style.css`, `public/crossdle/style.css`, `public/shared/theme.css`, `public/shared/fit-screen.css`, `server/minedle/public/minedle-game.js`.

## 1. TWISTLE and CROSSDLE - rows cut off at the bottom, line between rows
**Twistle** (`public/twistle/style.css`)
- Cause: each `.guessRow` is an `overflow-x:auto` box, and a box that scrolls on one axis also clips on the other. Inside the fixed-height list the rows were also shrunk by flex below their own height (measured: 9 guesses -> rows 13px tall holding 21px of content), slicing the tile bottoms, their 3D edge and the symbol shadows.
- Fix: rows never shrink (`flex: 0 0 auto`) and carry room for the 3D edge/shadow inside their own box; negative margins give the room back, so row spacing is unchanged.

**Crossdle** (`public/crossdle/style.css`)
- Cause: every guess was a bordered card with a drop shadow (plus a 3D edge line from the shared theme) inside a board that scrolls and clips; the last row's shadow was sliced at the bottom edge and the sides.
- Fix: borderless, shadow-free rows (the tiles carry the look), a correct guess is marked with a soft green tint instead of a border, the shared theme's row edge line is turned off for these rows, and the board has enough padding that tile glows are never sliced.

## 2. MINEDLE - result panel / Play again / countdown below the screen
(`server/minedle/public/minedle-game.js`)
- Cause: the board always took ~46% of the screen height, so after a round ended (result panel added) the page was taller than the screen. fit-screen shrank everything to 70% and then fell back to scrolling, leaving the panel under the bottom edge.
- Fix 1: the board now gives way first. fit-screen asks the board (`window.__fitScreenPre`, the same hook TRAVLE uses) to fit; the board is re-measured from its natural size and made only as small as needed (never below 20 screen px per tile).
- Fix 2 (safety net for very small phones): if the page still has to scroll, the result panel is scrolled into view once when a round ends.
- Measured with a compact legend: on a 392x864 phone the result panel was at 877-966px (off-screen), now 739-834px, and every case incl. a 10x10 board fits without scrolling.

## 3. ALL GAMES - floating guess window vs the game panel
(`public/shared/theme.css`, `public/shared/fit-screen.css`)
- The message window has its own slot strictly BELOW the score ticker. It never sits on top of the ticker, the header or the game card.
- The slot is exactly as tall as a 2-line message needs: 42px (was 52px, or 44px in compact mode), with no margin under it. The message card is sized so both lines show completely (long messages used to have their second line clipped).
- The blank band above the game card is only as tall as the washi tape / heart that sticks out of it: 20px in total (the card's own 12px top margin + 8px stage padding; it was 28-32px).
- Result: ticker-to-card distance 68-76px -> 60-62px, message fully visible and 3-5px clear of the tape and heart, ticker untouched. The slot keeps its height whether or not a message shows, so the page never jumps when one appears.
- Checked on all 23 games that have a message slot (Contexto has none) at 360x740, 392x864 and 412x915 with a long 2-line message: 0 overlaps with the ticker/header, 0 with the tape/card, 0 clipped messages.

## Known limits
- Minedle on a very small phone (~360x740) with a large board can still need a few pixels of scrolling; the result panel is auto-scrolled into view when the round ends.
- "Cannot scroll" on the phone could not be reproduced in a desktop emulation (scrolling worked there); the fix removes the need to scroll in the normal case.
- Tested with a stub harness (real client code, simulated game states, headless Chromium). Not tested on a physical phone or against the live server / TikTok.
