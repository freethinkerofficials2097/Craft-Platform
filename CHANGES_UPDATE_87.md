# Update 87 - BETWEENDLE

## Word length panel
- Fixed length: "WORD LENGTH - 6 letters" (unchanged).
- Random length: "WORD LENGTH - Random: 4 - 12" (the range the host chose in Settings). The exact length of the current round is never shown, so it cannot narrow down the answer.

## Toolbar badge
- In random mode the badge in the toolbar used to say e.g. "8-letter word" (the round's exact length). It now shows the range ("4-12 letters"). Fixed length still shows "6-letter word".

## Files
- server/betweendle/public/betweendle-game.js

## Tested
Syntax check of every JS file; headless-browser tests: the panel text is identical for rounds of real length 4, 7, 9 and 12; other ranges display correctly; fixed length unchanged; earlier tests re-run.
