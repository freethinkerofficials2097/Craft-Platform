# Update 115 - AFK Autopilot: vote screen, rounds / time, full screen, connection

Based on update 114 (included).

## 1. Vote screen no longer skipped
- With only a few games on, "do not repeat the last N games" could leave ONE option and the vote was skipped silently. The options are now topped up: there is always a real vote while 2+ games are switched on.
- A server restart used to cut the running game to 5 s and skip an open vote. The game now keeps its clock (at least 20 s remain); an open vote is opened again from the start.
- Offline / Test mode (no chat): clearly marked practice voters vote (Voting tab, switch-off possible).
- A click / tap on an option on the stage page counts as a vote (Voting tab, switch-off possible).

## 2. Changes follow rounds and time
- Rounds / minutes typed for a game in the Games tab always count for that game, whatever the global rule says.
- Rounds are counted from the game's own state messages (live -> finished), only after the autopilot applied its settings: no phantom rounds, no missed rounds.
- After the last round the result stays on screen for "After the last round keep the result on screen" seconds (default 8, Schedule tab).
- A game whose rounds cannot be counted (e.g. Travle) falls back to the clock.
- Stage chip shows "round n/N".

## 3. Full screen
Inside the stage, a game's own full-screen button now makes the whole STAGE page full screen (it survives game changes). Also: ⛶ button, F key, button in the Esc host bar.

## 4. Connection kept after a change
- The server links the new game to the shared TikTok connection when it starts it, and re-checks every 5 s (PlatformHub.linkGame).
- The loading screen stays until the game is linked and its settings applied (max 20 s).
- The stage re-links Flagle, Travle, Crossdle, Twistle, Findle itself if they drop; the stage's live feed reopens by itself.

## Files
server/autopilot/autopilot-engine.js, autopilot-config.js | server/shared/platform-hub.js | public/shared/platform-sync.js | public/autopilot/stage.js, stage.html, stage.css, panel.js | version 2.64.0
