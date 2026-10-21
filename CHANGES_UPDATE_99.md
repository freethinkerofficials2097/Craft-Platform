# Update 99 - EXPANDLE: Tile size & scrolling, Word length panel, all languages | LINEDLE: wider wave / pillar ranges

## EXPANDLE
- **Tile size & scrolling** (Settings, same box the other word games have, shared setting, remembered on the device):
  - *Auto-resize tiles to fit long words* ON = a long word always fits on one line; OFF = tiles keep a fixed readable size (sized for 15 letters) and a longer word scrolls sideways.
  - *Auto-scroll to the newest guess* ON/OFF - rows that do not fit scroll inside the board (newest on top), with the "Latest" button.
- **Word length panel** (the shared panel, Settings -> Word length panel, plus the quick button in the top bar): shows viewers the length of the NEXT word
  ("NEXT WORD - 5 letters"), updating every row. All its options work (texts, rows, size, fonts, colors, box, position, looks, "apply to every game").
- **Languages**: the language button offers English / Indonesian / Bahasa Melayu and every mix (7 modes), like the other word games.
  Fixed in this update: the "Now playing" line in the Languages popup was empty (the server now sends the language info), and for Indonesian / Bahasa Melayu
  the start-word picker, dead-end check and hints only knew the small answer list - they now use the full dictionary of those languages (the same one guesses are checked with).

## LINEDLE (Settings -> Wave panel look)
- Pillar width: 5% - 600% (was 30% - 260%). Never wider than its own slot, so pillars never overlap.
- Light-blue wave thickness 0.5 - 40 px (was 1 - 18); white wave 0.5 - 40 px (was 1 - 14); faint trails 0.5 - 24 px (was 1 - 8);
  horizontal letter lines 0.25 - 12 px (was 0.5 - 5). Dot sizes widened too (blue dots 2 - 40, guess dots 2 - 44) so very thick waves still look right.

## Files
Changed: `public/shared/tile-fit.js`, `public/shared/length-panel.js`, `server/shared/length-panel-hub.js`, `server/shared/linedle-wave-store.js`,
`server/expandle/expandle-server.js`, `server/expandle/public/expandle-game.js`, `expandle-index.html`, `server/linedle/public/linedle-game.js`
