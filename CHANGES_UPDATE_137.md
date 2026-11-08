# UPDATE 137 - one tile size, one banner, lighter floating window, bigger Travle globe

Based on update 136.

## 1. Games were small / medium / big (all games)
Cause: every game picked its own tile size (about 30px in Wordle, 40-60px elsewhere) and the title banner switched between full and compact
depending on how much that game had on screen.
* `public/shared/fit-screen.js`
  - Banner: decided by screen height only. Screens shorter than 1000px (all phones) get the same compact banner (tagline hidden) in every game;
    tall screens keep the full banner.
  - Tiles: after a game draws its guess rows, rows narrower than the box are scaled up (crisp CSS zoom) to fill the width, never taller than 58px
    per row and never so big that fewer than ~2.5 rows stay visible. Rows already full width (cards, pills, bars) are untouched.
    Hosts who set their own sizes in Settings > Customize keep them (no automatic growing).
  - Measured (Wordle, 392px wide): 5 letters 35px -> 50px tiles, 8 letters -> 36px, 12 letters -> 24px.
* To change the limit: `MAX_ROW_H` / `MIN_VISIBLE_ROWS` at the top of the row-fit section.

## 2. TRAVLE globe
`public/travle/style.css`, `fit-travle.js`: instructions and caption hidden, stat boxes in one slim row, live feed is a small strip, globe takes
the rest and may use almost the full width. About 118px -> about 287px across in a 392x780 test.

## 3. FLAGLE empty space above the title
`public/flagle/style.css`: the game screen reserved ~110px for the TikTok safe area on top of the banner. Removed; title now starts at the top.
`public/shared/hero-banner.css`: same compact banner as the other games (Flagle, Travle, Findle).

## 4. Floating guess window
* Shadow reduced from `0 14px 32px` to `0 1px 4px`, hairline border, no coloured bar, and the slot no longer clips it (that clipping was the hard
  line under the window). Files: `public/shared/theme.css`, `fit-screen.css`, `public/flagle/style.css`. Slot is 52px (44px compact) with room for 2 lines.
* BETWEENDLE: the window existed but only appeared for a valid word outside the range, which Test Mode never sent. Now it also announces every
  accepted guess (💬) and the win (🎉), and Test Mode bots sometimes send an out-of-range word. Files: `server/betweendle/*`.

## Tested (headless Chromium, 392x780, simulated server data, offline fonts)
All 28 pages load with no new script errors; Wordle rows measured at several word lengths; Betweendle window shown with a simulated message;
Travle and Flagle measured. NOT tested: real phones, real live rounds, dark themes, every game with real guesses (rows in games other than Wordle
use the same shared code but were not individually measured). Boxdle and Findle do not use fit-screen.js and were only given the banner/padding fixes.
