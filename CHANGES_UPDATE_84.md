# Update 84 - BETWEENDLE

## Panel behind the game (Settings -> Look & sound -> Card design -> "Panel behind the game")
- Show / hide the box that surrounds the three cards (and the legend).
- Customize: panel color, border color, opacity, border thickness, corner roundness, inner spacing, shadow depth; "Reset panel" button. Live preview in Settings.

## After a round
- Removed the text under the lower bound (celebration line, winner name, secret word) and the "You win!" line (also the round-ended / correct-answer lines).
- The Play again button and the auto-continue countdown are now centered.

## Winner window
- Crown instead of the party popper.
- The winner's TikTok profile picture is shown as a big perfect circle (the circular-avatar styles were missing in BETWEENDLE's stylesheet, which is why it looked square; the same fix also corrects the leaderboard pictures).

## Card designs
- 7 new designs: Gradient, Outline, Notebook, Chalkboard, Arcade, Wood, Metal (14 in total).
- "Sticker" fixed: no tilt, perfectly straight; the hard shadow is now only underneath so the card is balanced left/right.

## Files
- server/shared/betweendle-settings-store.js (new designs + panel settings, validated)
- server/betweendle/public/betweendle-index.html, betweendle-game.js, betweendle-style.css
- (also added the missing idle-banner / result-banner / avatar styles to BETWEENDLE's stylesheet)

## Tested
Syntax check of every JS file; headless-browser render of all 14 designs, end-of-round layout (centering measured), winner window with a non-square photo, panel on/off/custom; real server code driven end to end with a stubbed network layer (all new settings, clamping, reset, kept across a new round).
