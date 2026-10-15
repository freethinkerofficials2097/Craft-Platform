# UPDATE 79 — BETWEENDLE: floating message window fixed, knitted boxes, phone sizing

* **Floating message window.** BETWEENDLE's stylesheet had no styles for the floating guess/rejection window (`.toastSlot`, `.rejectionToast`,
  `toast-flash`), so the message showed as loose text. It now works exactly like the other games: a reserved slot under the top bar,
  a dark card that fades in and out, never overlapping the legend or board.
* **Three boxes.** Removed: idle floating, the blue / violet / coral edge on the left, the white pill around the distance.
  Kept: glossy look (now a soft single-tone sheen, not two-tone) and the deep shadows.
  New: the platform's knitted V-stitch frame (same as FINDLE's letter grid, per-theme yarn pair). The middle (hidden-word) box is slightly different:
  swapped yarns, a slightly lighter inside and a dashed running-stitch seam.
* **Android phones.** Smaller, tighter boxes and page padding on screens up to 430px wide. Words are never cut off ("INTERN…" is gone):
  the type shrinks (down to 14px) to fit one line; only extremely long words on very narrow screens wrap onto a second line.
* Legend default texts for BETWEENDLE shortened (`public/shared/legend.js`). Page links bumped to `?v=79`.

Files: `server/betweendle/public/betweendle-style.css`, `betweendle-game.js`, `betweendle-index.html`, `public/shared/legend.js`.
