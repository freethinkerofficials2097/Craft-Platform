# UPDATE 77 — Top-scorers news ticker: smooth, never restarts, new design

**Problem.** The ticker rebuilt its content (and restarted its CSS animation) whenever the page re-rendered, so it kept jumping back to #1
as guesses came in. FLAGLE / TRAVLE / CROSSDLE / FINDLE even had their own tickers that restarted on every update.

**Fix.** `public/shared/score-ticker.js` now scrolls with a small requestAnimationFrame engine that keeps its position:
* the strip is only rebuilt when the names / scores / pictures it shows really change, and even then the scroll position is kept,
  so it never jumps back to #1 (verified: position keeps increasing smoothly through repeated identical updates and a score change);
* hovering / touching pauses it; window resizes only add copies, they do not restart it.
* ONE ticker for every game: FLAGLE, TRAVLE, CROSSDLE and FINDLE now feed the shared ticker; their old ones are hidden.

**Design (as in the video).** A soft label pill (automatic text: `TOP 10 · OCT 2026`, or `THIS ROUND`; the host can type their own),
then a rounded pill per player: profile picture, rank number, @name and the score in green, faded edges. Settings (speed, size, pictures,
who it shows, count, accent) still work.
