# Update 119 - BOXDLE: 4-letter default, long words, cute scrapbook look, colors, auto-scrolling word board, smarter Test bot

Based on update 118 (included). Only BOXDLE changed (plus the version number).

1. **Shortest word is now 4 letters by default** (host can still pick 2-8 in Settings). The long "Touching tiles only ..." line under the grid was removed.
2. **Bigger, easier-to-read tiles**: the grid box uses the full card width, tiles are larger (up to 66 px on 6x6) with larger, bolder letters; card padding was tightened to give the grid more room.
3. **Test Mode really plays**: a full board solver finds every real dictionary word on the grid; the chat bot answers with them (sometimes the longest word left), repeats words, tries off-grid words and chats. Test Mode starts by itself when the game is opened.
4. **Long words**: the grid always hides long words (up to 10 / 13 / 16 / 20 letters on 6x6 / 8x8 / 10x10 / 12x12). Any real English word of 4-20 letters counts - not only the planted ones. "N+ possible" shows how many words the solver found.
5. **Cute look inspired by your cover picture** (BOXDLE only): cream graph paper, navy + pink title with sticker outline, lavender ribbon, washi tape, stitched borders, hearts, sparkles, bear, rounded fonts.
6. **Colors**: Settings -> "Box colors & look": 6 presets (Strawberry, Lavender, Mint, Peach, Sky, Night) + a color picker for the page, the largest box, its border, the 3 boxes inside it (clock, letter grid, guessed words), tiles, letters, text, accent and title. Shared by every screen, remembered after a restart. The special colors (word path, valid words, hint, clock) stay in "Color shades".
7. **Guessed words box**: fixed height and its own scroll; newest word at the bottom and the list scrolls to it by itself (scroll up to read older ones - it returns after 6 s). It can never push another box. The hint / result / solo-practice text moved into one fixed-height status line in the clock box so nothing shifts when it changes.

Files: server/boxdle/* (all four) | package.json 2.67.0 | CHANGES_UPDATE_119.md | README.md
