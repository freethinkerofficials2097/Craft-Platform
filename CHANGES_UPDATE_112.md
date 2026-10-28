# Update 112 - AFK Autopilot: viewer notes per game, faster game setup, Save & Apply that survives restarts

Based on update 111 (TOWNDLE place book + the autopilot panel fix). Open `/autopilot/`.

## 1. 📝 Notes for every game (new "Notes" tab)
For each game: **Also known as** (other names, up to 6), **Inspired by**, a **note for viewers**, and an optional custom **how-to-play** line.
They show on the stage under every option of the **vote**, on the **winner** screen and on the **next-game splash** (portrait and landscape, up to 9 options - the
layout shrinks automatically). Three switches (other names / my note on the vote / my note on winner + splash) and a live preview. All games are listed in ONE
screen so 27 games take minutes, not hours. Nothing is pre-filled: the names are yours. Edits show on the stage immediately, even mid-vote.

## 2. ⚡ Game settings, faster
* **Set many games at once** (Games tab): choose difficulty / fixed or random word length / number of letters / pause once and copy it to every game that has the
  option (all games, or only those switched on). Games without a given option are skipped (e.g. Citydle has no "letters").
* Per game: a summary chip row (e.g. "Hard · 5 letters · pause 10 s"), a cleaner editor (buttons instead of drop-downs, only the relevant fields: fixed length shows one
  number, random shows a range), **Copy settings from another game** (a true copy), **Back to the game's own settings**, search + filter (all / on / off).
* Covers every setting the 21 shared-protocol games really accept (difficulty, length mode, length / range, pause, starter word, repeat digits, regions, Expandle lengths + round time).
  Flagle, Travle, Findle, Crossdle, Twistle and Contexto use their own protocols and keep the settings saved inside the game (the panel says so on each).

## 3. 💾 Save, Save & apply, and your setup stays
* Changes are a **draft** until **💾 Save** (bottom bar, Ctrl+S). The bar always says "All saved", "You have changes that are not saved yet", or a problem.
* **💾 Save & apply now** (only while running): saves AND gives the settings to the game on screen right now. **↩ Discard**, optional **Save automatically**.
* Leaving with unsaved changes asks first; if the page closes anyway, the next visit offers to bring the changes back.
* Saving is now immediate and **honest**: the panel says if the server could not write to its disk. Files are written safely (temp file + `.bak` copy).
* **Survives other days and redeploys**: loads the saved file -> its backup -> `data/autopilot-setup.json` (shipped inside the project) -> defaults. New **Setups** tab:
  where it is stored, **⬇ Download my setup file / ⬆ Restore from a file**, named setups. This browser also keeps a copy and offers **♻ Restore my setup** if the server ever starts empty.
* `.gitignore` now lets `data/autopilot-setup.json` through (the runtime `data/autopilot.json` stays private). Render persistent disk: `AUTOPILOT_FILE=/var/data/autopilot.json`.
* **Ready check** on the Run tab: saved?, how many games on, how many have settings / notes.

## Files
`server/autopilot/autopilot-config.js` (notes fields, limits, switches) | `autopilot-engine.js` (notes in state, safe save/load, `/save` `/export` `/import`) |
`public/autopilot/panel.js` `panel.css` `index.html` (Games, Notes, Setups, save bar) | `stage.js` `stage.css` (notes on vote / winner / splash) |
`.gitignore` | `AFK_AUTOPILOT_README.md` | `DEPLOY_GUIDE.md` | version 2.61.0. No new dependencies.

## Tested
Real engine + real panel + real stage pages driven in a headless browser: bulk settings, conditional fields, copy-from, search; notes + live preview + switches;
Save / Ctrl+S / discard / draft recovery / reload; vote, winner and splash screens (landscape 1280x720 and portrait 540x960, 6 options with notes, no scrolling);
Save & apply bumps the game's apply counter; download + restore file; restart keeps everything; main file damaged -> backup used; shipped setup file loaded on a fresh disk;
wiped disk -> one-click restore from the browser (settings, notes, named setups); unwritable disk reported; 390 px phone layout; limits (6 names x 40, 80, 120, 140 chars);
partial saves never wipe other games' notes. Syntax check of every .js / .mjs / .cjs. Limit: the real Express / Socket.IO stack and TikTok could not be run here
(no internet): a small stand-in server ran the real autopilot engine and real pages.
