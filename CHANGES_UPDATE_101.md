# Update 101 - CONTEXTO added to the platform

New game **CONTEXTO** (HOME card, `/contexto/`, Socket.IO namespace `/contexto`).

## How it plays
Chat types any word; it gets a rank by meaning (#1 = secret word, #2 = closest neighbour ...). Points go to the first player to find a word in the closest 10 (secret word 5 pts, ranks 2-10 get 4..1). Whoever types the secret word wins; the winning row shows "#1" in green. Hints reveal a closer word, never the answer. Save & Apply starts a round automatically; Auto next round is on by default.

## Platform integration
- **Mode & connection:** HOME's Offline / Test / Live mode and the one shared TikTok connection drive the game (like every platform game). Test mode starts the simulated chat; Offline/Test close any TikTok link. The Settings mode tab follows the running round.
- **Alerts & Records:** gifts / likes / shares work and are archived; the statistics + fake-alert tester sit in Settings.
- **Dictionary:** uses the platform's shared dictionary (no second download).
- **Page:** new HOME button; connects over Socket.IO instead of its own WebSocket.
- **Saved defaults:** "Save & Apply as Default" is stored in `data/contexto-default-settings.json`.
- **Ranking model:** the word-vector model (GloVe) downloads once in the background (needs internet; set `EMBEDDING_NPY_URL` + `EMBEDDING_VOCAB_URL` to use your own). Until ready, rounds use the online/offline backup ranking.

## Files
New: `server/contexto/` (contexto-server.js, embeddings.js, data/, public/). Changed: `server.js`, `package.json` (+wink-lemmatizer, word-list; run `npm install`), `public/index.html`, `public/home.js`, `public/home-views.js`, `public/shared/platform-sync.js`, `public/shared/records-ui.js`, `server/shared/home-cards-store.js`, `server/engagement/engagement-hub.js`, README.md, DEPLOY_GUIDE.md.
