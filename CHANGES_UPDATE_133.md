# UPDATE 133 - decorations and tile edges are never sliced

Follow-up to update 132. Fixes tiles cut off on the TOP side and decorations that were cut off or half hidden.

## Root causes
1. **Washi tape + heart on top of the card were sliced.** They sit 13-17 px *above* the card edge, but the one-screen lock
   (update 131) made the card and its parent `overflow:hidden` and gave the parent only 4 px of room.
2. **The first tile row lost its top edge.** The guess list scrolls inside its own box with no inner padding, so the 3D lift,
   border and highlight of the first row (the "current" row) were cut flat.
3. **The crown on the title was cut flat at the top of the screen.** The crown emoji paints a few px above its own box and the
   banner box clipped it.
4. **The teddy bear covered the subtitle text** ("Your chat guesses live!").

## What changed (all CSS - no game logic touched)
| File | Change |
|---|---|
| `public/shared/fit-screen.css` | stage reserves 20 px above the card; card / fx-board no longer clip; guess lists get 7 px top + 9 px bottom inner padding (all layouts: letter games, Twistle grid, fx boards, Crossdle board, list-style boards); same room in scroll-fallback mode |
| `public/shared/theme.css` | banner no longer clips; crown moved down so it is fully drawn; subtitle keeps clear of the bear / sparkles |
| `server/boxdle/public/boxdle-style.css` | same crown / banner fix for Boxdle's own look |
| `package.json` | version 2.81.0 |

The fit logic measures `scrollHeight` (not the clip), so the one-screen fitting and the scroll fallback from update 132 behave
exactly as before.

## Tested (headless Chromium, phone sizes 360x740 / 390x844 / 412x915)
* Automatic scan of every game page for any title / decoration / tile / button whose box is cut by a clipping parent or the top
  of the screen: before = tape, heart and first-row tiles clipped in every one-screen game; after = 0 clipped on all 25 games
  at both sizes.
* Visual checks: Blindle, Boxdle, Minedle.
* Regression: all game pages load with no new JS errors and no sideways overflow; update 132 behaviour unchanged.
Not covered: real devices / TikTok LIVE overlay, Flagle & Travle host-only screens, dark themes were not individually inspected
(the rules are theme-independent).

## Deploy
Upload the whole folder, `npm install`, `npm start` (see DEPLOY_GUIDE.md). CSS/JS are sent with `no-cache`, so phones pick the
change up on the next load.
