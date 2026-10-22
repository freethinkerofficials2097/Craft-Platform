# Update 100 - EXPANDLE: new defaults

- **Difficulty** now defaults to **Random - any start word that can grow** (was Normal). Applies on a fresh install / until the host picks another difficulty in Settings (their choice is still remembered).
- **Letter tiles** now default to **grey** (tile #8a8f98, white letters, border #62666d) instead of blue. The legend follows automatically (it reads the same color). Any color the host changes in Settings -> Colors still wins and is remembered.

## Files
Changed: `server/expandle/expandle-server.js`, `server/expandle/public/expandle-game.js`, `expandle-index.html`, `expandle-colors.js`, `server/shared/expandle-colors-store.js`

Note: if you deploy over an existing install that already has `data/game-options.json` or `data/expandle-colors.json`, delete those two files (or reset in Settings) to see the new defaults - saved choices override defaults.
