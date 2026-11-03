# Update 117 - AFK Autopilot: Host controls stay closed, round/timer chip moved down

Based on update 116 (included). Nothing removed.

## 1. Host controls no longer pop up by themselves
Each game page is loaded fresh at every autopilot game start, and its bottom "Host controls" panel is built open.
Inside the autopilot stage (?autopilot=1) the panel is now closed once right after the game loads (all word games, Twistle, Travle).
Tap "Host controls" to open it any time. Normal play (outside the autopilot) is unchanged.

## 2. Round / timer chip lower, in its own strip
The chip (game name, "round 2/6", timer) sat at the very top, behind TikTok's top information. It now sits centred in a clear strip
directly under the game's title banner. A blank spacer is added to the game page there, so the chip covers nothing; the game starts a little lower
only while the chip is shown.

## Files
public/shared/platform-sync.js | public/autopilot/stage.js, stage.css
