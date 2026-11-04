# Update 127

Based on update 126 (included).

## 1. Appearances: 10 plain + 30 decorated
Appearance list (every game, the homepage Settings -> Appearance, BOXDLE, CONTEXTO) now has two groups:
- **Plain colors (no decorations): 10** - Cream, Sky Blue, Meadow Green, Blossom Pink, Lavender Violet, Honey Gold + 4 new: Cloud Grey, Mocha Sand, Teal Mist, Midnight Navy (dark). Flat, simple pages: no graph paper, tape, ribbon, sparkles or stickers.
- **Box colors & looks (with decorations): 30** - the 15 you had + 15 new: Grape Soda, Watermelon, Kiwi, Orange Soda, Tulip, Wisteria, Sage, Cupcake, Cookie, Panda, Galaxy (dark), Ember (dark), Forest (dark), Coral Reef, Gelato. All with graph paper, washi tape, ribbon header, sparkles, stitched sticker card, 3D tiles.
3D depth, game area width, banner size etc. work with all 40.
Note: update 126 had put the decorations on the plain colors too; they are plain again. Because every visitor's browser had silently saved "Cream", the platform now starts (once) on the decorated Strawberry look; pick any plain color any time and it is kept.

## 2. Top toolbar: one single row, in every game
Every game's top bar is one row: no sideways scrolling, no second line. All round buttons share the width equally (24-42 px, about 26-35 px on phones), the mode / length badges keep their text, the long game name hides on phones. FLAGLE, TRAVLE and CROSSDLE got the same treatment (in CROSSDLE the header theme drop-down is hidden on phones - it is in Settings; buttons show icons only on phones).
CONTEXTO: its bar no longer scrolls; "Connection details" and "Hide toolbar" moved into a "⋯" menu at the end of the row so the other buttons stay properly sized; Start round is compact.

## 3. CONTEXTO guess rows
The viewer picture + name block is now a fixed-width block that stays in the middle of every row; inside it the circular picture always starts at the same left edge and the name right after it, so from row to row the pictures and names line up in clean columns (rows without a picture - hints, host - keep an invisible spacer so their names align too). Long names are shortened with "..." inside the block.

Files: public/shared/theme.js, theme.css | server/contexto/public/* | 25 pages' Appearance text | package.json 2.75.0
