# Update 113 - AFK Autopilot: each game's own settings are followed AND shown in "Game settings"

Based on update 112. Open `/autopilot/` -> **🎮 Games**.

## What changed
1. **The autopilot now reads what every game is using** (difficulty, fixed / random word length, number of letters or digits, pause between rounds, regions,
   Expandle start / max length / round time, repeating digits) and shows it in each game's **⚙ Game settings**: dashed outline on the option the game uses,
   "game: 6" in number boxes, regions pre-ticked, and a summary chip row (coloured = set in the autopilot, plain = followed from the game).
   You can check every value and change any of them; "(game's own)" = follow the game again.
2. **Faster setup**: **🔗 Follow the games' own settings** card with **⬇ Lock in every game's current settings** (all games or only the switched-on ones), **🔄 Refresh**;
   per game **📌 Lock in the game's settings**. Locked-in values are kept in your autopilot setup (they survive server restarts, which reset the games themselves).
3. Twistle, Findle, Crossdle and Contexto are shown read-only (their settings stay in the game). Flagle and Travle keep theirs in the browser, so the panel says so.
4. Ready check (Run tab) now says how many games have saved autopilot settings and that the others follow their game.

## Files
`server/shared/game-settings-registry.js` (new) | one `registerGameSettings(...)` line in each of the 21 shared-protocol games + Twistle, Findle, Crossdle, Contexto |
`server/autopilot/autopilot-engine.js` (`GET /api/autopilot/game-settings`) | `public/autopilot/panel.js`, `panel.css` | `AFK_AUTOPILOT_README.md` | version 2.62.0. No new dependencies.
Nothing about how the games play, how settings are sent to the games, or how the stage works was changed.
