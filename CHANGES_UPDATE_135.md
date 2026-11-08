# UPDATE 135 - the title crown always sits on the title

## Problem
The crown (👑) in the title of every game was positioned at a fixed distance from the centre of the screen. It only looked right
for titles of one particular width: on CROSSDLE / BLINDLE / BOXDLE it sat on top of the first letter, on short titles such as
FINDLE it floated away from the title (Findle also has extra space above its title), and on long titles it landed in a different place again.

## Fix (shared by all games)
* The crown is now drawn by CSS on the first part of the title itself (`.heroTitle .hT1::before`), sized in `em`:
  it always sits on the top-left corner of the first letter, tilted like a hat, for every game name, title font, banner size
  (compact / full) and screen width (phone and desktop).
* The old stand-alone crown element is gone (`theme.js` no longer injects it, `boxdle-index.html` no longer contains it); any cached copy stays hidden.
* The banner has a little more room above the title (15px) so the crown is never touched or cut by the top of the screen.
* In the compact banner the first sparkle moved to the lower-left corner so it no longer collides with the crown on long titles (NUMBERBLINDLE, COLORBLINDLE).
* Settings -> Decorations "Off" still hides the crown; Candy 3D / Notebook / Classic title styles still show no crown (unchanged).

## Files changed
| File | Change |
|---|---|
| `public/shared/theme.css` | old fixed-position crown rules removed; new title-anchored crown + banner room + sparkle position |
| `public/shared/theme.js` | no longer injects the separate crown element |
| `server/boxdle/public/boxdle-style.css` | same crown fix for Boxdle's own look |
| `server/boxdle/public/boxdle-index.html` | separate crown element removed |

## Tested (headless Chromium, 360x740, 392x850 and 1280x800, stub server, no real TikTok / socket traffic)
Header of all 28 pages: Blindle, Boxdle, Betweendle, Citydle, Codedle, Colorblindle, Colordle, Comparable, Crossdle, Expandle, Findle host + display,
Fixle, Flagle, Forbackle, Linedle, Minedle, Numberblindle, Oracle, Rangedle, Shapedle, Shiftle, Structle, Textle, Towndle, Travle, Twistle, Wordle.
Crown on the first letter in every one. NOT tested: real devices, the Google fonts (the sandbox is offline, so a fallback serif was used - the crown
is sized in em so it follows the real font), dark themes, Contexto (it has its own header with no crown).
