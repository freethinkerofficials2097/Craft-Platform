# Update 64 - SHIFTLE: legend OFF by default + 🌏 Languages button

## 1. "Legend tells this round's meanings" is now OFF by default
- `server/shared/shiftle-settings-store.js`: the default for `reveal` is now `false` (was `true`).
- Out of the box the legend shows only the three colors with a "?"; chat works out the meanings from the clues
  (meanings are still shown once a round has ended).
- The host turns it on himself in Settings -> Color legend -> *Legend tells this round's meanings*.
  His choice is remembered (`data/shiftle-settings.json`) and applies instantly on every screen.
- Settings switch (`shiftle-index.html`) now starts unchecked, and `shiftle-game.js` only shows it checked when the server says ON.
  The Settings note and the How-to-play text were reworded to match.
- Note: if a `data/shiftle-settings.json` from an older deployment already says `"reveal": true`, that saved choice is kept.
  Delete the file (or switch the toggle off once) to get the new default.

## 2. New 🌏 Languages button in the top toolbar
- Sits between 💡 and ❓. Opens a popup with three switches: English / Bahasa Indonesia / Bahasa Melayu (Malaysia).
- Tick one language, or several to mix them (the existing 7 word-language modes: en, id, ms, en+id, en+ms, ms+id, all).
  At least one must stay ticked. "Apply language" saves it; a running round restarts in the new language.
- It drives the same server setting as the existing Settings -> Word language dropdown, so the two always agree.
- The toolbar is still ONE row with no scrolling: icons and badges size with the screen width
  (checked at 320 / 360 / 390 / 430 px wide - single row, no horizontal overflow).

## Files
`server/shared/shiftle-settings-store.js`, `server/shiftle/public/shiftle-index.html`, `shiftle-game.js`, `shiftle-style.css`
