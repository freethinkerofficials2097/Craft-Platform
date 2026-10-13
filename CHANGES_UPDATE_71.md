# UPDATE 71 — toolbar / ribbon no longer squashed after a round ends

Cause: `.app` is a fixed-height flex column. At round end the win panel ("You win!", Play again,
auto-continue note) makes the page taller than the screen, so the browser shrank the toolbar
(its `overflow:hidden` let it shrink to almost nothing), leaving the thin clipped strip.

Fix: the hero banner, toolbar, top-scorers ribbon, message slot and host-controls bar are now
fixed-size (`flex-shrink: 0`); when the content is taller the page scrolls instead.
* `public/shared/game-chrome.css` — shared rule for every game that uses it
* BETWEENDLE, COMPARABLE, SHIFTLE, WORDLE style files — their toolbar rule also made non-shrinking
