# Update 123

Based on update 122 (included).

## 1. CONTEXTO: bigger, customizable text + tidy Settings
- Every font size in Contexto now scales with one setting. The default is "Large" (120% of the old size).
- Settings is now the same tabbed workspace as the other games (Gameplay | Connection | Look & sound | Scores | Live tools), with a search box:
  Game mode, Auto next round, Timers & windows, Appearance (color theme list), Font & text size, Leaderboard, Live event alerts.
- New "Font & text size" card: size presets + fine slider (90%-190%), text font (Nunito, Lexend, Quicksand, Merriweather, Patrick Hand, JetBrains Mono, device font), title font, text weight, line spacing, guess-row spacing, stronger contrast, calm mode (no row animation), reset button. Saved on the device.
- "Save & Apply" and "Save & Apply as default" in the footer use Contexto's own buttons (apply, save, start the game).

## 2. Autopilot round/timer counter vs. platform notifications
On the autopilot Stage page the round / timer chip now fades out the moment a platform notification (gift, follow, share, milestone) appears and fades back in once the last notification has gone, so it never covers the person's name.

## 3. "Save & Apply" sent you to the homepage - fixed
Cause: the small platform connection badge (bottom-left, a link to HOME) faded out after a few seconds but stayed clickable, sitting right on top of the Save & Apply button. A hidden badge is now fully untouchable, a visible one ignores taps while a settings window is open, and it is hidden completely while any settings window is open.

Files: public/shared/platform-sync.js, settings-shell.js, settings-shell.css | public/autopilot/stage.js, stage.css | server/contexto/public/* | package.json 2.71.0
