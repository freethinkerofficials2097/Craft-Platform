# Update 98 - proper Settings for CITYDLE and EXPANDLE (like the other word games)

Compared with the other word games, CITYDLE and EXPANDLE were missing the "game rule" settings. They now have suitable ones.
Everything is remembered after a restart (data/game-options.json, data/strict-fit.json).

## CITYDLE - Settings
- **Secret city region** (new): tick the continents the secret city may come from (at least one). Chat can still guess any city. Applied with "Apply settings & start new round".
- **Distance unit** (new): kilometers or miles. Applies at once on every screen: board, floating message, "Already guessed" message. (The legend chip says km/mi.)
- **Strict fit** (new, OFF by default - same switch the other games have): when ON, a city is only accepted if it fits EVERY guess already on the board -
  the same color and about the same distance (within 10%) as the secret city would have produced. Other cities are skipped with a message in the floating window.
  Applies at once.
- Already there: Difficulty, Starter city, City colors (update 96), Win celebration, Floating message window.

## EXPANDLE - Settings
- **Start word length** (new): 3 (standard), 4, 5 letters, or Random 3-5 each round.
- **Maximum word length** (new): Automatic, or 6 .. the dictionary maximum. The round ends as soon as a word reaches the cap (quicker rounds).
- **Difficulty** (new): how the start word is picked - Normal (common word that can grow many rows), Medium (grows 3-5 rows), Hard (dead-ends after 1-2 rows), Random.
- The host can also type a start word of 3-5 letters (Test / Live "Set start word" box).
- Already there: Round time, Colors (update 96), Win celebration, Floating message window, Language button. (A "Starter word" switch is not needed: EXPANDLE
  always opens with its free start word, because the word has to grow from something.)
- All of these (except Colors) apply with "Apply settings & start new round".

## Files
- NEW `server/shared/game-options-store.js`
- Changed: `server/citydle/citydle-server.js`, `server/citydle/public/citydle-game.js`, `citydle-index.html`, `server/expandle/expandle-server.js`,
  `server/expandle/public/expandle-game.js`, `expandle-index.html`, `public/shared/legend.js`
