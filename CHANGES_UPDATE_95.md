# Update 95 - CITYDLE colors + much bigger city book, and the new game EXPANDLE

## 1) CITYDLE: Settings -> City colors (and a 🎨 button in the top bar)
- Pick the color of every part: the 4 city tiles (green / yellow / orange / grey) AND their text color, the direction badge, the distance badge,
  the frame around the newest guess and the ring around the winner. Presets: Classic, Color-blind friendly, High contrast, Soft pastel, Night. Reset buttons per part and for everything.
- The legend uses the very same colors: change a color in Settings and the legend follows; change a color on a legend chip (legend settings) and the game follows.
  Every change applies on every connected screen and is remembered (`data/citydle-colors.json`).
- The newest guess now keeps the exact tile color you picked (it is distinguished by its frame).
- This replaces CITYDLE's old "Color shades" card.

## 2) CITYDLE: a far more comprehensive city book
- Built-in list grew from 524 to 6,300+ cities (every continent: every capital, big and small cities, towns, regions, tourist places).
- Viewers can type any of them (accents / spaces / hyphens do not matter). A less famous namesake works as "name + country" (e.g. "newcastle australia").
- To accept EVERY city of the world: drop a GeoNames file (cities500.txt / cities1000.txt / cities5000.txt / cities15000.txt) into the `data/` folder and restart -
  see `data/README-cities.txt`. `data/cities-extra.txt` adds your own cities one per line.

## 3) NEW GAME: EXPANDLE (`/expandle/`)
- Every round starts with a free 3-letter word. Chat shuffles its letters and adds ONE new letter to make a real 4-letter word, then a 5-letter word,
  and so on (ARE -> TEAR -> STARE -> ...). Only the FIRST valid word for each row is accepted. The newest row is always on top and the words are centered.
- Timed rounds: 60 seconds by default (Settings -> Round time, 10-600 s). The round also ends if the word cannot grow any further (no longer word exists) or at the maximum length.
- Score: 1 point for every accepted word (Live). When the round ends: top scorer celebration + round and all-time leaderboards, then auto-continue.
- Colors: purple = the start word, blue = letters carried over, gold = the NEW letter, framed top row = newest word, green clock (red in the last 10 s).
  Legend above the board (below the floating guess window), all adjustable in Settings -> Color shades; the legend follows.
- No keyboard coloring, no number columns. Word languages (English / Indonesian / Malay) work as in the other games. Hints: a word that grows the newest row,
  a letter you can add, or letters that will not work. The host can set the start word (Offline / Test box) and tap Give up to end a round.

## Files
- NEW `server/shared/citydle-colors-store.js`, `server/citydle/public/citydle-colors.js`, `server/citydle/cities-data-more.js`, `server/citydle/countries.js`, `data/README-cities.txt`, `data/cities-extra.txt`
- NEW `server/expandle/` (`expandle-server.js`, `short-words.js`, `public/expandle-index.html`, `expandle-game.js`, `expandle-style.css`)
- Changed: `server/citydle/*`, `public/shared/legend.js`, `public/shared/color-shades.js`, `public/shared/settings-shell.js`, `server.js`, home cards / registries (`home-cards-store.js`, `hint-config-store.js`, `engagement-hub.js`, `public/index.html`, `home.js`, `home-views.js`, `platform-sync.js`, `records-ui.js`, `game-chrome.css`), `package.json`, `DEPLOY_GUIDE.md`
