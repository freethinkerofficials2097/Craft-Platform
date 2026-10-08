# Update 22 - Recorded gift animations in every game (on top of Update 21)

## What it does
When a viewer sends one of these gifts, its recorded animation (with sound) plays over the game, together with
the usual gift card (viewer name, avatar, thank-you line). Works in ALL games, because every game page already
loads the one shared script `public/shared/engagement.js`.

Gifts with animations: Love You So Much, Ice Cream Cone, Pop, TikTok, GG, Rose, Football, Rosa, Heart Me,
Heart Puff, Donut, Perfume, Gold Boxing Gloves, Finger Heart. Any other gift still shows the normal gift card.

## How the videos were prepared
- The recordings had a solid dark backdrop. They were converted to real transparent video
  (`public/shared/gifts/<name>.webm`, VP9 + alpha, with the original sound), so only the gift itself is drawn.
- The original MP4s are kept next to them (`<name>.mp4`) as a fallback for Safari / Firefox, where the dark
  backdrop is blended away with CSS instead.
- Total size of the gifts folder: about 5 MB.

## Behavior
- One animation at a time; extra gifts wait in line. If more than 5 are waiting, the older ones show only the
  short card (no video) so the screen never falls far behind a busy live.
- A combo (e.g. 5x Rose) plays the animation once, and the card shows "5x".
- Sound: on by default. If the browser blocks sound (nobody has tapped the page yet), it plays silently instead.
  Tapping the game once re-enables sound for later gifts.
- Settings (inside each game's Settings panel, "Gift animations"): sound on/off, volume slider, and a
  "Preview this gift animation" picker to test each one without going live.
- "Fake Gift" test button now rotates through these gifts.

## Matching (how a gift is recognised)
By gift NAME as TikTok sends it (case-insensitive). The list is `GIFT_VIDEOS` at the top of
`public/shared/engagement.js`. To add a gift later: put `name.webm` (+ `name.mp4`) in `public/shared/gifts/`
and add one line to `GIFT_VIDEOS`.

## Files changed / added
- `public/shared/engagement.js` (video player, queue, settings)
- `server/engagement/engagement-tracker.js` (card icons for the new gifts, test button cycling)
- `public/shared/gifts/*` (28 new files)

## Deploy
Same as before: push to GitHub, Render redeploys. No new dependencies, no new environment variables.
