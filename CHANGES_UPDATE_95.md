# Update 95 - CITYDLE: customizable colors, synced with the legend

## What's new
- **Colors section** in CITYDLE's Settings (replaces "Color shades"). Every part of the game has its own color:
  - City tile: Green (the right city) / Yellow (right country) / Orange (right continent) / Grey (wrong continent)
  - Direction arrow badge
  - Distance (km) badge
  - Newest-guess frame
- For each part: the 10-shade row (as before) **plus "Pick any color"** (a free color wheel) and a per-color **↺ Standard** button. "Reset all to standard" still resets everything.
- **Board and legend share the same colors.** Change a color in Settings > Colors, or on a legend entry (Settings > LEGENDS SETTINGS > the color box next to the entry), and the other follows instantly. Legend entries that describe the same thing share one color (e.g. "Rows below" = Grey, "+5 Score" = Green).
- Applies immediately, no new round needed; every screen connected to CITYDLE (e.g. OBS) follows. Saved in the browser and on the server (data/color-shades.json).
- Text color on every tile / badge is chosen automatically (dark or white) so it stays readable on any color you pick.

## Technical
- `public/shared/color-shades.js` - free colors (`#RRGGBB`) supported next to shade indexes; new API `ColorShades.setCustom / reset / isStandard / isCustom`; new CITYDLE color list (`dir`, `km` added; `latest` = frame). The free color picker appears for every game that uses the shared Color shades.
- `server/shared/color-shades-hub.js` - stores/broadcasts a hex color as well as a 0-9 shade.
- `public/shared/legend.js` - CITYDLE legend entries are tied to the game's colors (SYNC_MAP); the legend editor's color boxes edit the same colors.
- `server/citydle/public/citydle-style.css` - new variables `--cd-dir`, `--cd-km`, `--cd-frame` (+ `-dark`, `-ink`).
- `server/citydle/public/citydle-index.html` - Colors section text.
- Other games are unchanged.
