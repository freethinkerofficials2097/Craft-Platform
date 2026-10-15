# Update 58 - three hints per game + new Settings workspace

## 1. Hints: every game now has its own system with 3 types
| Game | Hint 1 | Hint 2 | Hint 3 |
|---|---|---|---|
| Blindle, Oracle, Colorblindle, Colordle, Structle, Textle, Rangedle, Codedle, Shapedle, Twistle | 💡 Word idea (the game's own clue, unchanged) | 🔤 Reveal a letter | 🚫 Rule out 3 letters |
| Flagle | 🌍 Continent | 🔤 First letter | 🔢 Letter count |
| Travle | 🗺️ Country shape | 🔤 Name outline | 🧭 Neighbour clue (new) |
| Findle | 🔤 Reveal a letter | 🅰️ First letters of all hidden words | ✨ Highlight a word (glows on the grid, also on the display screen) |
| Crossdle | 🔤 Reveal a letter | 🚫 Rule out letters | 🅰️ First + last letter |

The 💡 button now opens a small menu with the three types (shows how many hints are left and any wait time).

### Host customisation - Settings -> Hints (per game, remembered)
- Hints on/off, and each of the 3 types on/off
- Hints allowed per round (0 = unlimited)
- Wait between hints in seconds (0 = none)
- Automatic hint after every N guesses (0 = never) - all games except Flagle, Travle and Findle. Crossdle keeps its old "every 4 guesses" as the default.
Travle's hint settings are saved in the host's browser (the game runs in the browser); all other games save on the server (`data/hint-settings.json`).

## 2. Settings workspace (all 14 games)
The side drawer is replaced by a centred workspace:
- left sidebar of categories: Gameplay, Hints, Connection, Look & sound, Scores & feedback, Live tools (tabs on phones)
- every feature is a card with an icon, a title, a plain-language description (long ones fold behind "Read more") and a badge: **Applies instantly** or **Needs Apply**
- search box filters every setting
- sticky footer with connection status and the Apply button
- the game's original controls are moved, not rebuilt, so everything still works; if the workspace ever fails to build, the old panel stays usable.
Files: `public/shared/settings-shell.js/.css`, `hints.js/.css`, `server/shared/hint-config-store.js`, `word-hints.js`.

## Follow-up (same update): phone fit + simpler Settings
- Phone layout rebuilt: the window fills the screen (dynamic height), no sideways scrolling, compact header, slim pill-shaped section ribbon that scrolls sideways.
- Smaller header ("Settings") and section labels/icons, still clearly readable.
- Search removed.
- Footer now holds one button, **Save & Apply**: it applies every chosen setting and closes Settings automatically (the mode/TikTok status and the "Needs Apply" sentence were removed from the footer).
