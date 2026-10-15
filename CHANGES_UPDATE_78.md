# UPDATE 78 — BETWEENDLE: the three boxes, redone (and no more stale cache)

* The lower-bound / hidden-word / upper-bound boxes are now clearly different, premium floating cards: warm paper-tan cards with a
  glossy highlight, a coloured accent edge (blue = lower, violet = hidden word, coral = upper), deep layered shadows, a gentle idle
  float, a pop-in animation whenever the board changes, a white distance pill, and a bright dashed-violet hidden-word card.
  The default card colour changed from grey to tan (Settings -> Color shades -> "Card" still lets the host tune it).
* Why the previous update could look unchanged: browsers keep old copies of CSS/JS. The server now sends `Cache-Control: no-cache` for
  pages, styles and scripts (so a new deploy shows up on the next reload), and BETWEENDLE's page links carry a version (`?v=78`).
