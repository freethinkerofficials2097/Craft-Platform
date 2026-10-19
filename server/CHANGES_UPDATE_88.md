# Update 88 - BETWEENDLE

## Word length panel customization (Settings -> Look & sound -> Word length panel)
- Texts: the title (empty = no title), the text shown when the length is fixed (default `{length} letters`) and the text shown when it is random (default `Random: {range}`).
- Words you can use inside the texts: `{length}` `{min}` `{max}` `{range}` (e.g. 4 - 12) `{language}`. In random mode `{length}` shows the range - the round's exact length is never shown.
- Separate several texts with `|` (example: `{length} letters | {language} | Good luck`). Each part becomes its own item with a thin divider.
- Rows (1-4): spreads the parts over that many rows.
- Text size, text alignment (left / center / right), panel background / border / text colors (text turns light or dark by itself on a custom background), corner roundness, border thickness, show/hide the panel box, show/hide the whole panel, and a reset button.
- Two live previews (fixed and random) in Settings, even before a round starts.
- Everything is saved on the server and shared by every screen; texts are trimmed, limited in length and safely escaped.

## Files
- server/shared/betweendle-settings-store.js (new validated fields)
- server/betweendle/public/betweendle-index.html, betweendle-game.js, betweendle-style.css
- public/shared/settings-shell.js (puts the new section under Look & sound)

## Tested
Syntax check of every JS file; headless-browser tests (defaults, custom texts with "|", rows, dividers, singular "1 letter", HTML escaping, empty title, no box, right alignment, custom colors, switch off, typing in Settings, no exact-length leak); earlier tests re-run; real server code driven end to end (validation, clamping, trimming, reset, kept across a new round).
