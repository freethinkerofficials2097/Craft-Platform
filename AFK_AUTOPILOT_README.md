# AFK Autopilot (update 109)

Let the live run by itself. Prepare everything ahead of time, press **Start**, walk away. Stop or take over at any moment.

## 3-step setup
1. **HOME** → switch the platform to **LIVE** mode and connect your TikTok account (as usual).
2. Open **`/autopilot/`** (a button also appears on HOME in Live mode). Go through the tabs, then press **▶ Start autopilot**.
3. In TikTok LIVE Studio / OBS show **`/autopilot/stage`** (instead of a single game page). This page shows every game, the vote and the splash screens.
   Keep that page open - the games are displayed there. Press **Esc** on it for a small Pause / Skip / Stop bar.

## What you can prepare (all saved on the server, auto-saved)
| Tab | What |
|---|---|
| Run | Start / Pause / Skip / Vote now / +5 min / Restart game / Force a game / Stop, live status, warnings, history, event log, practice vote |
| Schedule | How the next game is chosen (vote, my ordered list, random, weighted), first game, avoid repeats, session length, end by time / rounds / either, finish the running round first, leaderboard between games, run for N hours or N games |
| Games | Switch each game on/off, its own minutes / rounds / weight, and its **gameplay settings** (difficulty, word length, regions, round pause...) for the 21 games that share the settings protocol |
| Voting | Voting time, how many games to offer and which, vote by number / letter / name, change vote, minimum votes, tie rule, no-vote fallback, close-vote extension, **who may vote** (everyone / followers / subscribers / moderators / gifters / sharers / allow list / block list), vote weights |
| Stage look | Titles, rotating tips, theme, accent colour, timer chip, how-to splash, loading screen time |
| Safety | When TikTok disconnects (keep / pause / stop), stop when chat is silent, resume after a server restart |
| Setups | Save the whole configuration under a name, load / delete, export / import |

## Good to know
- The **server** owns the schedule (`server/autopilot/autopilot-engine.js`); the stage page only shows it. Reloading the stage or restarting the server does not lose the plan (`data/autopilot.json`).
- Voting needs **Live mode** with a connected TikTok account. Use **🧪 Practice vote** + **➕ 10 test votes** to see the vote screen work without switching anything.
- Followers / subscribers / moderators are read from TikTok's data on each chat message; gifters, sharers and people who followed during the live are remembered by the server (Voting tab → "This live's memory").
- Flagle, Travle, Findle, Crossdle, Twistle and Contexto run with the settings saved inside the game itself (the autopilot starts, times and switches them). "End after N rounds" needs the stage page open.
- Protect the panel with `HOME_EDIT_KEY` (same key as the HOME page).
- Crossdle and Contexto are off by default in the rotation; switch them on in the Games tab if you want them.
