# Update 120 - BOXDLE: newest guesses on top + 3D tiles; 15 "Box colors & looks" for EVERY game

Based on update 119 (included).

## BOXDLE
1. **Newest guess at the top.** The "Guessed words" box now lists the latest word in the FIRST row; older words move down. The box scrolls to the top by itself when a new word arrives (scroll down to read older words - it returns to the top after 6 s). Tapping a row still shows its path on the grid.
2. **3D tiles.** Letter tiles are glossy raised blocks (light top-left, darker bottom-right, a solid side wall and a soft shadow). A tile on the chosen word path is "pressed down" in gold; the purple hint tile keeps its pulse. The guessed-word rows have the same raised look. The tile colors follow every look automatically.
3. **Box colors & looks are in the Appearance dropdown.** Settings -> Appearance now has two groups: "Plain colors" (the 6 you already had) and "Box colors & looks" (15 designs). Picking any of them in BOXDLE paints the page, largest box, border, the 3 boxes, tiles, text, accent and title, and the server remembers it (every BOXDLE screen matches). The plain colors now also work inside BOXDLE.
4. The "Box colors & look" card in Settings now shows all 15 designs as presets (clicking one also switches the Appearance dropdown and every other game). The color pickers still let you tweak each part; "Reset" goes back to Strawberry.

## The 15 looks (all games)
Strawberry, Lavender, Mint, Peach, Sky, Night (the 6 from before) + NEW: Bubblegum, Lemon Cream, Ocean, Cocoa Bear, Sakura, Matcha, Coral Sunset, Blueberry, Cotton Candy.

## Every other game
- The same dropdown (same 15 designs) is now in every game and in the hub, and the choice is shared (remembered on the device).
- Each look is converted into the platform's --theme-* colors, so every game recolors itself with no per-game edits; game clue colors (green / yellow / grey, etc.) are NOT changed.
- While a look is active, games also get the scrapbook decoration: graph-paper page, washi tape on the title banner, stitched (dashed) top and bottom bars, a title that uses the look's accent.
- If you change the look in another game, BOXDLE follows it the next time it opens (color tweaks you made in BOXDLE stay until the dropdown choice changes).

## Not included
- CONTEXTO and the AFK autopilot page have no Appearance dropdown (they never used the platform theme), so they were not changed.

Files: public/shared/theme.js | public/shared/theme.css | server/boxdle/public/* (game js, css, html) | the Appearance note in the other 21 games' html | package.json 2.68.0 | README.md | CHANGES_UPDATE_120.md
