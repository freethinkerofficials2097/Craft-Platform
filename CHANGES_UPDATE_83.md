# Update 83 - BETWEENDLE

## Removed
- The A-Z letter tiles above the boxes (BETWEENDLE has no keyboard). HTML, script and CSS cleaned up.

## Card design (Settings -> Look & sound -> Card design)
- 7 designs: Stitched (original), Flat, Glass, Neon, Ticket, Sticker, Soft. Picking one loads its suggested corners / border / shadow.
- Customize: card color, hidden-word card color, text color, border/accent color, font (5), text size, corner roundness, border thickness, shadow/glow depth, spacing, optional captions, show/hide distance, pop-in animation on/off, two reset buttons.
- Live preview works even when no round is running. Changes apply instantly on every screen.
- Saved on the server in `data/betweendle-settings.json` (new `card` field; old files still load). Invalid values are ignored/clamped.
- Dark custom colors automatically get light text and brighter locked letters.

## Fixed
- The hidden-word (middle) box never received its lighter face and coral seam (a CSS specificity clash). Now it does.

## Files
- server/betweendle/betweendle-server.js, server/shared/betweendle-settings-store.js (actions `set_card_design`, `reset_card_design`)
- server/betweendle/public/betweendle-index.html, betweendle-game.js, betweendle-style.css
- public/shared/settings-shell.js (one rule + icon so "Card design" appears under Look & sound; no effect on other games)

## Tested
Syntax check of every JS file; headless-browser render of all designs and screens; settings-store unit tests; real server code driven end to end with a stubbed network layer.
