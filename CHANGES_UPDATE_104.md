# Update 104 - NUMBERBLINDLE: 4 to 20 digits

- The secret number can now have **4 to 20 digits** (was 3 to 12). This covers every place that sets the length: the fixed-length list and the random From/To lists in Settings, the host's "Set the secret number" box (Live, Test and Offline), the chat/offline guess length check and the number length panel.
- Default is unchanged: a random 5 - 8 digits each round (fixed default 5).
- Numbers longer than 10 digits always repeat digits (there are only ten different digits); the Settings note already says so.
- Checked at 20 digits: scoring (green + yellow + red = 20), all three hints (Number idea gives a 20-digit number; "Rule out digits" correctly says there is nothing to rule out when the secret uses all ten digits), Test Mode auto-play and solving, random 4-20 range, and the board on desktop and phone width (tiles shrink to fit one row, no sideways scrolling).

Run `npm install` as usual (no new dependencies).
