TOWNDLE - making the Malaysian place book bigger
================================================
TOWNDLE ships with a built-in list (server/towndle/towns-data-1..4.js) of cities, municipals, districts and towns of every state and
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
