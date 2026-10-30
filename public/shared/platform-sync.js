/* ==========================================================================
   PLATFORM SYNC  (update 38)
   Loaded in the <head> of every game page. It makes each game follow the HOME page:

     * the platform MODE (Offline / Test / Live) chosen on HOME is applied to the game the moment it opens;
     * in Live mode, once HOME's ONE shared TikTok connection is up, the game is told to connect to it
       automatically - no typing the username, no pressing Connect inside each game. (The server hands the
       game a link to the shared connection; no second TikTok connection is opened.)

   It does this with the SAME messages the game's own buttons send (captured from the game's own socket),
   and only when the platform mode / connection changes - so a host can still override a game by hand
   and nothing here fights them. A small pill at the bottom-left shows the state for a few seconds
   (add ?nobadge to the page address to hide it).

   Nothing here touches TikTok directly; state comes from GET /api/platform (+ /api/platform/stream).
   ========================================================================== */
(function () {
  "use strict";
  if (window.__platformSync) return;
  window.__platformSync = true;

  /* ---------- update 115: FULL SCREEN inside the AFK autopilot stage ----------
     A game's own full-screen button (and the F11-like button on every game) used to put only THIS frame in full screen. The frame is replaced
     every time the autopilot switches game, and the browser leaves full screen whenever the page in it is replaced - so every new game
     came up small. Inside the stage frame (?autopilot=1) full screen now means "the whole STAGE page", which stays in full screen across game changes.
     The game keeps using its normal code: requestFullscreen / exitFullscreen / fullscreenElement / fullscreenchange are mapped to the stage. */
  (function embeddedFullscreen() {
    try {
      if (window.parent === window || !/[?&]autopilot=1\b/.test(location.search)) return;
      var P = window.parent, PD = P.document, PR = PD.documentElement;
      var pfs = function () { return PD.fullscreenElement || PD.webkitFullscreenElement || null; };
      var swallow = function (p) { return p && typeof p.catch === "function" ? p.catch(function () {}) : Promise.resolve(); };
      var enter = function () {
        var f = PR.requestFullscreen || PR.webkitRequestFullscreen;
        if (!f) { try { P.postMessage({ type: "ap-fullscreen", on: true }, location.origin); } catch (e) {} return Promise.resolve(); }
        try { return swallow(f.call(PR)); } catch (e) { return Promise.resolve(); }
      };
      var leave = function () {
        var f = PD.exitFullscreen || PD.webkitExitFullscreen;
        if (!f) return Promise.resolve();
        try { return swallow(f.call(PD)); } catch (e) { return Promise.resolve(); }
      };
      var EP = window.Element && Element.prototype, DP = window.Document && Document.prototype;
      if (EP) { EP.requestFullscreen = enter; EP.webkitRequestFullscreen = enter; EP.webkitRequestFullScreen = enter; }
      if (DP) {
        DP.exitFullscreen = leave; DP.webkitExitFullscreen = leave;
        var el = function () { return pfs() ? document.documentElement : null; };
        Object.defineProperty(DP, "fullscreenElement", { configurable: true, get: el });
        Object.defineProperty(DP, "webkitFullscreenElement", { configurable: true, get: el });
        Object.defineProperty(DP, "fullscreenEnabled", { configurable: true, get: function () { return true; } });
        Object.defineProperty(DP, "webkitFullscreenEnabled", { configurable: true, get: function () { return true; } });
      }
      var relay = function () {
        try { document.dispatchEvent(new Event("fullscreenchange")); document.dispatchEvent(new Event("webkitfullscreenchange")); } catch (e) {}
      };
      PD.addEventListener("fullscreenchange", relay);
      PD.addEventListener("webkitfullscreenchange", relay);
      window.addEventListener("unload", function () { try { PD.removeEventListener("fullscreenchange", relay); PD.removeEventListener("webkitfullscreenchange", relay); } catch (e) {} });
      setTimeout(relay, 0); // a new game opens already knowing that the stage is in full screen (the button shows the right icon)
      window.__apFullscreen = true;
    } catch (e) { /* cross-origin parent: the game keeps its own full-screen button */ }
  })();

  var GAME = (location.pathname.split("/")[1] || "").toLowerCase();
  var FAMILY = { blindle: 1, numberblindle: 1, oracle: 1, colorblindle: 1, colordle: 1, structle: 1, textle: 1, rangedle: 1, codedle: 1, shapedle: 1, forbackle: 1, shiftle: 1, wordle: 1, betweendle: 1, comparable: 1, minedle: 1, linedle: 1, citydle: 1, towndle: 1, expandle: 1, fixle: 1, contexto: 1 };
  var KNOWN = { flagle: 1, travle: 1, crossdle: 1, twistle: 1, findle: 1 };
  for (var k in FAMILY) KNOWN[k] = 1;
  if (!KNOWN[GAME]) return;

  var cap = { sock: null, ws: null, gs: null, testActive: null, born: Date.now(), ext: null, roundEnds: 0, roundStarts: 0 };

  /* ---------- update 115: finished-round counter, driven by the game's own state messages (no timers: it cannot miss a round) ----------
     Understands every game's state shape: status "live"/"won"/"lost" (word games), "playing"/"roundEnd" (Findle), round.status (Crossdle), active/winner (Contexto). */
  var rp = { seen: false, live: false, wasLive: false, armed: false, count: 0 };
  function probeRound(gs) {
    if (!gs || typeof gs !== "object") return null;
    var g = gs.game && typeof gs.game === "object" ? gs.game : null, st = "";
    if (gs.round && typeof gs.round === "object" && typeof gs.round.status === "string") st = gs.round.status;
    else if (g && typeof g.status === "string") st = g.status;
    else if (g && typeof g.active === "boolean") return { live: g.active, ended: !g.active && !!(g.winner || g.result) };
    else return null;
    st = st.toLowerCase();
    var live = st === "live" || st === "playing" || st === "active";
    var idle = !st || st === "idle" || st === "waiting" || st === "paused" || st === "loading" || st === "ready" || st === "lobby";
    return { live: live, ended: !live && !idle };
  }
  function trackRounds(gs) {
    var p = probeRound(gs);
    if (!p) return;
    rp.seen = true; rp.live = p.live;
    if (!rp.armed) { rp.wasLive = p.live; return; }
    if (p.live) rp.wasLive = true;
    else if (p.ended && rp.wasLive) { rp.count++; rp.wasLive = false; }
  }

  /* ---------- capture the game's own socket (Socket.IO or the Blindle WebSocket) ---------- */
  function onGameEvent(name, payload) {
    if (name === "state" || name === "state:full") { cap.gs = payload; trackRounds(payload); }
    else if (name === "testMode:status") cap.testActive = !!(payload && payload.active);
    else if (name === "diagnostics:update" && payload && payload.connection && cap.gs) cap.gs.tiktokStatus = payload.connection;
  }
  function hookSocket(s, ns) {
    if (cap.sock || !s || typeof s.on !== "function") return;
    if (String(ns || "").toLowerCase().indexOf(GAME) === -1) return;
    cap.sock = s;
    ["state", "state:full", "testMode:status", "diagnostics:update"].forEach(function (ev) {
      s.on(ev, function (p) { try { onGameEvent(ev, p); } catch (e) {} });
    });
    /* update 115: Flagle / Travle / Findle / ... do not publish a round counter in "state": the autopilot counts their finished rounds from
       their own events, and reads whether they are linked to the shared TikTok connection */
    if (typeof s.onAny === "function") {
      s.onAny(function (name, p) {
        try {
          name = String(name);
          if (/round[-:_ ]?(end|over|finish|complete|result)|^(puzzleComplete|puzzle[-:_]complete|game[-:_]?over|round[-:_]won|round[-:_]lost)$/i.test(name)) cap.roundEnds++;
          else if (/round[-:_ ]?start|new[-:_ ]?round|^puzzle[-:_]?start/i.test(name)) cap.roundStarts++;
          if (name === "session-started") cap.ext = { linked: !!(p && p.mode === "live"), at: Date.now() };
          else if (name === "tiktok-disconnected" || name === "tiktok-error") cap.ext = { linked: false, at: Date.now() };
          else if (name === "tiktok-status" && p && typeof p === "object" && ("connected" in p || "connecting" in p)) cap.ext = { linked: !!(p.connected || p.connecting), at: Date.now() };
        } catch (e) {}
      });
    }
  }
  (function wrapIo() {
    var real, wrapped;
    function wrap(f) {
      if (typeof f !== "function") return f;
      var w = function () {
        var s = f.apply(this, arguments);
        try { hookSocket(s, arguments[0]); } catch (e) {}
        return s;
      };
      Object.getOwnPropertyNames(f).forEach(function (p) {
        if (p === "length" || p === "name" || p === "prototype") return;
        try { w[p] = f[p]; } catch (e) {}
      });
      w.prototype = f.prototype;
      return w;
    }
    try {
      if ("io" in window && typeof window.io === "function") { real = window.io; wrapped = wrap(real); }
      Object.defineProperty(window, "io", {
        configurable: true,
        get: function () { return wrapped || real; },
        set: function (v) { real = v; wrapped = wrap(v); }
      });
    } catch (e) { /* the game still works; it just will not be driven automatically */ }
  })();
  (function wrapWebSocket() {
    var Native = window.WebSocket;
    if (!Native) return;
    try {
      var W = class extends Native {
        constructor(url, protocols) {
          if (protocols === undefined) super(url); else super(url, protocols);
          try {
            if (/blindle-ws/.test(String(url))) {
              cap.ws = this;
              this.addEventListener("message", function (e) {
                try { var m = JSON.parse(e.data); if (m && m.type === "state") { cap.gs = m.payload; trackRounds(m.payload); } } catch (x) {}
              });
            }
          } catch (x) {}
        }
      };
      window.WebSocket = W;
    } catch (e) { /* leave the native WebSocket alone */ }
  })();

  /* ---------- helpers ---------- */
  function $(id) { return document.getElementById(id); }
  function sockReady() { return !!(cap.sock && cap.sock.connected); }
  function emit(ev, data) { try { cap.sock.emit(ev, data); } catch (e) {} }
  function same(a, b) { return String(a || "").replace(/^@/, "").toLowerCase() === String(b || "").replace(/^@/, "").toLowerCase(); }
  function gotState(wait) { return cap.gs != null || Date.now() - cap.born > (wait || 2500); }

  /* ---------- one small adapter per game: what to send for Offline / Test / Live ---------- */
  function famSend(type, payload) {
    if (cap.ws && cap.ws.readyState === 1) cap.ws.send(JSON.stringify({ type: type, payload: payload }));
    else if (sockReady()) emit("action", { type: type, payload: payload });
  }
  var familyAdapter = {
    ready: function () { return ((cap.ws && cap.ws.readyState === 1) || sockReady()) && gotState(); },
    linked: function (mode, user) { // update 115: does this game follow the platform mode / the shared TikTok connection right now?
      var gs = cap.gs || {}, gm = gs.game && gs.game.mode, d = gs.diagnostics || {}, cs = d.connectionStatus;
      if (mode === "live") return gm === "live" && (cs === "live" || cs === "connecting" || cs === "retrying") && (!d.tiktokUsername || same(d.tiktokUsername, user));
      return gm === mode;
    },
    apply: function (mode, user) {
      var gs = cap.gs || {}, gm = gs.game && gs.game.mode, d = gs.diagnostics || {}, cs = d.connectionStatus;
      if (mode === "live") {
        if (gm !== "live") famSend("apply_settings", { mode: "live" });
        var linked = gm === "live" && (cs === "live" || cs === "connecting" || cs === "retrying") && (!d.tiktokUsername || same(d.tiktokUsername, user));
        if (!linked) famSend("connect_tiktok", { username: user });
      } else if (gm !== mode) {
        famSend("apply_settings", { mode: mode });
      }
    }
  };
  var ADAPTERS = {
    flagle: { // each browser tab has its own session on the server, so it is always (re)started
      ready: sockReady,
      linked: function (mode) { return mode === "live" ? !!(cap.ext && cap.ext.linked) : true; },
      apply: function (mode, user) {
        if (mode === "live") emit("connect-tiktok", { username: user });
        else emit("start-local-mode", { mode: mode });
      }
    },
    travle: { // Travle keeps its mode in the page, so drive the same controls the host would press
      ready: function () { return sockReady() && $("modeSelect") && $("tiktokConnectBtn") && $("applySettingsBtn"); },
      linked: function (mode) { return mode === "live" ? !!(cap.ext && cap.ext.linked) : true; },
      apply: function (mode, user) {
        var ms = $("modeSelect"), u = $("tiktokUsername");
        if (mode === "live") {
          ms.value = "live";
          if (u) u.value = user;
          $("tiktokConnectBtn").click();
        } else {
          ms.value = mode;
          $("applySettingsBtn").click();
        }
      }
    },
    crossdle: {
      ready: function () { return sockReady() && gotState(); },
      linked: function (mode, user) { var ts = (cap.gs && cap.gs.tiktokStatus) || {}; return mode === "live" ? (ts.state === "connected" && same(ts.username, user)) : true; },
      apply: function (mode, user) {
        var gs = cap.gs || {}, ts = gs.tiktokStatus || {};
        var test = cap.testActive != null ? cap.testActive : !!gs.testModeActive;
        if (mode === "live") {
          if (!(ts.state === "connected" && same(ts.username, user))) emit("tiktok:connect", { username: user });
        } else {
          if (ts.state === "connected" || ts.state === "connecting") emit("tiktok:disconnect");
          if (mode === "test" && !test) emit("testMode:start");
          if (mode === "offline" && test) emit("testMode:stop");
        }
      }
    },
    twistle: {
      ready: function () { return sockReady() && gotState(); },
      linked: function (mode) { var gm = cap.gs && cap.gs.game && cap.gs.game.mode; return mode === "live" ? gm === "live" : gm === mode; },
      apply: function (mode, user) {
        var gs = cap.gs || {}, gm = gs.game && gs.game.mode;
        if (mode === "live") {
          if (gm !== "live") emit("host:applySettings", { mode: "live" });
          emit("host:connectTikTok", { username: user });
        } else if (gm !== mode) {
          emit("host:applySettings", { mode: mode });
        }
      }
    },
    findle: { // Findle has no Offline mode: Offline = stopped (idle)
      ready: function () { return sockReady() && gotState(); },
      linked: function (mode, user) { var c = (cap.gs && cap.gs.connection) || {}; return mode === "live" ? (c.mode === "live" || c.mode === "connecting") && same(c.tiktokUsername, user) : true; },
      apply: function (mode, user) {
        var c = (cap.gs && cap.gs.connection) || {};
        if (mode === "live") {
          if (!(c.mode === "live" && same(c.tiktokUsername, user))) emit("host:connectTikTok", { username: user });
        } else if (mode === "test") {
          if (c.mode !== "test") emit("host:toggleTestMode");
        } else {
          if (c.mode === "test") emit("host:toggleTestMode");
          else if (c.mode === "live" || c.mode === "connecting") emit("host:disconnectTikTok");
        }
      }
    }
  };
  var adapter = FAMILY[GAME] ? familyAdapter : ADAPTERS[GAME];

  /* ---------- the HOME hub state ---------- */
  var hub = null, appliedKey = null, badgeEl = null, badgeTimer = null, lastBadge = "";

  function applyIfNeeded() {
    if (!hub || !adapter) return;
    var want = hub.mode;
    if (want === "live" && hub.status !== "connected") return; // wait until the shared connection exists
    var key = want + (want === "live" ? "|" + (hub.details && hub.details.connectedAt || 0) + "|" + hub.username : "");
    if (key === appliedKey) return;
    var ok = false;
    try { ok = adapter.ready(); } catch (e) { ok = false; }
    if (!ok) return;
    try { adapter.apply(want, hub.username); } catch (e) { return; }
    appliedKey = key;
  }

  function prefill() {
    if (!hub || !hub.username) return;
    ["tiktokUsername", "tiktokUsernameBottom", "tiktok-username", "tiktokUsernameInput", "usernameInput"].forEach(function (id) {
      var el = $(id);
      if (el && !el.value) { try { el.value = hub.username; } catch (e) {} }
    });
  }

  /* ---------- tiny status pill ---------- */
  function badgeText() {
    if (!hub) return "";
    if (hub.mode === "offline") return ["📴 Offline mode · set on HOME", "off"];
    if (hub.mode === "test") return ["🧪 Test mode · set on HOME", "off"];
    if (hub.status === "connected") return ["🟢 LIVE @" + hub.username + " · shared connection", hub.health === "warn" ? "warn" : "ok"];
    if (hub.status === "connecting") return ["🟡 Connecting @" + hub.username + "…", "warn"];
    if (hub.status === "reconnecting") return ["🟠 Reconnecting @" + hub.username + "…", "warn"];
    return ["🔴 Live mode, not connected · open HOME", "bad"];
  }
  function showBadge() {
    try {
      if (/[?&]nobadge\b/.test(location.search)) return;
      try { if (localStorage.getItem("platformBadge") === "off") return; } catch (e) {}
      var t = badgeText();
      if (!t) return;
      var sig = t[0];
      if (!badgeEl) {
        badgeEl = document.createElement("a");
        badgeEl.href = "/";
        badgeEl.setAttribute("aria-label", "Platform connection - open HOME");
        badgeEl.style.cssText = "position:fixed;left:8px;bottom:8px;z-index:2147483000;font:600 12px/1.2 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;" +
          "padding:6px 11px;border-radius:999px;color:#fff;text-decoration:none;box-shadow:0 2px 8px rgba(0,0,0,.35);opacity:0;transition:opacity .4s;max-width:80vw;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;";
        (document.body || document.documentElement).appendChild(badgeEl);
      }
      badgeEl.textContent = sig;
      badgeEl.style.background = t[1] === "ok" ? "#2e8b4f" : t[1] === "warn" ? "#b8860b" : t[1] === "bad" ? "#b3382c" : "#5a5a66";
      if (sig === lastBadge) return;
      lastBadge = sig;
      badgeEl.style.opacity = "0.95";
      clearTimeout(badgeTimer);
      badgeTimer = setTimeout(function () { if (badgeEl) badgeEl.style.opacity = "0"; }, t[1] === "bad" ? 14000 : 6000);
    } catch (e) {}
  }

  function onHub(st) {
    if (!st || typeof st !== "object") return;
    hub = st;
    prefill();
    applyIfNeeded();
    showBadge();
    try { window.PlatformSync.state = st; } catch (e) {}
  }

  /* ---------- listen to the hub: Server-Sent Events, with polling as a safety net ---------- */
  var lastPush = 0;
  function poll() {
    if (Date.now() - lastPush < 9000) return;
    fetch("/api/platform", { cache: "no-store" }).then(function (r) { return r.ok ? r.json() : null; }).then(function (s) { if (s) onHub(s); }).catch(function () {});
  }
  function startFeed() {
    try {
      var es = new EventSource("/api/platform/stream");
      es.onmessage = function (e) { lastPush = Date.now(); try { onHub(JSON.parse(e.data)); } catch (x) {} };
    } catch (e) { /* polling below covers it */ }
    poll();
    setInterval(poll, 4000);
    setInterval(applyIfNeeded, 1000); // the game's own socket may open after the hub answered
  }
  /* update 109: the AFK autopilot stage page (it shows this game in a frame) drives the game through the SAME socket the host buttons use */
  window.PlatformSync = {
    state: null, game: GAME, family: !!FAMILY[GAME],
    ready: function () { try { return !!adapter && !!adapter.ready(); } catch (e) { return false; } },
    gameState: function () { return cap.gs; },
    act: function (type, payload) { if (!FAMILY[GAME]) return false; famSend(type, payload); return true; },
    /* update 115 - used by the autopilot stage */
    hubState: function () { return hub; },
    // true = follows the platform (Live: linked to the shared TikTok connection), false = does not yet, null = cannot tell / nothing to link to
    linked: function () {
      try {
        if (!hub || !adapter || !adapter.linked) return null;
        if (hub.mode === "live" && hub.status !== "connected") return null;
        if (!adapter.ready()) return false;
        return !!adapter.linked(hub.mode, hub.username);
      } catch (e) { return null; }
    },
    // link / switch the game to the platform mode again, right now (same messages the game's own buttons send)
    relink: function () {
      try {
        if (!hub || !adapter) return false;
        if (hub.mode === "live" && hub.status !== "connected") return false;
        if (!adapter.ready()) return false;
        adapter.apply(hub.mode, hub.username);
        appliedKey = hub.mode + (hub.mode === "live" ? "|" + (hub.details && hub.details.connectedAt || 0) + "|" + hub.username : "");
        return true;
      } catch (e) { return false; }
    },
    // finished-round counting for the autopilot: armRounds() starts counting from zero (call it right after the settings were applied)
    armRounds: function () { rp.armed = true; rp.count = 0; rp.wasLive = rp.live; rp.evBase = cap.roundEnds; },
    // rounds that finished since armRounds(); canCount tells whether this game can be counted at all
    rounds: function () { return rp.seen ? rp.count : Math.max(0, cap.roundEnds - (rp.evBase || 0)); },
    canCount: function () { return rp.seen || cap.roundEnds > 0 || cap.roundStarts > 0; }
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", startFeed); else startFeed();
})();
