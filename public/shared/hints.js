/* ==========================================================================
   CRAFT HINTS  (update 58) - shared client for the 3-type hint system.
   Every game server sends   game.hints (hints given this round), game.hintConfig (host settings + catalog), game.hintNote
   and accepts               {type}  to give a hint,   a config patch to change the host's hint settings.

   CraftHints.attach({ button, chips, explainer, send(type), sendConfig(patch), openSettings() })
        - the 💡 button now opens a small menu of the game's three hint types
   CraftHints.render(game)          - call on every state update (draws chips, menu, countdown, settings form)
   CraftHints.mountSettings(el)     - fills el with the "Hints" settings section (also done automatically for [data-hint-settings])
   ========================================================================== */
(function () {
  "use strict";
  var S = { opts: null, game: null, cfg: null, menu: null, open: false, cdAt: 0, timer: null, form: null };

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]; }); }
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }

  function cooldownLeft() {
    if (!S.cfg || !S.cfg.cooldownLeft) return 0;
    return Math.max(0, S.cfg.cooldownLeft - Math.floor((Date.now() - S.cdAt) / 1000));
  }

  /* ---------------- menu ---------------- */
  function buildMenu() {
    if (S.menu) return;
    var m = el("div", "hintMenu"); m.hidden = true; m.setAttribute("role", "menu");
    document.body.appendChild(m); S.menu = m;
    document.addEventListener("click", function (e) {
      if (!S.open) return;
      if (m.contains(e.target) || (S.opts && S.opts.button && S.opts.button.contains(e.target))) return;
      close();
    });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") close(); });
    window.addEventListener("resize", position);
  }
  function position() {
    if (!S.open || !S.menu || !S.opts || !S.opts.button) return;
    var r = S.opts.button.getBoundingClientRect(), w = Math.min(330, window.innerWidth - 16);
    S.menu.style.width = w + "px";
    var left = Math.min(Math.max(8, r.right - w), window.innerWidth - w - 8);
    S.menu.style.left = left + "px";
    S.menu.style.top = Math.min(r.bottom + 8, window.innerHeight - 120) + "px";
  }
  function close() { S.open = false; if (S.menu) S.menu.hidden = true; }
  function toggle() {
    buildMenu();
    S.open = !S.open; S.menu.hidden = !S.open;
    if (S.open) { drawMenu(); position(); }
  }

  function drawMenu() {
    if (!S.menu) return;
    var cfg = S.cfg, g = S.game;
    if (!cfg) { S.menu.innerHTML = '<div class="hintMenuEmpty">Hints are loading…</div>'; return; }
    var live = !g || !g.status || g.status === "live" || g.status === "playing";
    var cd = cooldownLeft();
    var limitHit = cfg.remaining !== null && cfg.remaining <= 0;
    var html = '<div class="hintMenuHead"><b>Give a hint</b><span>' + (cfg.remaining === null ? "unlimited" : cfg.remaining + " left this round") + "</span></div>";
    if (!cfg.enabled) html += '<div class="hintMenuNote">Hints are switched off. Turn them on in Settings → Hints.</div>';
    cfg.catalog.forEach(function (t) {
      var off = !cfg.enabled || !t.enabled || limitHit || cd > 0 || !live;
      var why = !cfg.enabled ? "off" : !t.enabled ? "off in Settings" : limitHit ? "limit reached" : cd > 0 ? "wait " + cd + "s" : !live ? "round not live" : "";
      html += '<button type="button" class="hintOpt" data-type="' + esc(t.id) + '"' + (off ? " disabled" : "") + ">" +
        '<span class="hintOptIcon">' + esc(t.icon) + "</span>" +
        '<span class="hintOptText"><b>' + esc(t.label) + "</b><small>" + esc(t.desc) + "</small></span>" +
        (why ? '<span class="hintOptTag">' + esc(why) + "</span>" : "") + "</button>";
    });
    var note = g && g.hintNote && g.hintNote.text && Date.now() - g.hintNote.at < 8000 ? g.hintNote.text : "";
    if (note) html += '<div class="hintMenuNote warn">' + esc(note) + "</div>";
    html += '<div class="hintMenuFoot"><button type="button" class="hintMenuLink" data-act="settings">⚙ Hint settings</button></div>';
    S.menu.innerHTML = html;
    Array.prototype.forEach.call(S.menu.querySelectorAll(".hintOpt"), function (b) {
      b.addEventListener("click", function () { if (S.opts && S.opts.send) S.opts.send(b.getAttribute("data-type")); close(); });
    });
    var sb = S.menu.querySelector('[data-act="settings"]');
    if (sb) sb.addEventListener("click", function () {
      close();
      if (S.opts && S.opts.openSettings) return S.opts.openSettings();
      if (window.CraftSettings && CraftSettings.state && CraftSettings.state.built && !CraftSettings.state.open) CraftSettings.open();
      else if (!(window.CraftSettings && CraftSettings.state && CraftSettings.state.built)) {
        var btn = document.getElementById("settingsBtn") || document.getElementById("settings-btn") || document.getElementById("hostFab");
        if (btn) btn.click();
      }
      setTimeout(function () { if (window.CraftSettings && window.CraftSettings.goTo) window.CraftSettings.goTo("hints"); }, 60);
    });
  }

  /* ---------------- chips on the board ---------------- */
  function drawChips() {
    var o = S.opts, g = S.game; if (!o || !g) return;
    var list = g.hints || [];
    if (o.chips) {
      if (!list.length) { o.chips.innerHTML = ""; }
      else {
        o.chips.innerHTML = list.map(function (h) {
          var icon = h.icon || (h.type === "suggest" ? "💡" : h.type === "letter" ? "🔤" : h.type === "rule" ? "🚫" : "💡");
          return '<span class="hintChip hintChip-' + esc(h.type) + (h.auto ? " auto" : "") + '">' + icon + " " + esc(h.text || "") + (h.auto ? " <i>auto</i>" : "") + "</span>";
        }).join("");
      }
    }
    if (o.explainer) {
      o.explainer.hidden = !list.length;
      if (list.length) o.explainer.textContent = "💡 " + list.length + " hint" + (list.length === 1 ? "" : "s") + " used this round" + (S.cfg && S.cfg.limitPerRound ? " of " + S.cfg.limitPerRound : "") + ".";
    }
    if (o.button) {
      var off = !S.cfg || !S.cfg.enabled;
      o.button.classList.toggle("hintOff", off);
      o.button.title = off ? "Hints are switched off in Settings" : "Give a hint (choose a type)";
      if (S.cfg && S.cfg.remaining !== null && !off) o.button.setAttribute("data-left", String(S.cfg.remaining)); else o.button.removeAttribute("data-left");
    }
  }

  /* ---------------- settings form ---------------- */
  function mountSettings(host, opts) {
    if (!host || host.getAttribute("data-hint-mounted")) return;
    host.setAttribute("data-hint-mounted", "1");
    var send = function (patch) { var f = (opts && opts.sendConfig) || (S.opts && S.opts.sendConfig); if (f) f(patch); };
    host.innerHTML =
      "<h4>Hints</h4>" +
      '<p class="sectionNote">These hint types are available in this game. Choose which ones the host can give, how many a round may use and how fast.</p>' +
      '<label class="switchRow"><input type="checkbox" data-h="enabled" /><span class="switchTrack"><span class="switchThumb"></span></span><span class="switchLabel">Hints are available</span></label>' +
      '<div class="hintTypes" data-h="types"></div>' +
      '<div class="hintNums">' +
      '<label class="hintNum"><span>Hints allowed per round<small>0 = unlimited</small></span><input type="number" class="textInput" data-h="limitPerRound" min="0" max="50" /></label>' +
      '<label class="hintNum"><span>Wait between hints (seconds)<small>0 = no wait</small></span><input type="number" class="textInput" data-h="cooldownSeconds" min="0" max="600" /></label>' +
      '<label class="hintNum" data-h="autoRow"><span>Automatic hint after every N guesses<small>0 = never, the host gives hints by hand</small></span><input type="number" class="textInput" data-h="autoAfterGuesses" min="0" max="50" /></label>' +
      "</div>" +
      '<p class="miniStatus" data-h="saved"></p>';
    S.form = { host: host, send: send };
    var q = function (k) { return host.querySelector('[data-h="' + k + '"]'); };
    q("enabled").addEventListener("change", function () { send({ enabled: this.checked }); flash(); });
    ["limitPerRound", "cooldownSeconds", "autoAfterGuesses"].forEach(function (k) {
      var inp = q(k); inp.addEventListener("change", function () { var p = {}; p[k] = Number(this.value) || 0; send(p); flash(); });
    });
    fillForm();
  }
  function flash() {
    if (!S.form) return; var s = S.form.host.querySelector('[data-h="saved"]'); if (!s) return;
    s.textContent = "Saved ✓"; clearTimeout(flash.t); flash.t = setTimeout(function () { s.textContent = ""; }, 1800);
  }
  function fillForm() {
    if (!S.form || !S.cfg) return;
    var host = S.form.host, cfg = S.cfg, q = function (k) { return host.querySelector('[data-h="' + k + '"]'); };
    q("enabled").checked = !!cfg.enabled;
    var tw = q("types");
    var sig = cfg.catalog.map(function (t) { return t.id + t.enabled; }).join("|");
    if (tw.getAttribute("data-sig") !== sig || !tw.children.length) {
      tw.setAttribute("data-sig", sig);
      tw.innerHTML = cfg.catalog.map(function (t) {
        return '<label class="hintTypeRow"><input type="checkbox" data-type="' + esc(t.id) + '"' + (t.enabled ? " checked" : "") + " />" +
          '<span class="switchTrack"><span class="switchThumb"></span></span>' +
          '<span class="hintTypeText"><b>' + esc(t.icon) + " " + esc(t.label) + "</b><small>" + esc(t.desc) + "</small></span></label>";
      }).join("");
      Array.prototype.forEach.call(tw.querySelectorAll("input"), function (inp) {
        inp.addEventListener("change", function () { var p = { types: {} }; p.types[inp.getAttribute("data-type")] = inp.checked; S.form.send(p); flash(); });
      });
    }
    [["limitPerRound"], ["cooldownSeconds"], ["autoAfterGuesses"]].forEach(function (a) {
      var inp = q(a[0]); if (inp && document.activeElement !== inp) inp.value = cfg[a[0]];
    });
    var ar = q("autoRow"); if (ar) ar.hidden = !cfg.supportsAuto;
    host.classList.toggle("hintsOffForm", !cfg.enabled);
  }

  /* ---------------- public API ---------------- */
  function attach(opts) {
    S.opts = opts || {};
    buildMenu();
    if (S.opts.button) {
      S.opts.button.addEventListener("click", function (e) { e.stopPropagation(); toggle(); });
    }
    if (!S.timer) S.timer = setInterval(function () { if (S.open) drawMenu(); }, 1000);
    var hosts = document.querySelectorAll("[data-hint-settings]");
    Array.prototype.forEach.call(hosts, function (h) { mountSettings(h, S.opts); });
  }
  function render(game) {
    if (!game) return;
    S.game = game;
    if (game.hintConfig) { S.cfg = game.hintConfig; S.cdAt = Date.now(); }
    drawChips(); fillForm();
    if (S.open) drawMenu();
  }
  window.CraftHints = { attach: attach, render: render, mountSettings: mountSettings, state: S };
})();
