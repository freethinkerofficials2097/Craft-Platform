# Update 128

Based on update 127 (included).

## 1. The floating guess / message window never overlaps anything (every game)
Cause: update 127's shared theme had shrunk the window's reserved slot to 0 px, so the message floated over the legend, keyboard, clock, grid and guessed-words board.
Now every game again has a reserved slot in the normal page flow (under the top bar, above everything else). The message card is compact (max 2 lines) and clipped to its slot, so even a long message cannot spill out of it.
- All games that use the shared floating window (BLINDLE, ORACLE, COLORBLINDLE, CROSSDLE, TWISTLE, BOXDLE, BETWEENDLE, CITYDLE, CODEDLE, COLORDLE, COMPARABLE, EXPANDLE, FIXLE, FORBACKLE, LINEDLE, MINEDLE, NUMBERBLINDLE, RANGEDLE, SHAPEDLE, SHIFTLE, STRUCTLE, TEXTLE, TOWNDLE, WORDLE): one number, `--toast-slot-height` (now 62 px) in `public/shared/theme.css`.
- FLAGLE: its message used to float over the page (fixed); it now sits in its own reserved slot between the ticker and the flag, one message at a time.
- CONTEXTO already reserved a fixed space for its "+N points" popup; unchanged.

## 2. BOXDLE
Removed the line "Type words you can trace on the grid in the chat - 4+ letters, long words score big!". Nothing replaces it (hints, solo-practice note and the round result still show in the status line).

Files: public/shared/theme.css | public/flagle/index.html, style.css, app.js | server/boxdle/public/boxdle-game.js | package.json 2.76.0
