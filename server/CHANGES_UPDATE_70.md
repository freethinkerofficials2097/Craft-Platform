# UPDATE 70 — fully customizable legends in WORDLE, BETWEENDLE and COMPARABLE

These three games only had a simple "show / hide the legend" switch. They now use the same
**LEGENDS SETTINGS** panel as BLINDLE, ORACLE, TEXTLE, etc. (Settings, right under "Color shades"):

* show / hide, position (top, above / below the keyboard, above / below the board), alignment
* title text and on/off, text of every entry, the chip text, order of the entries
* add your own entries (up to 16), switch single entries off, set any entry's own color
* overall size, chip size, row and column spacing, font, chip shape (square, rounded, circle, bar)
* exact number of columns and rows, fill order, equal or compact cells, panel background
* applied instantly on every connected screen (OBS too), remembered in `data/legends.json`

Default entries (host can edit all of them):
* WORDLE: Green / Yellow / Grey meanings
* BETWEENDLE: gold alphabet circles + "outside range" message (same two items as before)
* COMPARABLE: green, grey, blue consonant tile, orange vowel tile, the three < > = signs and the
  three arrows inside blue tiles (10 entries)

Not changed: SHIFTLE keeps its own legend, because its colour meanings are shuffled every round and
hidden until revealed, which a fixed-text legend cannot show.

Files: `public/shared/legend.js` (defaults for the three games), each game's `-index.html`
(loads the legend script, old built-in legend and its show/hide switch removed) and `-game.js`
(old legend drawing switched off). Everything else is exactly update 69.
