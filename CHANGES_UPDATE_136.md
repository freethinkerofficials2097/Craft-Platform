# UPDATE 136 - Customize: "Tiles & shapes" + Customize in every game

Based on update 135 (crown fix included).

## 1. New subsection in Settings > Customize: 🔲 Tiles & shapes
* **Quick tile styles** (one tap, applied to every kind of tile of the game): Original, Cute & round, Sharp & flat, Bubbles, Chunky 3D, Big & bold.
* **One card per kind of tile** ("Tiles · ..."), each with a live preview and these controls:
  Size (XS-XL) | Shape (Original, Square, Soft, Round, Pebble, Circle, Leaf, Capsule) | Proportions (Auto, Square, Tall, Wide) |
  Spacing (None, Tight, Roomy, Wide) | Border (None, Thin, Medium, Thick) | Depth & shadow (Flat, Soft, 3D, Glow) |
  Letter size (Small, Large, Huge) | Letter style (Rounded, Serif, Typewriter, Handwritten, Block capitals, Heavy sans) | Pop animation (Off).
  Only the controls that make sense for that tile are shown. "Reset these tiles" per card.
* Which cards each game gets depends on its own components:
  | Game | Tile cards |
  |---|---|
  | Wordle, Blindle, Colordle, Colorblindle, Forbackle, Linedle, Rangedle, Shiftle, Textle | Guess tiles, Keyboard keys |
  | Blindle, Numberblindle, Oracle, Structle | + Count boxes |
  | Numberblindle, Oracle, Structle | Guess tiles (+ keys where the game has a keyboard) |
  | Codedle | + Code cells | Shapedle | + Symbol cells | Comparable | + Symbol circles |
  | Minedle | + Mine grid tiles, Letter bank | Twistle | Guess tiles, Symbol boxes, Keys |
  | Boxdle | Letter grid tiles | Expandle | Word tiles |
  | Betweendle | Word cards | Citydle, Towndle, Fixle | Clue pills |
  | Crossdle | Guess tiles, Hint tiles, Keyboard keys | Findle | Grid letter cells, Found-word pills |
  | Flagle | Flag frame | Travle | Trail chips | Contexto | Guess bars |
* Choices are saved on the device per game, apply instantly, survive reloads, are included in "Reset this game" and
  "Use this layout for all games", and `?gcreset=1` still wipes everything.

## 2. Customize now exists in EVERY game
FINDLE (host + display page) was the only game without it: it now has the whole section (title banner, top bar buttons, score ribbon,
puzzle line, grid, found words, hint chips, host bar + the tile cards).

## Files changed
public/shared/game-customize.js (+ .css) | server/findle/findle-public/findle-host.html, findle-display.html | CHANGES_UPDATE_136.md

## Tested (headless Chromium, 392x850, stub server without socket.io / TikTok)
All 28 pages load, the Customize section and the right tile cards appear, no new console errors (the two errors "io is not a function" /
"lastTilesSignature" also appear on the untouched update 134 in that stub). Every control changed the computed style of sample tiles
(Blindle, full control sweep + reload persistence; Findle, Boxdle, Minedle, Crossdle: Bubbles style).
NOT tested: live rounds with real guesses (tiles were injected with the games' own class names), real phones, dark themes.
Large sizes / roomy spacing on very long words can make a row scroll sideways, like the existing "Guess rows size".
