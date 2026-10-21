CITYDLE - making the city book as big as you want
=================================================
CITYDLE already knows more than 6,000 cities (server/citydle/cities-data.js and cities-data-more.js).
To accept EVERY city of the world, drop a free GeoNames file into THIS folder and restart the server:

  1) Download  cities500.txt  (about 200,000 places, every town of 500+ people)  or  cities1000.txt / cities5000.txt / cities15000.txt
     from  https://download.geonames.org/export/dump/  (unzip it, you get a .txt file).
  2) Put the .txt file in this "data" folder, keeping its name (it must start with "cities" and end with ".txt").
  3) Restart the server. The start-up log and the CITYDLE city counter show how many cities were loaded.

Notes
- The biggest city keeps a shared name (Springfield = the largest one); every other one still works as "name + country",
  for example "springfield united states". Very common English words that are also tiny towns (nice, mobile, orange ...) are skipped
  so chat comments are never mistaken for guesses.
- Cities from GeoNames are "lesser-known" for the Difficulty setting unless they have a million people.

To add just a few cities yourself, create  data/cities-extra.txt  with one city per line:
  Name, Country, Continent(EU/AS/AF/NA/SA/OC), latitude, longitude
  Example:   Kampung Baru, Malaysia, AS, 3.17, 101.70
Lines that start with # are ignored.
