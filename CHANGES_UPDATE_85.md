# Update 85 - BETWEENDLE

## Word length strip
- New strip at the top of the game panel: directly under the floating message window and above the legend.
- Shows the secret word's number of letters this round (with one small box per letter) and, when the length is random, the range the rounds draw from ("Random length each round: 4-12 letters").
- Hidden before a round starts. Can be switched off in Settings -> Look & sound -> Card design -> "Show the word length / range above the legend".

## Legend text adapts automatically
- When the host picks their own panel color, the text inside the panel (legend, hints, status, the new strip) switches to light or dark by itself, based on the real look of the panel (its color mixed into the page at the chosen opacity). The legend's own backdrop is adjusted too.
- With the theme's own panel color, a panel switched off, or a nearly see-through panel (opacity under 30%), nothing is changed.

## Files
- server/shared/betweendle-settings-store.js (new `lengthInfo` setting)
- server/betweendle/public/betweendle-index.html, betweendle-game.js, betweendle-style.css

## Tested
Syntax check of every JS file; headless-browser tests of the strip position/order, random and fixed length, switch off, idle, and dark / light / see-through / off / theme panels; all earlier tests re-run; real server code driven end to end with a stubbed network layer.
