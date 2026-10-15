# UPDATE 81 — FORBACKLE: fewer wrongly refused guesses · SHIFTLE: Strict fit accepts every possible color meaning

## 1. FORBACKLE
Strict fit itself was checked against every possible word and is exact (a word that fits every color on the board is always accepted),
so the refusals came from two places where what the audience saw differed from what the game checked:

* **Hints could suggest a word that Strict fit then refused.** The 💡 "Try: WORD" hint only picked a *best match*, not a word that fits
  every color. It now picks among words that fit every color on the board first (best match is only the fallback when none is left).
* **The board only showed the last 12 guesses, but Strict fit checks all of them.** A guess that fit everything visible could be refused
  because of an older row (e.g. "Doesn't fit the colors of guess #3") that had scrolled out of sight. The board now receives up to the
  last 300 guesses of the round (it scrolls), so every row the check uses can be seen.

Files: `server/forbackle/forbackle-server.js`.

## 2. SHIFTLE — Strict fit works like ORACLE
Before, Strict fit only accepted a guess that matched *this round's real deal* of the colors, so a viewer who still had the wrong idea of
"which color means what" was refused even when their guess was perfectly consistent with their theory.

Now every earlier guess is judged on its own: the guess is accepted if the colors on the board for that guess could come from **any**
arrangement of the three meanings (right spot / wrong spot / not in the word) over the three colors (white / pink / blue) — 3 x 3 meanings
= 6 arrangements. The arrangement may differ from clue to clue. The real secret word always passes, and accepting or refusing a guess
never reveals the real deal. The refusal message now ends with "under any color meaning".

* The 💡 word hint prefers words that fit the real clues (those are always accepted), best match only as a fallback.
* Settings -> Strict fit text and the How-to-play line explain the new rule.
* Strict fit switched OFF still accepts any real word, as before. Scoring is unchanged (1 point per accepted guess, 5 for solving).

Files: `server/shiftle/shiftle-server.js`, `server/shiftle/public/shiftle-index.html`.
