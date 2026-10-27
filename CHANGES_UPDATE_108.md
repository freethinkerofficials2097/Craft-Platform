# Update 108 - TOWNDLE: much bigger place list, smarter guess matching, place hints

## 1. Bigger place list (921 -> 1,350+ places, every state)
New files `server/towndle/towns-data-5.js` (Johor, Melaka, N. Sembilan, Selangor, KL, Putrajaya, Labuan), `towns-data-6.js` (Pahang, Terengganu, Kelantan,
Kedah, Perlis, Penang, Perak) and `towns-data-7.js` (Sabah, Sarawak): mukims, townships, islands, hill stations, dive spots, longhouse towns.
- Coordinates are from memory and approximate (a few km). Only places I am confident exist were kept.
- New places can be GUESSED by chat. The SECRET place is only picked from the curated list (never from GeoNames imports).
- Rare one-word places whose name is also an everyday word (e.g. "Sahabat", "Salak", "Biawak") must be typed with the state ("Salak Sarawak") so normal chat is not counted as a guess.
- Duplicates are skipped automatically (same name in the same district, or same name + state within 12 km).
- **For the complete list of ALL Malaysian places** drop the free GeoNames file (see data/README-towns.txt: download MY.zip from download.geonames.org/export/dump/, put MY.txt in data/). That adds thousands of villages/mukims on top.

## 2. Guess matching (why valid places were rejected)
- Spelling variants: Kota Bharu/Baru/Baharu, Terengganu/Trengganu, Telok/Teluk, Tanjong/Tanjung, Air/Ayer, Seri/Sri, Hulu/Ulu ...
- Short forms: KL, JB, PJ, Sg Petani, Kg, Tg, Tl, Bkt ...
- "Pulau Redang" = "Redang", "Pekan"/"Bandar"/"Pulau" prefixes optional (never for everyday words); "Ipoh, Malaysia", "ke Ipoh" work.
- One wrong/missing/swapped letter in a long name is accepted when it matches exactly one place (set TOWNDLE_FUZZY=0 to turn off). Ordinary words are never "corrected".
- Host typing a wrong place sees "Did you mean ...?".
- Unrecognised place-like chat is counted in `data/towndle-unknown.json`. Run `npm run review:unknown` to see the most typed ones and add real ones to data/towns-extra.txt.

## 3. New hint system for TOWNDLE (replaces the letter hints)
Six hint types, all progressive (ask again for a stronger step): Place idea, Region/state, Near a known town ("about 20 km east of Taiping", up to 4 different towns),
Name clue (length -> first letter -> last letter -> vowels), Place type & district, Rule out states. Host can turn each type on/off as before; auto-hints rotate through the enabled types.
