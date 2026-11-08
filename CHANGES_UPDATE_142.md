# UPDATE 142

1. Symbols / numbers / clue boxes follow the guess tile size (S, M, L...). Default tile size M everywhere; MINEDLE guess tiles default to S (host can still pick M). (public/shared/game-customize.js)
2. LINEDLE and FLAGLE: the floating window announces every audience guess (LINEDLE: green/yellow counts, duplicates, win; FLAGLE: who guessed which country and the distance).
3. TRAVLE: "Host controls" panel starts minimized in every mode.
4. MINEDLE: mine grid size is worked out once for the worst case (guess tiles + result panel visible) and no longer shrinks.
5. BOXDLE: connection line is drawn from the real tile positions/sizes, inside the grid, so it follows any tile size / spacing / ratio change.
6. TEXTLE: avatar has its own column plus a mirror column; guess tiles can no longer overlap the round profile pictures.
7. CONTEXTO: Auto next round also runs from the server (all modes) if the page missed the round end; Test mode auto-started rounds always run the simulated chat; the page runs the round-end sequence even if it missed the win message.

# UPDATE 143
- BOXDLE: the end-of-round "Longest word" is now the longest word found in the whole round (ties: the one found first), shown with its letter count and who found it - in the winner card and in the result banner. Before, it was only the round winner's own longest word.

# UPDATE 144
- AUTOPILOT voting: "Who can vote" is applied strictly. A viewer's role (follower / moderator / subscriber) is now learned from every TikTok event of the live (joins, likes, gifts, shares, follows), not only from the vote's chat line, and "follows the host" is read from every field TikTok may use (followRole, followInfo.followStatus, ...). Any ticked group may vote; nobody outside the ticked groups can. The result log says how many chat votes were not counted.
- AUTOPILOT connection: the next game is linked to the shared TikTok connection while the vote result is on screen, and the link check runs every 2 s for the whole game (stage side retries faster), so no manual reconnect is needed after a game change.

# UPDATE 145
- CONTEXTO: the "Hide toolbar" and "Connection details" buttons (and their "..." menu) are removed; the toolbar is always shown (a hidden state saved earlier on a device is cleared). The line under the "Latest guess" row is gone (hard 3D shadow of its wrapper + under-edge of the row).
- CROWN (title decoration, all games incl. BOXDLE): now a fixed-shape SVG picture instead of an emoji (emoji look and size differ per Android phone / font) and it is placed from the measured top-left corner of the title's first letter (canvas text metrics, in em), re-measured when fonts load, the title is resized or the header style changes.
