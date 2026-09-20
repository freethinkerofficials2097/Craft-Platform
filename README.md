# TikTok LIVE Game Platform

One deployed link, a game-selector home screen, and **five** independent
games — **Flagle Live**, **TRAVLE Live**, **Blindle**, **Findle Live**, and
**CROSSDLE Live** — each reading your TikTok LIVE chat directly as
guesses. You never touch code; follow `DEPLOY_GUIDE.md`.

## Layout

```
public/
  index.html        <- the game-selector home screen
  shared/           <- theme picker, one-time-login session, celebration
                       popup, shared fun extras
  flagle/           <- Flagle Live client
  travle/           <- TRAVLE Live client
  crossdle/         <- CROSSDLE Live client
server/
  env-bridge.js     <- mirrors the two TikTok-key env var names onto each
                       other; MUST be imported before any game module
  flagle.js         <- Flagle's server logic, Socket.IO namespace /flagle
  travle.js         <- TRAVLE's server logic, Socket.IO namespace /travle
  blindle/          <- Blindle's server logic + its own public/ client
                       folder, self-mounted at /blindle with its own
                       WebSocket path
  findle/           <- Findle's server logic + its own findle-public/
                       client folder, Socket.IO namespace /findle
  crossdle/         <- CROSSDLE's game engine, dictionary, TikTok manager
server.js           <- the ONE process Render runs — wires every game in
package.json        <- one shared dependency list (every game needs the
                       same handful of packages)
data/               <- small on-disk leaderboard/dictionary-cache files
                       some games save here (created automatically)
```

Each game is fully self-contained on the client side — its own HTML/CSS/JS
and its own TikTok connection UI. On the server side, four of the five
(Flagle, TRAVLE, Findle, CROSSDLE) run on their own **Socket.IO namespace**
(`/flagle`, `/travle`, `/findle`, `/crossdle`) so their events never cross
paths. Blindle instead opens its own **WebSocket** server on a dedicated
path (`/blindle-ws`) — a different real-time technology, but still bound to
the one shared HTTP server, so it coexists safely with everything else.

### One-time login

Every game shares one TikTok username via `public/shared/session.js`
(stored in the browser's `localStorage`, this device only — there's no
account system, just a shared "who am I streaming as"). Connect once on
any game, and every other game pre-fills that username and auto-connects
the moment you open it — no re-typing, no re-clicking Connect, when you
switch games mid-broadcast. Typing a different username on any game's
connect screen updates it everywhere the next time you switch.

### Theme system

