# UPDATE 69 — COMPARABLE added (everything else unchanged)

* New game **COMPARABLE** at `/comparable/` (Socket.IO namespace `/comparable`), taken from
  CRAFT_UPDATE_66 (ALTERNATE 2) (COMPARABLE). Its own notes: `CHANGES_UPDATE_66_COMPARABLE.md`.
* Added to the platform wherever the other games are listed: `server.js`, HOME card + NEW tag,
  records names, engagement hub, hint settings, HOME-card editor, platform sync, colour-shade
  editor (green / grey / blue / orange), hero title style.
* The platform is otherwise exactly update 68 (BETWEENDLE with 4-12 random length, Random
  difficulty and Auto-continue ON by default). COMPARABLE follows the same new defaults:
  difficulty Random, Auto-continue ON, host can change both.
* New file: `server/shared/comparable-settings-store.js` (remembers the legend choice in
  `data/comparable-settings.json`).
