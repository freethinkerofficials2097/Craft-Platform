TOWNDLE - making the Malaysian place book bigger
================================================
TOWNDLE ships with a built-in list (server/towndle/towns-data-1..7.js) of cities, municipals, districts and towns of every state and
Federal Territory, grouped by district, with a famous / well-known / lesser-known tier for each place.
Coordinates were written by hand and are approximate (about 3 km). Run   npm run check:towns   to see the counts and any suspicious coordinate.

OPTION 1 - add a few places yourself: data/towns-extra.txt
  One place per line:   Name, State, District, Tier(1-3), latitude, longitude [, Type]
  - State: Johor, Kedah, Kelantan, Melaka, Negeri Sembilan, Pahang, Penang, Perak, Perlis, Sabah, Sarawak, Selangor, Terengganu,
           or Kuala Lumpur / Putrajaya / Labuan (the three Federal Territories)
  - District: must be a district name used in the built-in list (see the 2nd column of towns-data-*.js). Leave it EMPTY to let the game pick the
              district of the nearest known place of that state.
  - Type (optional): C city, M municipal, D district, T town (default T)
  Example:   Kampung Contoh, Selangor, Hulu Langat, 3, 3.05, 101.85, T
  Lines that start with # are ignored.

OPTION 2 - load (almost) every populated place of Malaysia from GeoNames
  1) Download  MY.zip  from  https://download.geonames.org/export/dump/  (or cities500.zip / cities1000.zip) and unzip it.
  2) Put  MY.txt  (or the cities file) in THIS data folder and restart the server.
  Only populated places (feature class P) of Malaysia are used. Each one gets the state and district of the NEAREST built-in place
  (so places very close to a state / district border can land in the neighbouring one), tier 3 (rare) and type Town.
  Places whose name already exists, and places more than 120 km from every built-in place, are skipped.

Notes
- Places whose plain name is also an everyday word (Gurun, Song, Bau, Jeli ...) must be typed with the state ("gurun kedah"); the page and the hints show that spelling.
- Two places with the same name: the first keeps the plain name, the other is typed "name + state" (for example "pulai kelantan").
- Neighbours (orange) are decided by the district border list in server/towndle/towns-adjacency.js: edit it if you disagree with a border.

---- Update 108 ----
* GeoNames import = the way to get EVERY Malaysian place. Download https://download.geonames.org/export/dump/MY.zip, unzip, put MY.txt in this data/ folder, restart.
  GeoNames places can be guessed by chat but never become the secret place.
* Missed places: while TOWNDLE runs live, unrecognised place-like chat is saved to data/towndle-unknown.json. Run:  npm run review:unknown
  and add real ones to towns-extra.txt.

---- Update 111 ----
* BULK places: server/towndle/towns-bulk-1..4.js add about 1,170 more lesser-known places (mukims, townships, small towns, islands, new
  townships) to every district. One line per district:   State | District | + Name, Name, Name ...   (an optional =alias/alias can follow a name).
  You can add your own lines; the district name must exist in towns-data-*.js.
* They have no hand-written coordinates: each sits a few km from a real place of its own district. State and neighbour colors are exact; the
  distance and arrow are only a rough guide, so the page shows "~" in front of the distance. They can be GUESSED but never become the secret place.
* Merging rules: a name the book already knows (any spelling variant, same state - or the same name filed in a state next door within 40 km - or
  with / without "Pulau / Gunung / Tasik / Pekan / Bandar") is skipped; names under 4 letters or with a digit are skipped. Places with a real
  position (towns-data, towns-extra.txt, GeoNames) always win over a bulk duplicate. Run  npm run check:towns  for the numbers.
* To give a bulk place an exact position (so it also shows an exact distance), add it to data/towns-extra.txt with latitude and longitude - the
  bulk copy is then ignored.
