# UPDATE 80 — FINDLE & BETWEENDLE: knitted band replaced by the platform's stitched look

The V-stitch "knitted band" frame (update 79 / FINDLE) is gone. Both games now use the same knitting-theme language as the platform's
buttons, pickers and hero ribbon: the warm theme card, a thread-coloured border and a dashed running-stitch seam. Everything follows the
theme picker (Cream, Sky Blue, Meadow Green, Blossom Pink, Lavender Violet, Honey Gold) automatically.

* **FINDLE** (`server/findle/findle-public/findle-theme.css`): the letter grid is a stitched patch - theme-coloured border, soft fabric
  binding around it, dashed seam just inside. Used by the host page and the TikTok display page.
* **BETWEENDLE** (`server/betweendle/public/betweendle-style.css`): the three boxes are glossy single-colour stitched cards with deep shadows
  (no floating, no coloured left edge, no pill round the distance). The hidden-word (middle) box is slightly different: lighter face and a
  double seam (dashed + fine line) in the accent colour. Card colour still comes from Settings -> Color shades -> "Card".
* BETWEENDLE page links bumped to `?v=80`. Everything from update 79 (floating message window, phone sizing, full words) is unchanged.
