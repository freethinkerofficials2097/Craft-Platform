# Update 67 - 🌏 Languages button in every word game + BETWEENDLE board changes

## 1. 🌏 Languages button for all word games
SHIFTLE (update 64), WORDLE and BETWEENDLE already had the 🌏 button. It now exists in every other game that has a word language:
BLINDLE, ORACLE, COLORBLINDLE, COLORDLE, STRUCTLE, TEXTLE, RANGEDLE, CODEDLE, SHAPEDLE, FORBACKLE, TWISTLE and CROSSDLE.

- Same popup as SHIFTLE: English / Bahasa Indonesia / Bahasa Melayu (Malaysia) switches, tick one or mix several, at least one must stay
  ticked, "Apply language" saves it and a running round restarts in the new language. It drives the same server setting as
  Settings -> Word language, so the two always agree.
- Built ONCE in `public/shared/word-language.js` (loaded by all of these games already): the button is added right after 💡 in the toolbar
  (in CROSSDLE it appears as "🌏 Languages" next to its Hint button), and the popup brings its own small stylesheet. No per-game files changed.
- Games that ship their own popup (SHIFTLE, WORDLE, BETWEENDLE) are detected by `id="languageBtn"` and left alone.
- Flagle, TRAVLE and Findle have no word language, so they are unchanged.

## 2. BETWEENDLE changes
- Removed the "Give Up" button and the "Guesses: N" counter that sat above the upper bound (the host's own Give up button in Host controls stays).
- The alphabet circles now show the letters still possible: gold = letters from the lower bound's first letter to the upper bound's first
  letter (all 26 at the start and when the round is over), the rest are dimmed - exactly like the List-O screenshots.
- A guess outside the bounds shows a short floating message to everyone: "✗ ZEBRA — Word outside the allowed range (PAW – PEA)"
  (also repeated under the alphabet circles).
- Legend reduced to two items: the gold alphabet circles and the "outside range" message. How-to-play and Settings texts updated.

## Files
`public/shared/word-language.js`, `public/shared/color-shades.js` (hint text), `server/betweendle/betweendle-server.js`,
`server/betweendle/public/betweendle-index.html`, `betweendle-game.js`, `betweendle-style.css`, `package.json`, `README.md`.
