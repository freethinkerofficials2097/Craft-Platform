# UPDATE 76 — BETWEENDLE: correct distances, locked-prefix display, floating boxes

**1. Distance fix.** The distance was counted in a list of only ~8,600 curated secret words, while guesses are accepted from the full
dictionary - so "distance 120" did not mean 119 real words lie between. It is now counted in ONE alphabetical list of EVERY word a
viewer may guess (the full dictionary of the ticked languages + the secret words). The list rebuilds itself when a dictionary finishes
loading or the language changes, and every distance already on the board is re-measured. Starter words, hints and the Test Mode
simulator still pick everyday words (never obscure dictionary words).

**2. Gold alphabet circles removed.** Replaced by the system from the recorded videos:
* When the lower and upper words start with the same letters, those letters are LOCKED (the secret word starts with them too).
  They are shown in GREEN inside the two bound words, and the middle box shows them followed by "?" (e.g. `IN?`). Just `?` until something is locked.
* The A-Z keys above the boxes are plain decorative tiles (nothing is dimmed or highlighted).
* Legend entry, help text and the "Color shades" picker updated ("Prefix green" replaces "Gold").

**3. The three boxes** (lower bound / hidden word / upper bound) are now high-quality floating cards: rounded, glossy top edge,
layered soft shadows, a gentle idle float, a distance pill, and a light dashed-border card for the hidden word.
