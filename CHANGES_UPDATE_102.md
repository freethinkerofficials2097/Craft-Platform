# Update 102 - NUMBERBLINDLE

New game at `/numberblindle/` (folder `server/numberblindle/`, own WebSocket path `/numberblindle-ws`, no dictionary).

- Secret number (PIN) of 3-12 digits, default random 5-8 per round; repeats allowed (switch in Settings).
- Chat comment of only digits (spaces/dashes ignored) with the right length = guess. Strict fit, starter number, auto-continue, hints work as in BLINDLE.
- Clue columns: green / yellow / red counts. Host colours digits on tiles; the 0-9 keyboard row follows (and vice versa). 0 green + 0 yellow = all digits auto-red. Winning row turns green.
- Keyboard show/hide: top-bar button, "Hide" link, Settings switch (remembered per browser).
- Colour legend at the top of the board card, under the floating message window.
- Scoring: 1 point per guess that fits the board, 5 for solving.
- Hints: Number idea / Reveal a digit / Rule out digits (new "number" family in hint settings).
- Registered in server.js, home card, home-cards-store, hint-config-store, platform-sync, records-ui, game-chrome.css, color-shades, legend.
- Run `npm install` as usual (no new dependencies).

## Number length panel
- NUMBERBLINDLE now has the shared length panel (same host controls as the Word length panel: show/hide, texts, rows, size, font, colours, box, position, quick looks), worded for numbers: "NUMBER LENGTH - 6 digits" / "Random: 5 - 8". Toolbar button 🔢, Settings section "Number length panel".
- Its own saved defaults (server/shared/length-panel-hub.js): reset returns to the number wording; "Apply this look to every game" from NUMBERBLINDLE copies only the style, never the number wording, to the word games.
