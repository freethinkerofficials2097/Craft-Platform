// update 114: the HTTP side of "Save & Apply as default" (see game-defaults-store.js and game-settings-registry.js)
import { GameDefaults } from "./game-defaults-store.js";
import { saveDefaultFromLive, readAllGameSettings } from "./game-settings-registry.js";

const ID_RE = /^[a-z0-9_-]{1,32}$/;

export function mountGameDefaults(app, express) {
  const editKey = String(process.env.HOME_EDIT_KEY || "");
  const guard = (req, res, next) => {
    if (editKey && String(req.get("x-edit-key") || "") !== editKey) return res.status(401).json({ error: "edit-key-required" });
    next();
  };
  const json = express.json({ limit: "60kb" });
  const view = (id) => { const d = GameDefaults.get(id); return d ? { settings: d.settings || {}, form: d.form || {}, savedAt: d.savedAt || 0 } : null; };

  app.get("/api/game-defaults", (req, res) => {
    res.set("Cache-Control", "no-store");
    const games = {}; for (const id of Object.keys(GameDefaults.all())) games[id] = view(id);
    res.json({ games, status: GameDefaults.status(), live: Object.keys(readAllGameSettings()) });
  });
  app.get("/api/game-defaults/:id", (req, res) => {
    res.set("Cache-Control", "no-store");
    const id = String(req.params.id || "").toLowerCase();
    if (!ID_RE.test(id)) return res.status(400).json({ error: "bad game" });
    res.json({ game: id, default: view(id), status: GameDefaults.status() });
  });
  app.post("/api/game-defaults/:id/save", guard, json, (req, res) => {
    const id = String(req.params.id || "").toLowerCase();
    if (!ID_RE.test(id)) return res.status(400).json({ ok: false, error: "bad game" });
    try {
      const out = saveDefaultFromLive(id, req.body && req.body.form);
      res.json({ ok: true, written: out.written, settings: out.settings, default: view(id), status: GameDefaults.status() });
    } catch (e) { res.status(400).json({ ok: false, error: String((e && e.message) || e) }); }
  });
  app.delete("/api/game-defaults/:id", guard, (req, res) => {
    const id = String(req.params.id || "").toLowerCase();
    if (!ID_RE.test(id)) return res.status(400).json({ ok: false, error: "bad game" });
    res.json({ ok: true, written: GameDefaults.clear(id) });
  });
}
