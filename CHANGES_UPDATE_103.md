# Update 103 - NUMBERBLINDLE test mode | EXPANDLE defaults

## NUMBERBLINDLE - Test Mode now really auto-tests
- The Test Mode chat simulator now starts as soon as a page opens in Test mode (it used to start only after "Apply", so the page said "simulating chat" while nothing happened) and it opens the first round by itself.
- Simulated viewers behave like a real audience: most guesses FIT every clue on the board (so the board fills up and rounds get solved), some are deliberate mistakes (strict-fit rejection message), some repeat a number, some have the wrong number of digits, some are plain chat, and a rare lucky viewer types the secret so rounds always finish.
- Host "End game" is respected: the simulator only auto-opens a round once per start.
- Checked end to end (offline guesses, set secret, strict fit on/off, starter number, fixed/random length, no-repeat digits, 3 hint types, live-chat scoring 1/5 points, give up, play again, auto-continue, drawers, keyboard toggle) - all passing.

## EXPANDLE
- Difficulty defaults to "Random - any start word that can grow". The saved difficulty now uses a new key, so an old saved "Normal" (which was only the previous default being re-saved on every Apply) no longer overrides it. A choice the host makes from now on is still remembered. Unknown values fall back to Random.
- Letter tiles are grey by default everywhere: the stylesheet fallback (was blue) and the legend fallback now match the grey defaults (#8a8f98). Colors the host saved in Settings -> Colors are untouched.

Run `npm install` as usual (no new dependencies).
