# Update 131

Based on updates 128 - 130 (included).

## 1. Every game fits on ONE screen (no scrolling)
Title, top ribbon, score ribbon, message window, legend, keyboard, hints, the guess board and the host bar are all visible at once.
- New shared files: `public/shared/fit-screen.css` + `fit-screen.js`, loaded by all games.
- The guess list is the one flexible area: it takes the height that is left over and scrolls inside its own box (newest guesses first).
- If a small phone cannot hold everything at full size, the whole game shrinks by a few percent (CSS zoom: text and symbols are re-drawn, never stretched or blurry). It never goes below 70 %, it only shrinks while the guess list would get too small, and it grows back only when there is clear spare room, so the screen never jumps up and down.
- Games with their own layout were handled separately: CROSSDLE (board), TWISTLE (grid), CITYDLE / TOWNDLE / EXPANDLE / FIXLE (board with header row), TRAVLE (the globe now takes exactly the height that is left: `public/travle/fit-travle.js`), CONTEXTO (list inside its own box), FLAGLE (already one screen). BOXDLE keeps its own fitting.
- Tested at 360x740, 390x844, 412x915, 768x1024 and 1280x720.

## 2. New settings section: 🧩 Customize (all games)
Open ⚙️ Settings > 🧩 Customize. Built for an Android phone: big switches, big buttons, one column.
- **Quick layouts**: Everything / Clean / Big board / Guesses only (one tap).
- **Whole screen**: switch "Fit everything on one screen" on or off; "Start with the host bar folded".
- **One card per area, with a switch for every part** and a Small / Normal / Large size button where it makes sense: Title banner (+ description line), Top ribbon buttons (each button separately), Score ribbon & messages (ribbon, floating message window), Legend, Keyboard (+ heading), Game parts (the parts that only this game has, e.g. BOXDLE clock / counters / time bar / letter grid, CITYDLE column titles, EXPANDLE timer, LINEDLE wave panel, MINEDLE mine grid and letter bank, CODEDLE code row, COLORBLINDLE colour counts, COMPARABLE symbol pattern, SHAPEDLE symbol row, TWISTLE round chip / answer tiles / guide, TRAVLE globe bar / trail lines / live activity, FLAGLE flag / hint line / chat / likes / gifters, CROSSDLE hint tiles ..., CONTEXTO latest guess / stats ...), Guess board & banners, Host controls bar.
- **Reset this game** and **Use this layout for all games**.
- Choices are kept on the phone (per game) and apply instantly.
- The ⚙️ Settings button can never be hidden. Rescue link: open the game with `?gcreset=1` to wipe its layout.

Files: public/shared/fit-screen.css|js, game-customize.css|js, settings-shell.js (new "Customize" category) | public/travle/fit-travle.js, style.css | every game page (2 extra links) | package.json 2.79.0
