# Update 110 - AFK Autopilot panel now opens (redirect-loop fix)

## The problem
Pressing "AFK Autopilot" on HOME opened a page that never loaded (browser: "too many redirects" / ERR_TOO_MANY_REDIRECTS).

## The cause
`server.js` had `app.get("/autopilot", ... res.redirect(301, "/autopilot/"))`. Express ignores a trailing slash when matching
routes, so that route ALSO matched `/autopilot/` and redirected to itself forever. The panel page was never served.

## The fix
- `server.js`: `/autopilot` and `/autopilot/` now both serve `public/autopilot/index.html` directly (no redirect).
- `public/autopilot/panel.css`: the "Open stage" link is now styled like the other buttons.
- `package.json`: version 2.59.0.
Nothing else changed. All games are untouched.

## Tested
Real engine + real panel/stage files driven in a headless browser: panel opens at /autopilot and /autopilot/, all 7 tabs render,
a setting auto-saves, Start works, the stage page shows the vote screen, and the engine ran a full cycle
(vote -> result -> next game -> playing, then pause / resume / skip / stop). Syntax check of every .js/.mjs/.cjs file passed.
