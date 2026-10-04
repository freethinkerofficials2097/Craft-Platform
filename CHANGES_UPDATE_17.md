# Update 17 - TEXTLE changes

All changes are inside `server/textle/` (server + public). Nothing else in the platform was touched.

1. **Length hints off by default.** The "N letters" toolbar badge and the empty glowing tiles are hidden.
   Host can switch each on in TEXTLE -> Settings -> "Length hints" (applies instantly, no new round).
2. **📡 Mode button (toolbar).** Dropdown: Offline / Test / Live. Choosing Live opens a floating
   "Connect to TikTok LIVE" window: type username, press Connect, see Connecting / Connected / Failed (with reason).
3. **🎨 Theme button (toolbar).** Dropdown with the 6 platform themes (same ones as Settings -> Appearance).

Files changed: textle-server.js, public/textle-index.html, public/textle-game.js, public/textle-style.css
Deploy: same as before (push folder to GitHub, Render redeploys). No new env vars or dependencies.
