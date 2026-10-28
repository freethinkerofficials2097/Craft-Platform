// ===================================================================
// AUTOPILOT ENGINE  (update 109)  -  "AFK mode" for the Live mode
//
// The host prepares everything ahead of time (Settings on /autopilot/), presses Start, and the platform runs the live by itself:
//
//   starting -> [voting] -> playing (game session) -> [wrapup] -> [summary] -> voting / break -> result -> playing -> ...
//
//   * The ENGINE (this file, server side) owns the schedule: which game runs, for how long, the chat vote for the next game,
//     who may vote, the history. It reads chat / gifts / follows from the platform's ONE shared TikTok connection
//     (PlatformHub.subscribe) and survives a browser reload or a server restart (data/autopilot.json).
//   * The STAGE page (/autopilot/stage, the page the host puts in TikTok LIVE Studio / OBS instead of one game page) shows the
//     current game in a frame, the vote screen and the splash screens, and applies the game's preset settings through the game
//     page's own socket. It reports back (round finished, leaderboard) so "end after N rounds" and the leaderboard work.
//   * The host can Pause, Skip, start a vote now, force a game, extend the time or Stop at ANY moment from /autopilot/
//     (also from a phone), or just press Esc on the stage.
//
// REST (JSON):   GET  /api/autopilot                 config + state + catalog
//                GET  /api/autopilot/stream          state pushed live (Server-Sent Events)
//                PUT  /api/autopilot/config          save settings (sanitised)
//                POST /api/autopilot/save            {config, apply}  save to disk (+ re-apply to the game on screen) and tell whether it reached the disk
//                GET  /api/autopilot/export          download the whole setup (settings + named setups) as autopilot-setup.json
//                POST /api/autopilot/import          restore a setup file / a browser backup
//                POST /api/autopilot/{start,stop,pause,resume,skip,vote-now,extend,force,restart-game,preview-vote,test-vote,reset-memory}
//                GET|POST|DELETE /api/autopilot/profiles...   named setups
//                POST /api/autopilot/report          (the stage page: round progress)
// If HOME_EDIT_KEY is set, every POST / PUT / DELETE except /report needs it (header x-edit-key), like the rest of the platform.
// ===================================================================
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { GAMES, GAME_IDS, gameById, DEFAULT_CONFIG, PRESET_FIELDS, PRESET_KEYS, REGION_CHOICES, NOTE_LIMITS, sanitizeConfig, enabledGames } from "./autopilot-config.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = process.env.AUTOPILOT_FILE || path.join(__dirname, "..", "..", "data", "autopilot.json");
// update 112: a setup file that is shipped INSIDE the deployed folder (data/autopilot-setup.json). It is used when the server has no saved setup of its own
// (a fresh disk after a redeploy), so a setup you prepared once is never lost.
const SEED_FILE = process.env.AUTOPILOT_SETUP_FILE || path.join(__dirname, "..", "..", "data", "autopilot-setup.json");
const TICK_MS = 500;
const STAGE_STALE_MS = 15000;
const MAX_MEMORY = 60000; // viewers remembered per live (gifters / followers / sharers)
const clone = (o) => JSON.parse(JSON.stringify(o));
const now = () => Date.now();
const rnd = (n) => Math.floor(Math.random() * n);
const shuffle = (a) => { const r = a.slice(); for (let i = r.length - 1; i > 0; i--) { const j = rnd(i + 1); [r[i], r[j]] = [r[j], r[i]]; } return r; };

// ---- reading a TikTok event ----------------------------------------------------------------------------------------
function hasBadge(u, word) {
  const arr = (u && (u.badges || u.userBadges || u.badgeList)) || [];
  if (!Array.isArray(arr)) return false;
  return arr.some((b) => /subscri|fan\s*club|moderator/i.test(JSON.stringify(b || "")) && new RegExp(word, "i").test(JSON.stringify(b || "")));
}
export function readViewer(d) {
  const data = d || {};
  const u = data.user && typeof data.user === "object" ? data.user : data;
  const name = String(u.uniqueId || data.uniqueId || u.nickname || data.nickname || "").replace(/^@/, "").toLowerCase();
  const follow = Number(u.followRole != null ? u.followRole : data.followRole);
  const pick = (k) => (u[k] != null ? u[k] : data[k]);
  return {
    name,
    nickname: String(u.nickname || data.nickname || name).slice(0, 40),
    isFollower: Number.isFinite(follow) && follow >= 1,
    isSubscriber: Boolean(pick("isSubscriber")) || hasBadge(u, "subscri"),
    isModerator: Boolean(pick("isModerator")) || hasBadge(u, "moderator")
  };
}
const textOf = (d) => String((d && (d.comment || d.message || d.content || d.text)) || "").slice(0, 120);
const KEYCAPS = { "1️⃣": "1", "2️⃣": "2", "3️⃣": "3", "4️⃣": "4", "5️⃣": "5", "6️⃣": "6", "7️⃣": "7", "8️⃣": "8", "9️⃣": "9" };
const norm = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();