All five share the same platform **theme picker** (cream / sky blue /
meadow green / blossom pink / lavender violet / honey gold) via
`public/shared/theme.css` + `theme.js` — pick a color on any page and it
carries over to the rest via `localStorage`. Each game keeps its own
signature accent colors (Blindle's gold/coral, Findle's leaf/citrus/berry,
CROSSDLE's decoy-blue/green/yellow tiles, etc.) — only the backgrounds,
panels, borders and body text follow the shared theme. Each theme now
defines three visibly distinct tonal steps (page background → card →
nested/secondary panel) plus a shared elevation shadow, so panels actually
separate from the page instead of blending into it, and every bright
accent color used as text (not just as a background/border) has a
dedicated darker "-text" variant so it stays readable against a light
background instead of the dark backgrounds these games originally shipped
with.

They also share one TikTok sign-in key. Some of the original games used
the env var name `TIKTOK_SIGN_API_KEY`, others used `EULERSTREAM_API_KEY`
— both names refer to the same EulerStream key, and `server/env-bridge.js`
mirrors whichever one you set onto the other, so you only need to set
**one** environment variable in Render. This file is deliberately the
*first* thing imported in `server.js` — ES module imports are hoisted and
evaluated before the importing file's own code runs, and several games
read their key from `process.env` at their own module-load time, so the
mirroring has to happen before those modules load or it's too late to help.

## Engagement alerts (Gifts, Likes, Shares) — every game

On top of each game's own mechanics, the whole platform shares one
**Engagement** layer (`server/engagement/`, `public/shared/engagement.js`)
that watches whichever game currently has a live TikTok connection and
shows on-screen alerts for gifts, likes, and shares — no per-game setup
needed, it's already wired into all five games.

- **Gift combos** (holding down a rose, etc.) are buffered until the combo
  actually finishes, so a 10x rose doesn't fire ten separate alerts.
- **Individual milestones** — a specific viewer hitting 100/300/500/700/
  1k/2k/3k/4k/5k/10k+ likes (this session), or sharing the LIVE, gets a
  personalized alert with their name and profile picture (when TikTok
  provides one).
- **Room milestones** — the whole session's cumulative likes/shares
  crossing a big round number (1k, 10k, 100k, ...) gets a bigger,
  confetti-tier alert.
- **A queue, not a stack** — alerts show one at a time for ~3.5 seconds
  each, so a burst of simultaneous events never piles up or breaks the UI.
- **Two small icon buttons appear on every game screen**: 📊 (bottom-left)
  is a live diagnostics readout — Total Gifts / Shares / Likes since the
  server started, plus the same "raw payload" logging style already used
  elsewhere on this platform. 🧪 (bottom-right) is a **host-only Test
  Event panel** — Fake Gift / Fake Share / Fake Milestone / Fake Room
  Milestone buttons that run the exact same code real events do, so you
  can check the animations look right without ever going live.

Like the rest of the platform, there's no account system — the diagnostics
and test buttons are just always-there icons, the same trust model as
every other host control already on these screens.

## Running it locally (optional — most people can skip straight to Render)

```bash
npm install
cp .env.example .env   # then paste your EulerStream key into .env
npm start
```

Then open `http://localhost:3000` in a browser.

## Deploying for real

See `DEPLOY_GUIDE.md`.

## Sharing with a co-host

She opens your link, picks a game, and connects her own TikTok username
(this overwrites the saved one-time-login username on her own browser
only — it's stored per-device, not shared between people). Flagle and
CROSSDLE support both of you hosting *simultaneously* on the same link
(each browser tab gets its own independent connection). TRAVLE, Blindle,
and Findle currently support **one active TikTok connection at a time per
game** — if you're both live on the same one of those at the exact same
moment, the second person's connect takes over from the first. Not a bug
to fix urgently — just tell me if you'd like any of those upgraded to
Flagle's per-host model later.

## All five games, briefly

**Flagle Live** — guess the blurred flag before time runs out; the flag
sharpens continuously and wrong guesses add a distance-and-direction hint.
Live top-10 ticker, Top Likes/Gifters tabs, host hint button, celebration
animation, full-screen toggle. 198 countries including Palestine.

**TRAVLE Live** — two random countries are picked; chat calls out any
country that could form a land-border chain between them, building inward
from both ends, no guess limit. Scored 3/1/0 points depending on whether
the guess is on the shortest path, a valid-but-longer connection, or
neither. Real country shapes on a draggable, zoomable 3D globe.

**Blindle** (formerly WORD500) — chat deduces a hidden word (4-20
letters, host-tunable) from green/yellow/red **count** clues alone — never
which letter is where. Unlimited guesses, a scored difficulty engine
(Normal/Medium/Hard/Random) picks how tricky the secret word is, and a
370,000+ word dictionary checks every guess for validity.

**Findle Live** — a themed word-search grid; chat calls out hidden words
as they spot them in any of 8 directions. A letter only clears once every
word using it has been found, consecutive finds build a combo multiplier,
and a synthesized sound effect plays on every find (host-side, no audio
files to host). The grid stays a true, fixed-shape square at any screen
size, including full screen.

**CROSSDLE Live** — an "ambiguous Wordle": after every guess, a *second*,
hidden decoy word is also chosen, and a tile turns green if it matches the
real answer **or** the decoy — so a green tile is a clue, never proof.
Both the real answer and the decoy word are drawn from the same curated,
always-recognizable word list Blindle uses (not the full 370,000+ word
dictionary, which is still used to validate that a viewer's guess is a
real word) — so the word chat is solving is never an obscure dictionary
entry nobody would guess. Unlimited guesses, no clock, a round runs until
it's solved or the host skips/reveals it.

Full details for each game's own mechanics are documented inside that
game — tap **?** / **How to Play** on its own screen.
