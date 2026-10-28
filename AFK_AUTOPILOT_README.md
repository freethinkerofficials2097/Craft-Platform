# AFK Autopilot (update 109 - notes, save & apply in update 112 - game settings shown in update 113)

Let the live run by itself. Prepare everything ahead of time, press **Start**, walk away. Stop or take over at any moment.

## 3-step setup
1. **HOME** → switch the platform to **LIVE** mode and connect your TikTok account (as usual).
2. Open **`/autopilot/`** (a button also appears on HOME in Live mode). Go through the tabs, then press **▶ Start autopilot**.
3. In TikTok LIVE Studio / OBS show **`/autopilot/stage`** (instead of a single game page). This page shows every game, the vote and the splash screens.
   Keep that page open - the games are displayed there. Press **Esc** on it for a small Pause / Skip / Stop bar.

## What you can prepare (all kept on the server when you press 💾 Save)
| Tab | What |
|---|---|
| Run | Start / Pause / Skip / Vote now / +5 min / Restart game / Force a game / Stop, live status, warnings, history, event log, practice vote |
| Schedule | How the next game is chosen (vote, my ordered list, random, weighted), first game, avoid repeats, session length, end by time / rounds / either, finish the running round first, leaderboard between games, run for N hours or N games |
| Games | **⚡ Set many games at once** (pick difficulty / word length / pause once, copy it to every game that has the option), then per game: on/off, minutes / rounds / weight and **⚙ Game settings** (difficulty, fixed or random word length, regions, expandle lengths, starter word ...) with a summary chip per game, search, filter and "copy settings from another game" - for the 21 games that share the settings protocol |
| Notes | For every game: **Also known as** (other names), **Inspired by**, a **note for viewers** shown during the vote, and an optional custom **how-to-play** line. Live preview, three on/off switches, and a button to try it on the stage |
| Voting | Voting time, how many games to offer and which, vote by number / letter / name, change vote, minimum votes, tie rule, no-vote fallback, close-vote extension, **who may vote** (everyone / followers / subscribers / moderators / gifters / sharers / allow list / block list), vote weights |
| Stage look | Titles, rotating tips, theme, accent colour, timer chip, how-to splash, loading screen time |
| Safety | When TikTok disconnects (keep / pause / stop), stop when chat is silent, resume after a server restart |
| Setups | Where your setup is stored, **download / restore a backup file**, named setups (save, load, delete) |

## Good to know
- The **server** owns the schedule (`server/autopilot/autopilot-engine.js`); the stage page only shows it. Reloading the stage or restarting the server does not lose the plan (`data/autopilot.json`).
- Voting needs **Live mode** with a connected TikTok account. Use **🧪 Practice vote** + **➕ 10 test votes** to see the vote screen work without switching anything.
- Followers / subscribers / moderators are read from TikTok's data on each chat message; gifters, sharers and people who followed during the live are remembered by the server (Voting tab → "This live's memory").
- Flagle, Travle, Findle, Crossdle, Twistle and Contexto run with the settings saved inside the game itself (the autopilot starts, times and switches them). "End after N rounds" needs the stage page open.
- Protect the panel with `HOME_EDIT_KEY` (same key as the HOME page).
- Crossdle and Contexto are off by default in the rotation; switch them on in the Games tab if you want them.

## Notes for viewers (update 112)
Open the **📝 Notes** tab. For each game you can write:
- **Also known as** - the other names viewers may know it by (up to 6, 40 characters each, separated by commas)
- **Inspired by** - the game it is inspired by (80 characters)
- **Note for viewers** - a short tip shown under the game during the vote (120 characters)
- **How to play** - your own one-line explanation (140 characters); empty = the built-in line

They appear on the stage: under every option of the **vote**, on the **winner** screen and on the **next-game splash**. Three switches in the Notes tab turn them off
(other names / my note on the vote / my note on winner + splash). Changes show on the stage at once, even during a vote. Nothing is pre-filled - the names are yours.

## Save & apply (update 112)
Changes are a **draft** until you press **💾 Save** (bottom bar, or Ctrl+S). The bar always tells you: "All saved", "You have changes that are not saved yet" or a problem.
- **💾 Save** - writes everything to the server (`data/autopilot.json`). It is there every time you launch the platform again. Settings you save while the autopilot runs apply from the next game / vote.
- **💾 Save & apply now** (shown only while the autopilot runs) - also gives the new settings to the game on screen right now (a fresh round starts).
- **↩ Discard** - back to the last saved version. **Save automatically** (tick box) saves 1.5 s after every change instead.
- Closing the page with unsaved changes asks first; if it happens anyway, the panel offers to bring the changes back next time.

## Keeping your setup between deployments
`data/autopilot.json` lives on the server's disk. Some hosts (Render's free plan) wipe the disk at every redeploy. Three safety nets:
1. **Setups tab → ⬇ Download my setup file**, rename it `autopilot-setup.json`, put it in the project's `data/` folder and deploy. A server with no saved setup loads it by itself (then Save keeps it).
2. **Persistent disk** (Render: add a Disk, mount `/var/data`, environment variable `AUTOPILOT_FILE=/var/data/autopilot.json`).
3. **This browser keeps a copy** of your setup. If the server starts empty, the panel offers "♻ Restore my setup" in one click.
Loading order at startup: the saved file → its `.bak` backup → `data/autopilot-setup.json` → factory defaults. The Setups tab shows which one was used.

## Game settings now follow - and show - each game's own settings (update 113)
Open **🎮 Games**. For every game, **⚙ Game settings** now shows what that game is using right now (difficulty, fixed / random word length, number of letters, pause between rounds, regions, Expandle lengths and round time, starter word, repeating digits), read straight from the running game:
- The **chips** under each game's name show the settings the game will use. A **coloured chip** = set in the autopilot (it overrides the game). A **plain chip** = followed from the game.
- Inside **⚙ Game settings**: the option the game uses now has a **dashed outline**, number boxes show **"game: 6"**, the regions the game uses are ticked. Click or type something to change it; click **(game's own)** to follow the game again.
- **🔗 Follow the games' own settings** (top of the Games tab): **⬇ Lock in every game's current settings** copies what every game uses now into the autopilot in one click (then press **💾 Save**). **🔄 Refresh** reads the games again (also done automatically when you come back to this tab).
- Per game: **📌 Lock in the game's settings**, **↺ Follow the game again**, **📋 Copy settings from…**.
- Twistle, Findle, Crossdle and Contexto keep their own settings inside the game: they are shown here **to check only** (change them in the game). Flagle and Travle keep theirs in the browser you used, so the server cannot read them.
- Why "lock in"? A game forgets its settings when the server restarts. A locked-in setting is stored in your autopilot setup (`data/autopilot.json` / the setup file) and sent to the game every time it starts.

## Update 114 - restoring a setup file
Setups -> ⬇ Download my setup file now includes the settings every game is using at that moment. ⬆ Restore from a file… brings back settings, notes, named setups
and those game values, then shows a report of what was restored and anything that could not be kept exactly. Old files (made before update 114) still restore;
they just have no remembered game values.
