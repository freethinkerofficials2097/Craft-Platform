# UPDATE 68 — new defaults (host can still change everything)

1. **BETWEENDLE** — the secret word now defaults to a **random length between 4 and 12 letters**
   (Random word length ON, min 4, max 12). The host can still switch it to a fixed length or
   pick any other range in Settings.
2. **Difficulty** — every game that has a word-difficulty selector (Blindle, Wordle, Betweendle,
   Rangedle, Textle, Colorblindle, Colordle, Codedle, Structle, Oracle, Shiftle, Shapedle,
   Forbackle, Twistle) now starts on **Random** instead of Normal.
3. **Auto-continue after each round** — now **ON** by default in every game that has it
   (the 14 word games above; TRAVLE already defaulted to ON). The host can switch it OFF.

Files touched: each game's server file (game state defaults) and its settings HTML
(so the panel shows the same defaults before the first server update arrives);
BETWEENDLE's game.js (fallback max length 12).
