# Update 124

Based on update 123 (included).

## 1. Homepage: Appearance moved into Home settings
The colour picker is gone from the front of the homepage. It is now in ⚙️ Home settings → 🎨 Appearance (platform colors + the 15 cute looks + 3D depth). The choice still applies to the homepage and every game.

## 2. BOXDLE: comfortable on Android phones and desktop
- Softer tiles and sticker edges (less glare on a bright phone screen), darker small grey text (readable contrast), slightly bigger small texts.
- Top bar: finger-sized buttons (36 px) - the brand text and the fullscreen button are hidden on phones to make room; badges are bigger.
- Banner shorter and calmer on phones (fewer decorations, tagline hidden on short screens, banner hidden in landscape / very short screens) so the letter grid starts higher; the grid gets more width.
- The 3D wall of the tiles now follows the gap between tiles (no overlapping walls on 10x10+ boards).
- Pinch-zoom is allowed again (accessibility), taps never trigger double-tap zoom, safe-area margins for notched phones / gesture bars, word list height follows the real viewport.
- Desktop: a wider stage and slightly larger words on big screens.

## 3. 3D for every game (new setting: "3D depth")
Settings → Appearance → 🧊 3D depth (Soft default / Strong / Flat). Shared by all games, also in Home settings → Appearance and in CONTEXTO's settings. It works with every color (plain colors too), and is matched to what each game is made of:
- BIG boxes (main card, panels, globe / route / feed / setup / host cards, modals, flag frame): slab with a solid side wall + soft shadow.
- TILES (letters, code cells, pattern cells, symbols, expand/mine tiles, letter chart, hint tiles): glossy raised blocks.
- KEYS + BUTTONS: raised and pressed down when tapped.
- SMALL boxes (status/hint chips, legends, pills, badges, swatches, pickers): small raised stickers.
- ROWS (answer rows, host rows, ticker items): thin raised strips.
- CONTEXTO: board, latest guess, pop-up cards, guess rows, buttons.
- BOXDLE keeps its own tile 3D.
Game clue colors are never changed.

Files: public/index.html, home-views.js, home-views.css, shared/theme.js, theme.css | server/boxdle/public/* | server/contexto/public/* | package.json 2.72.0
