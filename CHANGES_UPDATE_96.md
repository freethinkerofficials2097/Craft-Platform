# Update 96 - CITYDLE full customization, EXPANDLE one-color board, LINEDLE strict fit = secret word only

## 1) CITYDLE: Settings -> City colors (much more customizable)
- Each of the 4 city tiles (green / yellow / orange / grey) now has its OWN: tile color, text color, country-line color (empty = automatic, follows the text color) and border color.
- Direction badge and distance badge: badge color, text color, border color.
- Frame around the newest guess, ring around the winner, and the column-heading text color.
- NEW "Tile shape and text" sliders: border width, corner roundness, row height, space between rows, frame thickness, city-name size, city-name boldness, country-line size;
  switches: show/hide the country line, CAPITAL LETTERS on/off. Every control has a reset button; "Reset everything" resets all of it.
- Presets (Classic, Color-blind friendly, High contrast, Soft pastel, Night) only change colors - they never touch your shape settings.
- Legend = game, both directions: the legend chips read the very same CSS variables, and a color picked on a legend chip writes into the game (and the other way round), on every connected screen.
- FIX: the "LEGENDS SETTINGS" panel was not appearing in CITYDLE's settings (it was anchored to the removed Color-shades card). It now sits right under City colors.

## 2) EXPANDLE
- Each row now shows the circular TikTok profile picture of who made the word on the LEFT (like the other games). The letter tiles stay centered.
- The number on the left of each row (letter count) is removed.
- The line "Next: a n-letter word from ... + 1 new letter" is removed (the end-of-round message still shows).
- No more purple / blue / gold meanings: every letter tile has ONE color. New Settings -> Colors card (replaces Color shades): tile color, letter color, tile border, newest-row frame, clock colors, tile border width / roundness / size, presets.
- The legend has one "Letter tiles" chip with the same color; changing it in the legend changes the game and vice versa (also frame and clock chips).

## 3) LINEDLE: Strict fit
- With Strict fit ON, ONLY the exact secret word of the round is accepted onto the board. Every other word (even a real word that fits all earlier colors) is skipped with the floating message
  "Strict fit is on: only the exact secret word is accepted". Works for chat guesses and the host's Offline guesses. OFF (default) behaves as before.

## Files
- NEW `server/shared/expandle-colors-store.js`, `server/expandle/public/expandle-colors.js`
- Changed: `server/shared/citydle-colors-store.js`, `server/citydle/public/citydle-colors.js|css|index.html`, `server/expandle/expandle-server.js`, `server/expandle/public/expandle-game.js|css|index.html`,
  `server/linedle/linedle-server.js`, `server/linedle/public/linedle-index.html`, `public/shared/legend.js`
- New data files (created automatically): `data/expandle-colors.json`; `data/citydle-colors.json` now also holds the new settings.
