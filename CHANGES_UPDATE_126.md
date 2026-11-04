# Update 126

Based on update 125 (included).

## 1. BOXDLE fits one screen
The page is now a fixed-height column: compact title banner, top bar, ticker, then the big card holding the clock, the letter grid and the guessed words. The grid is sized to the width AND the height that are left, the guessed-words list takes the rest and scrolls inside itself, so title -> guessed words show without scrolling the page. It re-fits when the phone rotates, the browser bar slides away, or the status line wraps. The empty reserved band for pop-up messages is gone (messages float over the top), the banner is shorter on phones, and the fullscreen button is back on phones.

## 2. Decorations in every game, with every color
The cute decorations (graph paper, washi tape, ribbon, sparkles, crown, hearts, stitched sticker card, header styles) used to appear only with the 15 "Box colors & looks". They now work with the 6 plain colors too (Cream, Sky Blue, Meadow Green, Blossom Pink, Lavender Violet, Honey Gold), built from each color's own palette - so every game looks like BOXDLE whichever color is chosen.

## 3. Nothing cut off or overlapping
- Top bar: icons keep their size, the MODE / LENGTH badges ("TEST", "5 letters") are no longer clipped or drawn over the icons - when a line is full the bar wraps cleanly; badges go on their own centered line on phones.
- 3D edges of tiles / keys are no longer clipped by their parent rows.
- Avatars of viewers whose name starts with an emoji no longer show a broken "?" diamond (11 files).
- Every game page now has a working fullscreen button (one is added automatically if a page ever lacks it).
- Compact banner on phones (no forced 100 px height).

## 4. Softer default colors
- COLORDLE and COLORBLINDLE: red / blue / yellow / purple / green / gray tiles and keys are slightly softer.
- BLINDLE and ORACLE: red is slightly softer (tiles, keys, count badges).
These are the new "Standard" shade of each color; the shade pickers still go lighter or darker, and other games are unchanged.

## 5. Needless shadows removed (useful ones kept)
The grey line under the number in "Word length", under the color counts of COLORBLINDLE (1 3 1 0), and under similar number / label-only items (hint numbers, key numbers, score text, wave letters, legend labels, ticker items) is gone, along with the blurry glow behind tile letters. All shadows on real objects stay: tiles, keys, buttons, boxes, chips, badges with a background, avatars, swatches.
New option: Settings -> Appearance -> Display & layout -> "Shadow under numbers" (Off by default) for people who like 3D numerals.

Files: public/shared/theme.js, theme.css, color-shades.js, game-colors.css, celebration.js | server/boxdle/public/* | 11 game scripts (avatar fix) | public/twistle/app.js, crossdle/app.js | server/contexto/public/contexto-client.js | package.json 2.74.0
