# Update 109 - AFK Autopilot (Live mode runs by itself)
New: `server/autopilot/` (engine + settings schema), `public/autopilot/` (panel `/autopilot/`, stage `/autopilot/stage`, HOME button), `PlatformHub.subscribe()`,
`PlatformSync.act()/ready()/gameState()` (lets the stage apply a game's preset through the game's own socket). Docs: AFK_AUTOPILOT_README.md.
Existing games are untouched. Includes everything from update 108 (TOWNDLE expansion).
