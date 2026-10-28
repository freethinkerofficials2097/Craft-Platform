# Update 114 - AFK Autopilot: restoring a saved setup file now brings back EVERYTHING

Based on update 113. Open `/autopilot/` -> **💾 Setups** -> **⬆ Restore from a file…**

## What was wrong
1. The setup file only held the game settings you had **locked in**. Games that simply followed their own settings (difficulty, word length, pause,
   regions ...) were not in the file at all, so after a restart or a re-upload they came back with nothing.
2. The panel could write your **old unsaved draft** or an **auto-save** over the freshly restored setup a moment later, or offer "Bring them back" for it.
3. Values that did not fit (more than 20 tips, more than 300 allowed / blocked names, numbers out of range, unknown keys) were dropped **silently**.
4. A setup file with a BOM, a browser-backup wrapper or only named setups could be refused or half-read.

## What changed
- **Export (⬇ Download my setup file)** now also stores `gameSnapshot` - what every game is using right now. The file name carries the date.
- **Restore** reads every shape of file (download, browser backup, bare settings, named-setups only, files with a BOM), then:
  - asks whether to fill in the games' remembered values (only where your setup does not already set them - what you locked in always wins),
  - when the autopilot is running, asks whether to give the result to the game on screen now (a fresh round starts),
  - stops any pending draft / auto-save first, so nothing old can overwrite the restore,
  - shows a **report**: games switched on, games with settings, notes, tips, names, named setups, and every value that could not be kept exactly (with the reason).
- Limits raised so nothing is cut: tips 20 -> 60, allowed / blocked names 300 -> 3000, upload size 2 MB -> 12 MB.
- A setup file shipped in `data/autopilot-setup.json` (fresh server after a redeploy) also fills in the remembered game values.

## Files
`server/autopilot/autopilot-config.js` (unwrapSetup, auditConfig, summarizeConfig, bigger limits) | `server/autopilot/autopilot-engine.js` (export / import / adopt) |
`public/autopilot/panel.js` | version 2.63.0. No new dependencies. How the games play and how the stage works were not changed.
