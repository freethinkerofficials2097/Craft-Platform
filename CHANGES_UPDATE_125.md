# Update 125 - more room in every game, "Display & layout" settings, more 3D, appearance changes apply fully

Based on update 124 (included).

## 1. More room on computer and Android phone (all games)
- Wider game area (up to 980 px on desktop, was 640-720), thinner padding on phones, a smaller padding inside the big box, and safe-area margins - so the tiles, keys and boards get the width.
- Compact title banner by default (smaller title, small ribbon, tagline hidden on short screens) - the cute banner no longer eats board height.
- IMPORTANT FIX: the games measure the room they have only when the window is resized. After any color / look / header / depth / size change the platform now asks every game to measure again, so a new appearance takes effect fully and at once (tiles re-fit, nothing stays at the old size).

## 2. New shared settings block: Settings -> Appearance -> "🎛️ Display & layout" (every game, the homepage Appearance tab, BOXDLE and CONTEXTO)
Title & header style - Title banner (Compact / Full / Hidden) - Game area width (Standard / Wide / Full) - Info text size (Normal / Large / Extra large) - Decorations (On / Off) - 3D depth (Soft / Strong / Flat) - Reset. Rows are aligned label + selector, and the block follows the active colors. Controls that make no sense on a page are hidden (e.g. width on Flagle's setup screen).
Note: "Hidden" banner also removes the space reserved for TikTok LIVE's top overlay.

## 3. More 3D
Number clues (Colorblindle numbers, Rangedle number keys, count badges, score pills), Crossdle keys, Travle route chips / nodes / buttons, avatars, Linedle wave dots and pillars, hint numbers, timers (raised) and progress bars (groove). On top of the update-124 tiles, keys, buttons, boxes, chips and rows.

## 4. BOXDLE and CONTEXTO
Both now follow width / info text / decorations / depth. BOXDLE also gets Banner size; Flat turns its raised tiles off.

Files: public/shared/theme.js, theme.css | public/home-views.js | public/travle/style.css, crossdle/style.css, flagle/index.html | server/boxdle/public/boxdle-style.css | server/contexto/public/* | package.json 2.73.0
