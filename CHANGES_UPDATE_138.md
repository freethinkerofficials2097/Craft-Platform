# UPDATE 138
Based on update 137.
1. Stray lines/dots removed: Comparable dashed line under the symbol row; length-panel divider (line/dot/slash/dash) in all games; Twistle empty-symbol dot; Boxdle missed-row dotted line; Contexto "·" separator; dashed line under the title banner.
2. BLINDLE: top of every tile no longer clipped (more room above first row, per-row/tile top margin, no lift on current row). Files: server/blindle/public/blindle-style.css
3. Host controls start minimized in 23 games and open as a sheet OVER the game (no layout push). Files: each *-index.html, public/twistle/index.html, public/shared/game-chrome.css
4. CONTEXTO: title now above the toolbar. Files: server/contexto/public/contexto-index.html, contexto-style.css
NOT tested: real phones (Honor X9b), dark themes, live rounds.

# UPDATE 139 (changes on top of the above)
1. CROSSDLE: diagnostics button removed (now a "Diagnostics" card in Settings); standard icon toolbar (home, round, hint, help, leaderboard, settings, fullscreen); floating Host button removed; settings window titled "Settings".
2. FLAGLE: Test Mode bot (server/flagle.js - startTestBot); standard icon toolbar; hint button moved to the toolbar; settings titled "Settings"; duplicate fullscreen button fixed (theme.js).
3. TWISTLE: lines between rows removed (shared theme.css: .guessRow 3D under-edge shadow); small "TWISTLE" chip under the legend removed.
4. MINEDLE: board tile size now computed from real on-screen size (not game pixels) so the screen-fit zoom cannot make it small/medium/big; guess tiles depend on word width only.
5. SHAPEDLE: same sizing fix; grey bar under the symbols removed (theme.css depth rule no longer hits .symbolCell).
6. CODEDLE / COMPARABLE: same shared fix (.codeCell / .patCell).
7. EXPANDLE: tiles can no longer cover the profile pictures (tile size counts the tile-scale setting; avatar column above; long words scroll inside their column).
8. CONTEXTO: toolbar buttons use the same emoji round-button look as the other games (settings already used the shared Settings window).
NOT tested: real phones, live TikTok, dark themes.
