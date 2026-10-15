# UPDATE 73 — FIXLE accepts 3-letter guesses (FIXLE only)

* The shared guess dictionaries start at 4 letters (every other game needs that), so 3-letter guesses were rejected as "not in the word list".
* New `server/fixle/short-words.js`: small English and Malay/Indonesian 3-letter word lists, checked only by FIXLE (language-aware).
* FIXLE chat guesses and the host's offline guess box now accept 3-20 letters. All other games are unchanged (still 4+).
