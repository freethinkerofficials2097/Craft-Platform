# Update 86 - BETWEENDLE

## Word length panel
- Now a panel of its own above the legend, with the same fill, border and rounded corners as the legend's panel (it also follows the automatic dark/light text for custom panel colors).
- Fixed length: "WORD LENGTH - 6 letters".
- Random length: "WORD LENGTH - Random". The range and this round's exact length are never shown.
- The small boxes (one per letter) and the "Secret word" wording were removed.
- Still switchable in Settings -> Look & sound -> Card design ("Show the word length panel above the legend").

## Files
- server/betweendle/public/betweendle-game.js, betweendle-style.css

## Tested
Syntax check of every JS file; headless-browser tests (random / fixed / dark panel; panel matches the legend's fill, border and corners; no digits appear in random mode); earlier tests re-run.
