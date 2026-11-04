# Update 130

Based on update 128 + 129 (included).

## BOXDLE: small clock box AND nothing ever moves
Update 129 made the status row appear/disappear, which moved the boxes below it. Now:
- The clock box is a fixed, compact box: time + words + points + progress bar. It has NO status row at all.
- The hint, round result, solo-practice note, next-grid countdown and the "New round" button are shown inside the already reserved message slot at the top (the same place as the floating guess message). Empty = invisible; nothing changes size, so no box moves up or down.
- The floating guess message sits on top of that card for a few seconds, then the card is visible again.

Files: server/boxdle/public/boxdle-index.html, boxdle-style.css, boxdle-game.js | package.json 2.78.0
