# Update 118 - New game: BOXDLE (live word hunt on a letter grid)

Based on update 117 (included). Nothing removed.

## BOXDLE
- Grid of letter tiles: **6x6, 8x8, 10x10 or 12x12** (Settings -> Grid size). Everyone sees the same grid; a new random grid every round.
- Chat types a word. It counts when it is a **real word** (same big dictionary + language choice as the other word games), can be **traced through touching tiles in all 8 directions** (up, down, sides, corners), is long enough (default 3 letters, host setting) and was **not found yet this round**.
- **Tiles may be reused** switch (Settings -> Letters & tiles): OFF (default) = every tile once per word; ON = a word may come back to a tile it used before (never twice in a row - a tile does not touch itself).
- **Points = number of letters** (5 letters = 5 points, 10 letters = 10 points ...). Live mode feeds the round and all-time leaderboards.
- **Round time: 60 seconds by default**, host can set 10 s - 1 hour (quick buttons + number box). Clock turns red in the last 10 s. At zero the player with most points is celebrated, then the next grid starts (auto-continue).
- Page order (one normal flow, nothing overlaps): floating message window -> **legend** (explains every color) -> clock -> letter grid -> **board of guessed words** (word, who, points; own scroll area; tap a word to replay its path on the grid).
- No keyboard, no number columns. The new word lights up gold with a line through its tiles; the hint (💡) marks the first tile of a hidden word and its length.
- The grid is built with real words planted along touching paths, so it always holds words (works in both reuse modes). After the round the words nobody found are shown.
- Host controls: Live / Test / Offline, TikTok connect, End round now, languages (EN/ID/MS), color shades, legend editor, leaderboards, live event tools, AFK Autopilot presets (grid size, tile reuse, shortest word, round time, pause) and "Save & Apply as default".

## Files
server/boxdle/ (new: boxdle-server.js, public/boxdle-index.html, boxdle-game.js, boxdle-style.css)
server.js | server/shared/home-cards-store.js, game-settings-registry.js | server/engagement/engagement-hub.js | server/autopilot/autopilot-config.js
public/index.html, home.js, home-views.js | public/shared/legend.js, color-shades.js, game-chrome.css, platform-sync.js, records-ui.js | public/autopilot/panel.js | package.json (2.66.0)
Note: the autopilot "Round time" range is now 10-3600 s (was 20-300; Expandle itself still clamps to 10-600).
