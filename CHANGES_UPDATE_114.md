# Update 114 - AFK Autopilot: stick or follow, fixed file restore, "Save & Apply as default" for every game

Based on update 113 (which is included).

## 1. Stick to the saved settings, or follow the games
Games -> 🔗 card -> **When to read the games**: **🔒 Stick to my saved settings** (default: no automatic refresh, saved values always win) or **🔄 Follow the games** (auto-refresh).
Also per game (⚙ Game settings -> Refresh from the game). 🔄 Refresh always works as a one-time look. Choices are saved with 💾 Save.

## 2. "💾 Save & Apply as default" in every game's Settings
Applies the settings and stores them on the server (data/game-defaults.json); restored automatically when the server starts. 21 shared-protocol games, Twistle, Crossdle, Findle: server values.
Flagle, Travle: the values of their settings controls (re-applied when the page opens). Contexto keeps its own button. The autopilot panel shows when a game has a default saved.

## 3. Restore from a file now restores everything
Tolerant reading (text numbers / true-false, capital letters, games by name or as a list, flat settings, browser-backup / wrapped files, BOM), a report of what was restored and what could not be used,
an automatic "Before restore ..." named setup, game defaults inside the setup file, and any data/*autopilot*.json is accepted as the shipped setup.

## Files
server/shared/game-defaults-store.js, game-defaults-routes.js (new) | game-settings-registry.js | server/autopilot/autopilot-config.js, autopilot-engine.js | server.js (1 line)
crossdle.js, findle-server.cjs, contexto-server.js (restore hooks) | public/shared/settings-shell.js/.css | public/autopilot/panel.js | AFK_AUTOPILOT_README.md | version 2.63.0
