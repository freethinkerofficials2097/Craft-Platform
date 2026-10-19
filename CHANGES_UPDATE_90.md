# Update 90 - Word length panel in every word game

The "Word length panel" from BETWEENDLE (the box that tells viewers how long the secret word is, e.g.
"WORD LENGTH - 6 letters" or "WORD LENGTH - Random: 4 - 12") is now one shared module used by **all 17 word games**:
WORDLE, BLINDLE, TEXTLE, COLORDLE, COLORBLINDLE, CODEDLE, FIXLE, FORBACKLE, MINEDLE, ORACLE, RANGEDLE, SHAPEDLE,
SHIFTLE, STRUCTLE, COMPARABLE, BETWEENDLE and TWISTLE. (CROSSDLE, FINDLE, FLAGLE and TRAVLE have no single secret word, so they are unchanged.)

## Show / hide whenever needed
- Settings -> Look & sound -> **Word length panel**: "Show the word length panel to viewers" switch.
- A quick **🔡 button in the top bar** shows / hides it with one tap (can itself be switched off in Settings).
- "Also show it before a round has started" (off by default, like BETWEENDLE).
- Every change applies instantly on every screen of that game, is remembered in the browser (no flash on reload) and saved on the server (`data/length-panel.json`).

## Bigger and smaller ranges
- Text size **40% - 300%** (was 70-160%).
- Rows **1 - 8** (was 1-4). The `|` separated parts of the text are spread over the rows.
- Number size 60-300%, title size 40-200%.

## More customizations
- Texts: title, fixed-length text, random-length text, optional icon in front. Words: `{length} {min} {max} {range} {language}`.
- Random length can show the **range** (default, a surprise) or **this round's exact length** (not offered in BETWEENDLE, where it would give the answer away).
- Position: top (above the legend), below the legend, above the board, above the keyboard, below the board.
- Alignment, panel width, font (6 choices), weight, letter spacing, row gap, divider style (line / dot / slash / dash / none), title CAPITALS or normal.
- Box: on/off, corner roundness, border thickness and style (solid / dashed / dotted / double), inner space, outer margins, shadow / glow, panel transparency.
- Colors: background (with strength), border, text, title and number colors (each can go back to Auto).
- Pop animation when the text changes.
- **8 ready-made looks** (Classic, Minimal, Big badge, Neon, Soft pill, Dark card, Dashed ticket, Big for stream).
- "Reset the look" and **"Apply this look to every game"** (each game keeps its own show / hide switch and position).

## BETWEENDLE
- Now uses the shared panel. Its old panel settings (update 85-88) are imported once automatically, so the host's choices are kept.
- Its private panel code was removed (it lives in the shared module now).

## Files
- NEW `public/shared/length-panel.js`, `length-panel.css`, `length-panel-schema.js`; NEW `server/shared/length-panel-hub.js` (Socket.IO namespace `/lenpanel`).
- `server.js` (starts the hub), `public/shared/settings-shell.js` (the "Word length panel" card no longer says "Needs Apply").
- Every game page `*-index.html` (+ TWISTLE `public/twistle/index.html`) and game script (one line: `LengthPanel.update(...)`).
- BETWEENDLE: `betweendle-game.js`, `betweendle-index.html`, `betweendle-style.css` (private panel removed).

## Tested
Syntax check of every changed JS file; hub test (validation / clamping, junk input ignored, BETWEENDLE import, apply-to-all, reset, saving);
headless-browser tests on all 17 game pages (fixed / random / idle text, hide / show button, above-legend order, settings card) and on four games in depth
(size 40 and 300, rows, all five positions, styles, saving after reload, updates from another screen).