/** Which option (0-based index) a chat message votes for, or -1.  options = [{id, name}] */
export function parseVote(text, options, method) {
  let t = String(text || "").trim();
  if (!t || t.length > 60) return -1;
  for (const [k, v] of Object.entries(KEYCAPS)) t = t.split(k).join(v);
  const low = t.toLowerCase().replace(/^(?:i\s+)?(?:vote|choose|pick|go)\s*(?:for)?\s*/, "").replace(/^#/, "").replace(/[.!)\s]+$/g, "").trim();
  const byNumber = () => { const m = /^(\d{1,2})$/.exec(low); if (!m) return -1; const i = Number(m[1]) - 1; return i >= 0 && i < options.length ? i : -1; };
  const byLetter = () => { const m = /^([a-i])$/.exec(low); if (!m) return -1; const i = m[1].charCodeAt(0) - 97; return i < options.length ? i : -1; };
  const byName = () => {
    const n = norm(low);
    if (!n) return -1;
    const hits = [];
    options.forEach((o, i) => {
      const on = norm(o.name), oc = on.replace(/ /g, ""), id = norm(o.id);
      if (n === on || n === oc || n === id || (n.length >= 3 && (" " + n + " ").includes(" " + on + " ")) || (on.length >= 4 && n.length >= 4 && on.startsWith(n))) hits.push(i);
    });
    return hits.length === 1 ? hits[0] : -1;
  };
  if (method === "number") return byNumber();
  if (method === "letter") return byLetter();
  if (method === "name") return byName();
  let i = byNumber(); if (i >= 0) return i;
  i = byName(); if (i >= 0) return i;
  return byLetter();
}

class AutopilotEngine {
  constructor() {
    this.config = clone(DEFAULT_CONFIG);
    this.profiles = {};
    this.sse = new Set();
    this.log = [];
    this.hub = null;
    this.editKey = "";
    this.rt = this._fresh();
    this.memory = { gifters: new Map(), followers: new Set(), sharers: new Set(), lastChatAt: 0, chats: 0 };
    this._timer = null;
    this._saveTimer = null;
    this._lastBroadcast = 0;
    this._pendingBroadcast = null;
    this._disconnectedSince = 0;
    // where the saved setup came from / whether it really reaches the disk (shown in the panel: Setups -> "Where is my setup stored?")
    this.meta = { source: "defaults", sourceLabel: "factory defaults (nothing saved yet)", savedAt: 0, file: "", seedFile: "", writable: true, error: "" };
  }

  _fresh() {
    return {
      running: false, paused: false, pausedAt: 0, autoPaused: false, preview: false,
      phase: "idle", phaseStartedAt: 0, phaseEndsAt: 0,
      runStartedAt: 0, runEndsAt: 0, gamesPlayed: 0, seqIndex: 0,
      current: null,  // { id, startedAt, sessionEndsAt, minutes, roundsLimit, roundsDone, loadSeq, applySeq, via }
      next: null,     // { id, via }
      vote: null,     // { options:[{n,id,name,emoji,count}], startedAt, endsAt, revotes, extended, ballots, total, tiedFrom }
      result: null,   // { winnerId, via, counts, total, note }
      history: [],
      leaderboard: [],
      stage: { seenAt: 0, status: "", roundNumber: 0, game: "", applied: 0 },
      loadSeq: 0, applySeq: 0, wrapupStartedAt: 0, stopReason: ""
    };
  }

  // ------------------------------------------------------------------ setup
  init(app, express, opts = {}) {
    if (this._inited) return;
    this._inited = true;
    this.hub = opts.hub || null;
    this.file = opts.file || DATA_FILE;
    this.seedFile = opts.seedFile || SEED_FILE;
    this.meta.file = this.file; this.meta.seedFile = this.seedFile;
    this.editKey = String(process.env.HOME_EDIT_KEY || "");
    this._load();
    if (this.hub && typeof this.hub.subscribe === "function") this.hub.subscribe((ev, args) => this._onTikTok(ev, args));
    this._timer = setInterval(() => { try { this._tick(); } catch (e) { console.error("[autopilot] tick:", e); } }, TICK_MS);
    if (this._timer.unref) this._timer.unref();
    if (app) this._routes(app, express);
    console.log("[autopilot] AFK autopilot ready (panel /autopilot/ , stage /autopilot/stage)" + (this.rt.running ? " - RESUMING a running session" : ""));
  }

  _routes(app, express) {
    const json = express.json({ limit: "300kb" });
    const guard = (req, res, next) => {
      if (this.editKey && String(req.get("x-edit-key") || "") !== this.editKey) return res.status(401).json({ error: "edit-key-required" });
      next();
    };
    const act = (fn) => async (req, res) => {
      try { const out = await fn(req.body || {}, req); res.json({ ok: true, ...(out || {}), state: this.publicState() }); }
      catch (e) { res.status(400).json({ ok: false, error: String((e && e.message) || e), state: this.publicState() }); }
    };
    app.get("/api/autopilot", (req, res) => { res.set("Cache-Control", "no-store"); res.json(this.snapshot()); });
    app.get("/api/autopilot/stream", (req, res) => {
      res.set({ "Content-Type": "text/event-stream", "Cache-Control": "no-store, no-transform", Connection: "keep-alive", "X-Accel-Buffering": "no" });
      res.flushHeaders && res.flushHeaders();
      res.write("retry: 2000\n\n");
      this.sse.add(res);
      res.write("data: " + JSON.stringify(this.publicState()) + "\n\n");
      req.on("close", () => this.sse.delete(res));
    });
    app.put("/api/autopilot/config", guard, json, act((b) => { this.setConfig(b); }));
    app.post("/api/autopilot/save", guard, express.json({ limit: "1mb" }), act((b) => this.saveFromPanel(b)));
    app.get("/api/autopilot/export", (req, res) => {
      res.set({ "Content-Type": "application/json; charset=utf-8", "Content-Disposition": "attachment; filename=\"autopilot-setup.json\"", "Cache-Control": "no-store" });
      res.json(this.exportSetup());
    });
    app.post("/api/autopilot/import", guard, express.json({ limit: "2mb" }), act((b) => this.importSetup(b.data, b)));
    app.post("/api/autopilot/start", guard, json, act((b) => this.start(b)));
    app.post("/api/autopilot/stop", guard, json, act(() => this.stop("Stopped by the host")));
    app.post("/api/autopilot/pause", guard, json, act(() => this.pause(false)));
    app.post("/api/autopilot/resume", guard, json, act(() => this.resume()));
    app.post("/api/autopilot/skip", guard, json, act(() => this.skip()));
    app.post("/api/autopilot/vote-now", guard, json, act(() => this.voteNow()));
    app.post("/api/autopilot/extend", guard, json, act((b) => this.extend(b.minutes)));
    app.post("/api/autopilot/force", guard, json, act((b) => this.force(b.gameId)));
    app.post("/api/autopilot/restart-game", guard, json, act(() => this.restartGame()));
    app.post("/api/autopilot/preview-vote", guard, json, act(() => this.previewVote()));
    app.post("/api/autopilot/test-vote", guard, json, act((b) => this.testVotes(b)));
    app.post("/api/autopilot/reset-memory", guard, json, act(() => { this._resetMemory(); this._log("info", "Remembered followers / gifters / sharers of this live were cleared."); }));
    app.get("/api/autopilot/profiles", (req, res) => res.json({ profiles: Object.keys(this.profiles), current: this.config.name }));
    app.post("/api/autopilot/profiles", guard, json, act((b) => this.saveProfile(b.name)));
    app.post("/api/autopilot/profiles/load", guard, json, act((b) => this.loadProfile(b.name)));
    app.delete("/api/autopilot/profiles/:name", guard, act((b, req) => this.deleteProfile(req.params.name)));
    app.get("/api/autopilot/profiles/:name", (req, res) => { const p = this.profiles[req.params.name]; if (!p) return res.status(404).json({ error: "no such profile" }); res.json(p); });
    app.post("/api/autopilot/report", json, (req, res) => { this.report(req.body || {}); res.json({ ok: true, serverNow: now() }); });
  }

  // ------------------------------------------------------------------ persistence
  // Load order (update 112): the server's own saved file -> its backup copy -> the setup file shipped inside the deployed folder -> factory defaults.
  _readJson(file) { try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch (e) { return null; } }
  _adopt(raw, source, label, withRuntime) {
    if (!raw || typeof raw !== "object") return false;
    const cfg = raw.config && typeof raw.config === "object" ? raw.config : raw.run || raw.vote || raw.games ? raw : null; // a full file, or a bare config
    if (!cfg) return false;
    this.config = sanitizeConfig(cfg);
    if (raw.profiles && typeof raw.profiles === "object") for (const [k, v] of Object.entries(raw.profiles)) this.profiles[String(k).slice(0, 60)] = sanitizeConfig(v);
    this.meta.source = source; this.meta.sourceLabel = label;
    this.meta.savedAt = Number(raw.savedAt) || (() => { try { return fs.statSync(source === "saved" ? this.file : source === "backup" ? this.file + ".bak" : this.seedFile).mtimeMs; } catch (e) { return 0; } })();
    const r = withRuntime && raw.runtime;
    if (r && r.running && this.config.run.resumeAfterRestart) {
      this.rt = { ...this._fresh(), ...r, vote: null, stage: { seenAt: 0, status: "", roundNumber: 0, game: "", applied: 0 }, paused: false, pausedAt: 0, autoPaused: false };
      if (this.rt.phase === "voting" || this.rt.phase === "result" || this.rt.phase === "summary" || this.rt.phase === "wrapup") { this.rt.phase = "playing"; if (this.rt.current) this.rt.current.sessionEndsAt = Math.min(this.rt.current.sessionEndsAt, now() + 5000); }
      this.rt.loadSeq = (this.rt.loadSeq || 0) + 1; this.rt.applySeq = (this.rt.applySeq || 0) + 1;
      if (this.rt.current) { this.rt.current.loadSeq = this.rt.loadSeq; this.rt.current.applySeq = this.rt.applySeq; }
      this._log("warn", "The server restarted - the autopilot carried on by itself.");
    }
    return true;
  }
  _load() {
    if (this._adopt(this._readJson(this.file), "saved", "your saved setup on this server", true)) return;
    if (this._adopt(this._readJson(this.file + ".bak"), "backup", "the backup copy of your saved setup (the main file was missing or damaged)", true)) { this._log("warn", "The main setup file could not be read - the backup copy was used."); return; }
    if (this._adopt(this._readJson(this.seedFile), "shipped", "the setup file shipped with this deployment (data/autopilot-setup.json)", false)) { this._log("info", "No saved setup on this server yet - the setup file shipped with the deployment was loaded."); return; }
    /* first run: factory defaults */
  }
  _payload() {
    const r = this.rt;
    const runtime = { running: r.running, phase: r.phase, phaseStartedAt: r.phaseStartedAt, phaseEndsAt: r.phaseEndsAt, runStartedAt: r.runStartedAt, runEndsAt: r.runEndsAt, gamesPlayed: r.gamesPlayed, seqIndex: r.seqIndex, current: r.current, next: r.next, history: r.history.slice(-30), loadSeq: r.loadSeq, applySeq: r.applySeq };
    return { format: "afk-autopilot-setup", version: 2, savedAt: this.meta.savedAt || now(), config: this.config, profiles: this.profiles, runtime };
  }
  // write right now, safely: temp file -> keep the previous file as .bak -> rename. Returns true when it really reached the disk.
  _writeNow() {
    try {
      fs.mkdirSync(path.dirname(this.file), { recursive: true });
      const tmp = this.file + ".tmp";
      fs.writeFileSync(tmp, JSON.stringify(this._payload(), null, 1));
      try { if (fs.existsSync(this.file)) fs.copyFileSync(this.file, this.file + ".bak"); } catch (e) { /* no backup this time */ }
      fs.renameSync(tmp, this.file);
      this.meta.writable = true; this.meta.error = "";
      return true;
    } catch (e) {
      this.meta.writable = false; this.meta.error = String((e && e.message) || e).slice(0, 160);
      return false;
    }
  }
  // debounced: used for the running state (phase changes happen all the time)
  _save() {
    clearTimeout(this._saveTimer);
    this._saveTimer = setTimeout(() => { this._writeNow(); }, 800);
    if (this._saveTimer.unref) this._saveTimer.unref();
  }
  // immediate: used when the HOST saves settings - the panel must be able to say truthfully "saved to disk"
  _saveNow() {
    clearTimeout(this._saveTimer);
    const before = this.meta.savedAt;
    this.meta.savedAt = now(); // (the payload written to disk carries this time)
    const ok = this._writeNow();
    if (ok) { this.meta.source = "saved"; this.meta.sourceLabel = "your saved setup on this server"; }
    else this.meta.savedAt = before; // nothing reached the disk: do not claim a save time
    return ok;
  }
  _log(level, text) {
    this.log.push({ t: now(), level, text: String(text).slice(0, 240) });
    if (this.log.length > 120) this.log.splice(0, this.log.length - 120);
    this._broadcast();
  }

  // ------------------------------------------------------------------ settings & profiles
  setConfig(patch) {
    const merged = sanitizeConfig({ ...this.config, ...(patch || {}), games: { ...this.config.games, ...((patch && patch.games) || {}) } }, this.config);
    this.config = merged;
    // running right now? a changed session length etc. applies from the NEXT game; the current game keeps its own deadline
    const ok = this._saveNow();
    this._log(ok ? "info" : "warn", ok ? "Settings saved" + (this.rt.running ? " (they apply from the next game / vote)." : ".") : "Settings changed, but the server could NOT write them to disk (" + this.meta.error + ") - they are lost at the next restart.");
    return ok;
  }
  // the panel's Save / "Save & apply now" buttons. apply = also push the settings to the game that is on screen right now (fresh round).
  saveFromPanel(b = {}) {
    const ok = this.setConfig(b.config || {});
    let applied = false;
    if (b.apply && this.rt.running && this.rt.current && (this.rt.phase === "playing" || this.rt.phase === "wrapup")) {
      this.rt.applySeq += 1; this.rt.current.applySeq = this.rt.applySeq; // the stage page sees the new number and sends the (new) settings to the game
      applied = true;
      this._log("info", "Settings re-applied to the game on screen (a fresh round starts).");
      this._broadcast(true);
    }
    return { config: this.config, meta: { ...this.meta }, written: ok, applied };
  }
  exportSetup() {
    return { format: "afk-autopilot-setup", version: 2, exportedAt: now(), name: this.config.name, config: this.config, profiles: this.profiles };
  }
  // restores a setup file (the export above), a bare config, or a browser backup. Named setups in the file are added / replaced, others are kept.
  importSetup(data, b = {}) {
    let d = data;
    if (typeof d === "string") { try { d = JSON.parse(d); } catch (e) { throw new Error("That is not a valid setup file."); } }
    if (!d || typeof d !== "object") throw new Error("That is not a valid setup file.");
    const cfg = d.config && typeof d.config === "object" ? d.config : d.run || d.vote || d.games ? d : null;
    if (!cfg) throw new Error("That file does not contain an autopilot setup.");
    this.config = sanitizeConfig(cfg);
    let n = 0;
    if (d.profiles && typeof d.profiles === "object") for (const [k, v] of Object.entries(d.profiles)) { this.profiles[String(k).slice(0, 60)] = sanitizeConfig(v); n++; }
    const ok = this._saveNow();
    this._log("info", "Setup restored from a file" + (n ? " (" + n + " named setup" + (n === 1 ? "" : "s") + ")" : "") + (ok ? "." : ", but it could not be written to disk."));
    return { config: this.config, meta: { ...this.meta }, written: ok, profiles: Object.keys(this.profiles) };
  }
  saveProfile(name) {
    const n = String(name || "").trim().slice(0, 60);
    if (!n) throw new Error("Give the setup a name first.");
    this.profiles[n] = clone(this.config);
    this.profiles[n].name = n;
    this.config.name = n;
    this._saveNow();
    this._log("info", "Setup saved as “" + n + "”.");
  }
  loadProfile(name) {
    const p = this.profiles[name];
    if (!p) throw new Error("No setup with that name.");
    this.config = sanitizeConfig(p);
    this.config.name = name;
    this._saveNow();
    this._log("info", "Setup “" + name + "” loaded.");
  }
  deleteProfile(name) {
    if (!this.profiles[name]) throw new Error("No setup with that name.");
    delete this.profiles[name];
    this._saveNow();
  }
  _resetMemory() { this.memory.gifters.clear(); this.memory.followers.clear(); this.memory.sharers.clear(); }

  // ------------------------------------------------------------------ helpers
  _cfgFor(id) { return this.config.games[id] || DEFAULT_CONFIG.games[id]; }
  _pool(extraExclude = []) {
    const c = this.config;
    let list = enabledGames(c).map((g) => g.id);
    const cur = this.rt.current && this.rt.current.id;
    if (!c.rotation.allowReplay && cur) list = list.filter((id) => id !== cur);
    const recent = this.rt.history.slice(-c.rotation.avoidRepeatLast).map((h) => h.id).concat(cur ? [cur] : []);
    const fresh = list.filter((id) => !recent.includes(id) && !extraExclude.includes(id));
    return fresh.length >= 2 || (fresh.length >= 1 && list.length <= 1) ? fresh : list.filter((id) => !extraExclude.includes(id));
  }
  _weightedPick(ids) {
    const total = ids.reduce((s, id) => s + this._cfgFor(id).weight, 0);
    let r = Math.random() * total;
    for (const id of ids) { r -= this._cfgFor(id).weight; if (r <= 0) return id; }
    return ids[ids.length - 1];
  }
  _sequenceList() {
    const en = enabledGames(this.config).map((g) => g.id);
    const seq = this.config.rotation.sequence.filter((id) => en.includes(id));
    return seq.length ? seq : en;
  }
  _nextFromRotation() {
    const c = this.config, mode = c.rotation.mode;
    if (mode === "sequence") {
      const seq = this._sequenceList();
      if (!seq.length) return null;
      let i = this.rt.seqIndex;
      if (i >= seq.length) { if (!c.rotation.loop) return null; i = 0; }
      this.rt.seqIndex = i + 1;
      return seq[i];
    }
    const pool = this._pool();
    if (!pool.length) return null;
    return mode === "weighted" ? this._weightedPick(pool) : pool[rnd(pool.length)];
  }
  _setPhase(phase, seconds) {
    const t = now();
    this.rt.phase = phase;
    this.rt.phaseStartedAt = t;
    this.rt.phaseEndsAt = seconds ? t + seconds * 1000 : 0;
    this._save();
    this._broadcast(true);
  }
  _hubState() { try { return this.hub && this.hub.getState ? this.hub.getState() : null; } catch (e) { return null; } }

  // ------------------------------------------------------------------ run control
  start(b = {}) {
    if (this.rt.running) throw new Error("The autopilot is already running.");
    const c = this.config;
    if (!enabledGames(c).length) throw new Error("Turn on at least one game in Settings → Games.");
    if (c.run.firstGame === "fixed" && !(this._cfgFor(c.run.firstGameId) || {}).enabled) throw new Error("The first game (" + c.run.firstGameId + ") is switched off in Settings → Games.");
    const preview = false;
    this.rt = { ...this._fresh(), running: true, preview, runStartedAt: now() };
    if (c.run.stopRule === "hours") this.rt.runEndsAt = now() + c.run.stopAfterHours * 3600 * 1000;
    this.memory.lastChatAt = now();
    const delay = b && b.now ? 0 : c.run.startDelaySeconds;
    this._setPhase("starting", delay);
    this._log("good", "Autopilot STARTED - first game in " + delay + " s.");
  }
  stop(reason) {
    if (!this.rt.running && this.rt.phase === "idle") return;
    const keep = this.rt.current;
    const history = this.rt.history;
    this.rt = { ...this._fresh(), history, current: keep ? { ...keep, stopped: true } : null, loadSeq: this.rt.loadSeq, applySeq: this.rt.applySeq, stopReason: reason || "" };
    this._setPhase("idle", 0);
    this._log("warn", "Autopilot STOPPED" + (reason ? " - " + reason : "") + ". The last game stays on screen so you can carry on by hand.");
  }
  pause(auto) {
    const r = this.rt;
    if (!r.running || r.paused) return;
    r.paused = true; r.pausedAt = now(); r.autoPaused = Boolean(auto);
    this._log("warn", auto ? "Autopilot paused automatically (TikTok disconnected)." : "Autopilot PAUSED - timers are frozen.");
    this._broadcast(true);
  }
  resume() {
    const r = this.rt;
    if (!r.running || !r.paused) return;
    const gap = now() - r.pausedAt;
    r.paused = false; r.autoPaused = false;
    for (const k of ["phaseEndsAt", "runEndsAt"]) if (r[k]) r[k] += gap;
    if (r.current && r.current.sessionEndsAt) r.current.sessionEndsAt += gap;
    if (r.vote) r.vote.endsAt += gap;
    this._disconnectedSince = 0;
    this._log("good", "Autopilot RESUMED.");
    this._save();
    this._broadcast(true);
  }
  skip() {
    const r = this.rt;
    if (!r.running) throw new Error("The autopilot is not running.");
    if (r.phase === "playing" || r.phase === "wrapup") this._endSession("skipped by the host", true);
    else if (r.phase === "voting") this._finishVote(true);
    else if (r.phase === "summary" || r.phase === "break" || r.phase === "result") this._afterBreak();
    else if (r.phase === "starting") this._beginFirst();
  }
  voteNow() {
    const r = this.rt;
    if (!r.running) throw new Error("Start the autopilot first.");
    if (r.phase === "voting") return;
    if (r.phase === "playing" || r.phase === "wrapup") { this._recordHistory("vote started by the host"); r.gamesPlayed += 1; r.endReason = ""; }
    this._startVote({});
  }
  previewVote() {
    if (this.rt.running) throw new Error("Stop the autopilot first - the practice vote only runs while it is off.");
    this.rt = { ...this._fresh(), history: this.rt.history, loadSeq: this.rt.loadSeq, applySeq: this.rt.applySeq, preview: true, running: true };
    this._log("info", "Practice vote started - nothing will switch.");
    this._startVote({ preview: true });
  }
  extend(minutes) {
    const r = this.rt;
    const m = Math.min(120, Math.max(1, Number(minutes) || 5));
    if (!r.running || !r.current) throw new Error("There is no running game to extend.");
    if (r.phase === "wrapup") { r.phase = "playing"; r.phaseStartedAt = now(); }
    if (r.phase !== "playing") throw new Error("Only a running game can be extended.");
    r.current.sessionEndsAt += m * 60000;
    r.phaseEndsAt = r.current.sessionEndsAt;
    this._log("info", "Game extended by " + m + " min.");
    this._save(); this._broadcast(true);
  }
  force(gameId) {
    const g = gameById(gameId);
    if (!g) throw new Error("Unknown game.");
    if (!this.rt.running) throw new Error("Start the autopilot first (or just open the game).");
    if (this.rt.current && (this.rt.phase === "playing" || this.rt.phase === "wrapup")) this._recordHistory("replaced by the host");
    this.rt.vote = null;
    this._startSession(g.id, "chosen by the host");
  }
  restartGame() {
    const r = this.rt;
    if (!r.running || !r.current) throw new Error("There is no running game.");
    r.loadSeq += 1; r.applySeq += 1;
    r.current.loadSeq = r.loadSeq; r.current.applySeq = r.applySeq;
    r.current.roundsDone = 0;
    this._log("info", "Game restarted (page reloaded, settings re-applied).");
    this._broadcast(true);
  }

  // ------------------------------------------------------------------ the state machine
  _tick() {
    const r = this.rt, t = now();
    if (!r.running) { this._maybeHeartbeat(); return; }
    if (r.paused) { if (r.autoPaused) this._watchPlatform(t); this._maybeHeartbeat(); return; } // paused automatically: wake up when TikTok is back
    this._watchPlatform(t);
    if (!r.running || r.paused) return;
    if (r.runEndsAt && t >= r.runEndsAt && !r.preview) { this.stop("the time limit you set (" + this.config.run.stopAfterHours + " h) is over"); return; }
    const idle = this.config.run.idleStopMinutes;
    if (idle > 0 && !r.preview && t - Math.max(this.memory.lastChatAt, r.runStartedAt) > idle * 60000) { this.stop("nobody typed in chat for " + idle + " min"); return; }
    switch (r.phase) {
      case "starting": if (t >= r.phaseEndsAt) this._beginFirst(); break;
      case "playing": {
        const cur = r.current;
        if (!cur) break;
        const stageAlive = t - r.stage.seenAt < STAGE_STALE_MS;
        const roundRule = this.config.session.endRule !== "time" && stageAlive && cur.roundsLimit > 0 && cur.roundsDone >= cur.roundsLimit;
        const timeRule = this.config.session.endRule !== "rounds" ? t >= cur.sessionEndsAt : (!stageAlive && t >= cur.sessionEndsAt + 60000); // "rounds only" without a stage page: do not wait forever
        if (roundRule) this._endSession("round limit reached", false);
        else if (timeRule) this._endSession("time is up", false);
        break;
      }
      case "wrapup": {
        const midRound = r.stage.status === "live" && t - r.stage.seenAt < STAGE_STALE_MS;
        if (!midRound || t - r.wrapupStartedAt >= this.config.session.graceSeconds * 1000) this._afterSession();
        break;
      }
      case "summary": if (t >= r.phaseEndsAt) this._choose(); break;
      case "voting": {
        const v = r.vote;
        if (!v) { this._choose(); break; }
        const c = this.config.vote;
        if (c.extendSecondsIfClose > 0 && !v.extended && v.endsAt - t < 5000 && this._isClose(v)) { v.endsAt += c.extendSecondsIfClose * 1000; r.phaseEndsAt = v.endsAt; v.extended = true; this._log("info", "Close vote - " + c.extendSecondsIfClose + " s added."); this._broadcast(true); }
        if (t >= v.endsAt) this._finishVote(false);
        break;
      }
      case "result": if (t >= r.phaseEndsAt) this._afterResult(); break;
      case "break": if (t >= r.phaseEndsAt) this._afterBreak(); break;
      default: break;
    }
    this._maybeHeartbeat();
  }
  _maybeHeartbeat() {
    if (now() - this._lastBroadcast > 4000) this._broadcast(true);
  }
  _isClose(v) {
    const counts = v.options.map((o) => o.count).sort((a, b) => b - a);
    return counts.length > 1 && counts[0] > 0 && counts[0] - counts[1] <= 1;
  }

  _watchPlatform(t) {
    const c = this.config.run, r = this.rt, h = this._hubState();
    if (!h || h.mode !== "live" || r.preview) { this._disconnectedSince = 0; return; }
    const ok = h.status === "connected";
    if (ok) {
      if (r.autoPaused && r.paused) this.resume();
      this._disconnectedSince = 0;
      return;
    }
    if (!this._disconnectedSince) this._disconnectedSince = t;
    if (c.onDisconnect === "keep") return;
    if (t - this._disconnectedSince < c.disconnectGraceSeconds * 1000) return;
    if (c.onDisconnect === "stop") this.stop("TikTok stayed disconnected for " + c.disconnectGraceSeconds + " s");
    else if (!r.paused) this.pause(true);
  }

  _beginFirst() {
    const c = this.config, r = this.rt;
    if (r.preview) return;
    if (c.run.firstGame === "vote") { this._startVote({ first: true }); return; }
    let id = null;
    if (c.run.firstGame === "fixed") id = c.run.firstGameId;
    else if (c.run.firstGame === "sequence") id = this._nextFromRotation();
    else { const en = enabledGames(c).map((g) => g.id); id = en[rnd(en.length)]; }
    if (!id || !this._cfgFor(id).enabled) { const en = enabledGames(c); id = en.length ? en[0].id : null; }
    if (!id) { this.stop("no game is switched on"); return; }
    this._startSession(id, c.run.firstGame === "fixed" ? "first game (your choice)" : c.run.firstGame === "random" ? "first game (random)" : "first game (sequence)");
  }

  _startSession(id, via) {
    const c = this.config, g = gameById(id), gc = this._cfgFor(id), r = this.rt, t = now();
    if (!g) return;
    const minutes = gc.minutes > 0 ? gc.minutes : c.session.minutes;
    const roundsLimit = gc.rounds > 0 ? gc.rounds : c.session.rounds;
    r.loadSeq += 1; r.applySeq += 1;
    r.current = { id, startedAt: t, sessionEndsAt: t + minutes * 60000, minutes, roundsLimit, roundsDone: 0, loadSeq: r.loadSeq, applySeq: r.applySeq, via: via || "" };
    r.next = null; r.vote = null; r.result = null; r.leaderboard = [];
    r.stage.status = ""; r.stage.roundNumber = 0; r.stage.applied = 0;
    this._setPhase("playing", 0);
    r.phaseEndsAt = r.current.sessionEndsAt;
    this._log("good", "▶ " + g.name + " (" + minutes + " min" + (c.session.endRule !== "time" ? " / " + roundsLimit + " rounds" : "") + ") - " + (via || ""));
    this._broadcast(true);
  }

  _recordHistory(reason) {
    const r = this.rt, cur = r.current;
    if (!cur) return;
    r.history.push({ id: cur.id, startedAt: cur.startedAt, endedAt: now(), rounds: cur.roundsDone, reason: reason || "", top: (r.leaderboard || []).slice(0, 3) });
    if (r.history.length > 60) r.history.splice(0, r.history.length - 60);
  }

  _endSession(reason, immediate) {
    const r = this.rt, c = this.config;
    if (!r.current) { this._choose(); return; }
    r.endReason = reason;
    const midRound = r.stage.status === "live" && now() - r.stage.seenAt < STAGE_STALE_MS;
    if (!immediate && c.session.finishRound && midRound && reason === "time is up") {
      r.wrapupStartedAt = now();
      this._setPhase("wrapup", c.session.graceSeconds);
      this._log("info", "Time is up - letting the running round finish (max " + c.session.graceSeconds + " s).");
      return;
    }
    this._afterSession();
  }
  _afterSession() {
    const r = this.rt, c = this.config;
    this._recordHistory(r.endReason || "finished");
    r.gamesPlayed += 1;
    r.endReason = "";
    if (c.run.stopRule === "games" && r.gamesPlayed >= c.run.stopAfterGames && !r.preview) { this.stop("you asked it to stop after " + c.run.stopAfterGames + " games"); return; }
    if (c.session.showLeaderboardSeconds > 0 && r.leaderboard && r.leaderboard.length) { this._setPhase("summary", c.session.showLeaderboardSeconds); return; }
    this._choose();
  }

  _choose() {
    const c = this.config, r = this.rt;
    if (c.rotation.mode === "vote") { this._startVote({}); return; }
    const id = this._nextFromRotation();
    if (!id) { this.stop("the sequence is finished (loop is off)"); return; }
    r.next = { id, via: c.rotation.mode };
    this._setPhase("break", c.rotation.breakSeconds);
    this._log("info", "Next: " + gameById(id).name + " (" + c.rotation.mode + ")");
  }
  _afterBreak() {
    const r = this.rt;
    if (r.next) this._startSession(r.next.id, "next in " + this.config.rotation.mode);
    else this._choose();
  }

  // ---- voting
  _buildOptions(restrictTo) {
    const c = this.config, vc = c.vote;
    let ids;
    if (restrictTo) ids = restrictTo.slice();
    else {
      const en = enabledGames(c).map((g) => g.id);
      if (vc.optionPick === "fixed") ids = vc.fixedOptions.filter((id) => en.includes(id));
      else if (vc.optionPick === "all") ids = this._pool();
      else {
        const pool = this._pool();
        ids = vc.optionPick === "weighted" ? [] : shuffle(pool);
        if (vc.optionPick === "weighted") { const left = pool.slice(); while (left.length && ids.length < vc.options) { const id = this._weightedPick(left); ids.push(id); left.splice(left.indexOf(id), 1); } }
      }
      ids = ids.slice(0, vc.options);
      const cur = r0(this.rt.current);
      if (vc.includeReplayOption && cur && en.includes(cur) && !ids.includes(cur)) { if (ids.length >= vc.options) ids.pop(); ids.push(cur); }
    }
    ids = ids.slice(0, 9);
    return ids.map((id, i) => { const g = gameById(id); return { n: i + 1, id, name: g.name, emoji: g.emoji, count: 0 }; });
  }
  _startVote({ preview, first, restrictTo, revotes }) {
    const r = this.rt, vc = this.config.vote, t = now();
    let options = this._buildOptions(restrictTo);
    if (!options.length) {
      // nothing to vote about (only one game on): just replay / take the only game
      const en = enabledGames(this.config);
      if (!en.length) { this.stop("no game is switched on"); return; }
      if (preview) { this._log("warn", "Practice vote needs at least two games switched on."); this.stop(""); return; }
      r.next = { id: en[0].id, via: "only game" };
      this._setPhase("break", this.config.rotation.breakSeconds);
      return;
    }
    if (options.length === 1 && !preview) {
      r.next = { id: options[0].id, via: "only option" };
      this._setPhase("break", this.config.rotation.breakSeconds);
      return;
    }
    r.vote = { options, startedAt: t, endsAt: t + vc.seconds * 1000, revotes: revotes || 0, extended: false, ballots: new Map(), rate: new Map(), total: 0, voters: 0, first: Boolean(first), preview: Boolean(preview) };
    r.next = null; r.result = null;
    this._setPhase("voting", vc.seconds);
    r.phaseEndsAt = r.vote.endsAt;
    this._log("good", "🗳 Voting open: " + options.map((o) => o.n + "=" + o.name).join(", "));
  }
  _tally(v) {
    const counts = v.options.map(() => 0);
    for (const b of v.ballots.values()) counts[b.i] += b.w;
    v.options.forEach((o, i) => { o.count = counts[i]; });
    v.total = counts.reduce((a, b) => a + b, 0);
    v.voters = v.ballots.size;
    return counts;
  }
  _finishVote(forced) {
    const r = this.rt, v = r.vote, vc = this.config.vote;
    if (!v) { this._choose(); return; }
    const counts = this._tally(v);
    const top = Math.max(0, ...counts);
    const leaders = v.options.filter((o, i) => counts[i] === top);
    let winner = null, note = "";
    if (v.total < vc.minVotes || top === 0) {
      winner = this._noResultPick(v);
      note = v.total === 0 ? "Nobody voted - " + (vc.noResult === "default" ? "default game" : vc.noResult === "replay" ? "same game again" : vc.noResult === "sequence" ? "next in the list" : "random pick") : "Not enough votes - fallback";
    } else if (leaders.length > 1) {
      if (vc.tie === "revote" && v.revotes < 2 && !forced) { this._log("info", "Tie - a short second vote between " + leaders.map((o) => o.name).join(" / ")); this._startVote({ restrictTo: leaders.map((o) => o.id), revotes: v.revotes + 1, preview: v.preview, first: v.first }); return; }
      if (vc.tie === "first") winner = leaders[0];
      else if (vc.tie === "longest-waiting") {
        const last = (id) => { for (let i = r.history.length - 1; i >= 0; i--) if (r.history[i].id === id) return r.history[i].endedAt; return 0; };
        winner = leaders.slice().sort((a, b) => last(a.id) - last(b.id))[0];
      } else winner = leaders[rnd(leaders.length)];
      note = "Tie - " + (vc.tie === "first" ? "first listed wins" : vc.tie === "longest-waiting" ? "the game that waited longest wins" : "decided by chance");
    } else winner = leaders[0];
    r.result = { winnerId: winner.id, winnerName: winner.name, emoji: winner.emoji, counts: v.options.map((o) => ({ n: o.n, id: o.id, name: o.name, emoji: o.emoji, count: o.count })), total: v.total, voters: v.voters, note, preview: v.preview };
    r.next = { id: winner.id, via: v.total >= vc.minVotes ? "vote" : "fallback" };
    this._log("good", "🏆 Vote result: " + winner.name + " (" + v.total + " vote" + (v.total === 1 ? "" : "s") + ")" + (note ? " - " + note : ""));
    this._setPhase("result", vc.resultSeconds);
  }
  _noResultPick(v) {
    const vc = this.config.vote, r = this.rt;
    const byId = (id) => v.options.find((o) => o.id === id) || { ...(gameById(id) ? { id, name: gameById(id).name, emoji: gameById(id).emoji } : {}), n: 0, count: 0 };
    if (vc.noResult === "default" && this._cfgFor(vc.defaultGameId).enabled) return byId(vc.defaultGameId);
    if (vc.noResult === "replay" && r.current) return byId(r.current.id);
    if (vc.noResult === "sequence") { const id = this._nextFromRotation(); if (id) return byId(id); }
    return v.options[rnd(v.options.length)];
  }
  _afterResult() {
    const r = this.rt;
    if (r.vote && r.vote.preview) { this.stop(""); this._log("info", "Practice vote finished."); return; }
    if (r.next) this._startSession(r.next.id, r.result && r.result.note ? "vote - " + r.result.note : "chosen by the vote");
    else this._choose();
  }

  // ------------------------------------------------------------------ chat in
  _onTikTok(ev, args) {
    const d = (args && args[0]) || {};
    if (ev === "chat") {
      this.memory.lastChatAt = now();
      this.memory.chats += 1;
      const r = this.rt;
      if (r.running && !r.paused && r.phase === "voting" && r.vote) this._castFromChat(readViewer(d), textOf(d));
    } else if (ev === "gift") {
      const v = readViewer(d);
      if (!v.name) return;
      const done = d.giftType !== 1 || d.repeatEnd === true || d.repeatEnd === 1; // a gift streak counts once, at its end
      if (!done) return;
      const coins = Math.max(1, Number(d.diamondCount) || 1) * Math.max(1, Number(d.repeatCount) || 1);
      if (this.memory.gifters.size < MAX_MEMORY || this.memory.gifters.has(v.name)) this.memory.gifters.set(v.name, (this.memory.gifters.get(v.name) || 0) + coins);
    } else if (ev === "follow") {
      const v = readViewer(d); if (v.name && this.memory.followers.size < MAX_MEMORY) this.memory.followers.add(v.name);
    } else if (ev === "share") {
      const v = readViewer(d); if (v.name && this.memory.sharers.size < MAX_MEMORY) this.memory.sharers.add(v.name);
    }
  }

  /** May this viewer vote, and how many votes does theirs count for?  -> { ok, weight } */
  eligibility(viewer) {
    const e = this.config.eligibility, m = this.memory, name = viewer.name;
    if (!name) return { ok: false, weight: 0 };
    if (e.blockList.includes(name)) return { ok: false, weight: 0 };
    const isFollower = viewer.isFollower || m.followers.has(name);
    const isGifter = (m.gifters.get(name) || 0) >= e.giftMinCoins;
    const isSharer = m.sharers.has(name);
    const allowed = e.allowList.includes(name);
    const ok = e.everyone || allowed || (e.followers && isFollower) || (e.subscribers && viewer.isSubscriber) || (e.moderators && viewer.isModerator) || (e.gifters && isGifter) || (e.sharers && isSharer);
    if (!ok) return { ok: false, weight: 0 };
    let w = 1;
    if (viewer.isSubscriber) w = Math.max(w, e.weightSubscriber);
    if (isGifter) w = Math.max(w, e.weightGifter);
    if (viewer.isModerator) w = Math.max(w, e.weightModerator);
    if (isFollower) w = Math.max(w, e.weightFollower);
    return { ok: true, weight: w };
  }
  _castFromChat(viewer, text) {
    const v = this.rt.vote, vc = this.config.vote;
    if (!v || !viewer.name) return;
    const i = parseVote(text, v.options, vc.method);
    if (i < 0) return;
    const t = now();
    const hist = (v.rate.get(viewer.name) || []).filter((x) => t - x < 60000);
    if (hist.length >= vc.maxVotesPerMinutePerUser) return;
    hist.push(t); v.rate.set(viewer.name, hist);
    const el = this.eligibility(viewer);
    if (!el.ok) { v.rejected = (v.rejected || 0) + 1; return; }
    const had = v.ballots.get(viewer.name);
    if (had && !vc.changeVote) return;
    v.ballots.set(viewer.name, { i, w: el.weight, at: t });
    this._tally(v);
    this._broadcast(false);
  }
  /** Panel "Test": adds fake voters so the host can watch the vote screen work (works any time a vote is open). */
  testVotes(b = {}) {
    const v = this.rt.vote;
    if (!v) throw new Error("There is no open vote. Press “Practice vote” (or wait for a real one) and try again.");
    const n = Math.min(200, Math.max(1, Number(b.count) || 10));
    const opt = Number(b.option);
    for (let k = 0; k < n; k++) {
      const i = opt >= 1 && opt <= v.options.length ? opt - 1 : rnd(v.options.length);
      v.ballots.set("test_viewer_" + (v.ballots.size + k + 1 + rnd(1000000)), { i, w: 1, at: now() });
    }
    this._tally(v);
    this._broadcast(true);
    return { added: n };
  }

  // ------------------------------------------------------------------ the stage page reports
  report(b) {
    const r = this.rt, s = r.stage;
    s.seenAt = now();
    if (typeof b.status === "string") s.status = b.status.slice(0, 12);
    if (Number.isFinite(Number(b.roundNumber))) s.roundNumber = Math.min(1e6, Math.max(0, Number(b.roundNumber)));
    if (typeof b.game === "string") s.game = b.game.slice(0, 30);
    if (Number.isFinite(Number(b.applied))) s.applied = Number(b.applied);
    const cur = r.current;
    if (r.running && cur && b.game === cur.id && Number.isFinite(Number(b.roundsDone)) && Number(b.loadSeq) === cur.loadSeq) {
      cur.roundsDone = Math.min(1000, Math.max(cur.roundsDone, Number(b.roundsDone)));
    }
    if (Array.isArray(b.leaderboard) && cur && b.game === cur.id) {
      r.leaderboard = b.leaderboard.slice(0, 10).map((x) => ({ username: String((x && x.username) || "").slice(0, 40), score: Math.max(0, Number(x && x.score) || 0), avatarUrl: typeof (x && x.avatarUrl) === "string" && /^https?:|^\//.test(x.avatarUrl) ? x.avatarUrl.slice(0, 300) : null })).filter((x) => x.username);
    }
  }

  // ------------------------------------------------------------------ what the pages see
  _warnings() {
    const w = [], c = this.config, h = this._hubState(), r = this.rt;
    if (!h) w.push({ level: "warn", text: "The platform connection state is not available." });
    else if (h.mode !== "live") w.push({ level: "bad", text: "The platform is in " + String(h.mode).toUpperCase() + " mode. Chat votes only work in LIVE mode - switch on the HOME page." });
    else if (h.status !== "connected") w.push({ level: "bad", text: "Live mode is on but TikTok is not connected (" + h.status + "). Votes and guesses cannot arrive until it is." });
    const e = c.eligibility;
    if (!e.everyone && !(e.followers || e.subscribers || e.moderators || e.gifters || e.sharers) && !e.allowList.length) w.push({ level: "bad", text: "Nobody is allowed to vote: “Everyone” is off and no group is ticked." });
    if (r.running && !r.preview && now() - r.stage.seenAt > STAGE_STALE_MS) w.push({ level: "bad", text: "The STAGE page is not open (or not reporting). Open /autopilot/stage in your streaming software - the games are shown there." });
    if (enabledGames(c).length < 2 && c.rotation.mode === "vote") w.push({ level: "warn", text: "Only " + enabledGames(c).length + " game is switched on, so there is nothing to vote about." });
    if (r.paused) w.push({ level: "warn", text: r.autoPaused ? "Paused automatically because TikTok disconnected." : "Paused by the host." });
    return w;
  }
  publicState() {
    const r = this.rt, c = this.config, cur = r.current;
    const g = cur ? gameById(cur.id) : null;
    const nextG = r.next ? gameById(r.next.id) : null;
    let vote = null;
    if (r.vote) {
      const v = r.vote;
      this._tally(v);
      vote = { options: v.options.map((o) => ({ n: o.n, id: o.id, name: o.name, emoji: o.emoji, count: c.vote.showCounts ? o.count : null, ...this._notesFor(o.id) })), endsAt: v.endsAt, startedAt: v.startedAt, total: c.vote.showCounts ? v.total : null, voters: v.voters, revotes: v.revotes, preview: v.preview, first: v.first, rejected: v.rejected || 0 };
    }
    const h = this._hubState();
    const e = c.eligibility;
    const who = e.everyone ? "everyone" : [e.followers && "followers", e.subscribers && "subscribers", e.moderators && "moderators", e.gifters && "gifters", e.sharers && "sharers"].filter(Boolean).join(", ");
    const how = { number: "Type the NUMBER of the game in chat", letter: "Type the LETTER of the game in chat", name: "Type the NAME of the game in chat", any: "Type the number or the name of the game in chat" }[c.vote.method];
    return {
      serverNow: now(),
      running: r.running, paused: r.paused, autoPaused: r.autoPaused, preview: r.preview, phase: r.phase, phaseStartedAt: r.phaseStartedAt, phaseEndsAt: r.phaseEndsAt,
      runStartedAt: r.runStartedAt, runEndsAt: r.runEndsAt, gamesPlayed: r.gamesPlayed, stopReason: r.stopReason,
      current: cur && g ? { id: g.id, name: g.name, emoji: g.emoji, path: g.path, family: g.family, ...this._notesFor(g.id), startedAt: cur.startedAt, sessionEndsAt: cur.sessionEndsAt, minutes: cur.minutes, roundsLimit: cur.roundsLimit, roundsDone: cur.roundsDone, loadSeq: cur.loadSeq, applySeq: cur.applySeq, via: cur.via, stopped: Boolean(cur.stopped), preset: this._presetFor(cur.id) } : null,
      next: r.next && nextG ? { id: nextG.id, name: nextG.name, emoji: nextG.emoji, ...this._notesFor(nextG.id), via: r.next.via } : null,
      vote, result: r.result ? { ...r.result, ...this._notesFor(r.result.winnerId) } : null,
      leaderboard: r.leaderboard,
      history: r.history.slice(-12).map((h2) => ({ ...h2, name: (gameById(h2.id) || {}).name || h2.id, emoji: (gameById(h2.id) || {}).emoji || "" })),
      stage: { seenAt: r.stage.seenAt, alive: now() - r.stage.seenAt < STAGE_STALE_MS, status: r.stage.status, roundNumber: r.stage.roundNumber, applied: r.stage.applied },
      platform: h ? { mode: h.mode, status: h.status, username: h.username, viewers: h.viewers } : null,
      warnings: this._warnings(),
      voteInfo: { how, who, hint: c.display.voteHint || how + (who !== "everyone" ? " - " + who + " can vote" : ""), letters: c.vote.method === "letter" },
      display: c.display,
      session: { endRule: c.session.endRule, resetScores: true },
      memory: { gifters: this.memory.gifters.size, followers: this.memory.followers.size, sharers: this.memory.sharers.size, chats: this.memory.chats },
      log: this.log.slice(-40)
    };
  }
  // update 112: the host's notes for a game (other names, inspired by, vote note, how-to). Read live from the config, so a note edited during a vote shows at once.
  _notesFor(id) {
    const gc = this._cfgFor(id) || {}, g = gameById(id) || {};
    return { aka: Array.isArray(gc.aka) ? gc.aka : [], inspiredBy: gc.inspiredBy || "", note: gc.voteNote || "", howTo: gc.howTo || g.howTo || "" };
  }
  _presetFor(id) {
    const gc = this._cfgFor(id), g = gameById(id);
    if (!g || !g.family) return {};
    return { ...(gc.settings || {}), autoContinue: true };
  }
  snapshot() {
    return {
      config: this.config,
      state: this.publicState(),
      editKeyRequired: Boolean(this.editKey),
      meta: { ...this.meta },
      profiles: Object.keys(this.profiles),
      catalog: {
        games: GAMES.map((g) => ({ id: g.id, name: g.name, emoji: g.emoji, family: g.family, keys: PRESET_KEYS[g.id] || [], howTo: g.howTo })),
        fields: PRESET_FIELDS,
        regions: REGION_CHOICES,
        noteLimits: NOTE_LIMITS
      }
    };
  }

  _broadcast(force) {
    if (!this.sse.size) { this._lastBroadcast = now(); return; }
    const t = now();
    if (!force && t - this._lastBroadcast < 350) {
      if (!this._pendingBroadcast) this._pendingBroadcast = setTimeout(() => { this._pendingBroadcast = null; this._broadcast(true); }, 360);
      return;
    }
    this._lastBroadcast = t;
    const data = "data: " + JSON.stringify(this.publicState()) + "\n\n";
    for (const res of this.sse) { try { res.write(data); } catch (e) { this.sse.delete(res); } }
  }
}
function r0(cur) { return cur && cur.id; }

export const Autopilot = new AutopilotEngine();
export { AutopilotEngine };
