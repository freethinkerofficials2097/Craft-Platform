# Update 116 - AFK Autopilot: varied votes, Travle rounds / time fixed, larger notes, more settings

Based on update 115 (included). Nothing was removed; every existing setting and saved setup file still loads.

## 1. The vote offers different kinds of games
21 of the 27 games are word guessers, so a plain random pick often offered look-alikes (and half the options came back in the next vote).
Every game now has a KIND: 🌍 Geography, 🎨 Colour clues, 🔣 Code & symbols, 🔤 Classic word, 🧩 Puzzle, 🧠 Meaning.
Voting tab -> **🎲 Variety**:
- **At most N games of the same kind** in one vote (default 2; 1 = all different; 0 = no limit). Kinds are taken round-robin, so with 4 options you normally get 4 kinds.
- **Do not offer games that were options in the last N votes** (default 2).
- **Offer games played longest ago (or never) first** (default on).
- **Always on the vote**: up to 3 games offered every time.
Measured in a 2,000-vote simulation (default settings): 3+ games of one kind in a vote 10.3 % -> 0 %, options repeated from the previous vote 0.55 -> 0 per vote, average different kinds per vote 3.0 -> 4.0.
Works with "Random" and "Random, favouring weight". "Every game" / "My list" stay exactly as you set them.

## 2. Travle: rounds and time now work
Cause: Travle runs entirely in the browser and never told the autopilot when a round ended, so rounds could not be counted (the autopilot silently fell back to the clock), and a trail nobody solves never ended.
- Travle now reports its rounds (live / won / lost), so "end after N rounds", the round chip ("round 2/6") and the session leaderboard work for it.
- **Give-up timer**: a round nobody solves is ended after N seconds (answer shown, next round starts). Autopilot default 180 s, 0 = never. Also in Travle's own Settings (default 0 there, so manual play is unchanged). A countdown shows under the globe.
- Games tab -> Travle -> ⚙ Game settings: trail length (hops), give-up time, pause between rounds. The stage sets them in the game every time Travle starts.
- Auto-continue is always switched on by the autopilot for Travle.
- **Safety cap** (Schedule tab): no game runs longer than N minutes (default 45; a session you set longer keeps its length; 0 = off). Stops any "rounds" session whose round never finishes.
Tested end to end (real engine + stage + Travle page): "2 rounds" -> counted 1/2, 2/2, session ended with "round limit reached".

## 3. Larger notes in the vote
Notes under each game (other names, inspired by, your note) are about 35 % larger on every screen size. **Stage look -> Text size in the vote**: sliders for the notes and for the game names / counts (60-250 %), with a live preview. Also a number box in the Notes tab.

## 4. More customisation
- Kind tag next to each game in the vote and on the next-game splash (switch: Stage look).
- "round 2/6" chip on/off (Stage look).
- Safety cap, variety rules, always-include list, text sizes (above).
- Ready check counts Travle's settings; kind chips on every game row; "your switched-on games by kind" summary with a warning if only one kind is on.

## Files
server/autopilot/autopilot-config.js, autopilot-engine.js | public/autopilot/panel.js, panel.css, stage.js, stage.css | public/travle/app.js, index.html, style.css | public/shared/platform-sync.js | package.json (2.65.0)
