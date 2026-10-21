/* ==========================================================================
   WORD LENGTH PANEL  (update 90) - shared by EVERY word game on the platform.

   The panel that tells the audience how long the secret word is ("WORD LENGTH - 6 letters", or
   "WORD LENGTH - Random: 4 - 12" when the host plays random lengths). It started in BETWEENDLE
   (update 85-88); this is the same panel, now available in every word game.

   What the host can do (Settings -> Word length panel):
     - show / hide it at any time: a switch in Settings and a quick button (🔡) in the top bar
     - change the texts (use {length} {min} {max} {range} {language}; "|" starts a new part), an icon,
       and what a random length shows (the range, or this round's exact length)
     - rows 1-8, text size 40-300%, number size, title size, font, weight, letter spacing,
       row gap, divider style, alignment, width, position (above / below the legend, above the
       keyboard or board, below the board)
     - the box: background, border (color, width, style), corners, padding, margins, shadow,
       transparency; five colors; a pop animation; eight ready-made looks
     - "Apply this look to every game" copies the look to all word games
   Every change is applied instantly, cached in this browser (no flash on reload) and shared by every
   screen connected to the same game (Socket.IO namespace /lenpanel, server/shared/length-panel-hub.js).

   Add to a game page (after legend.js, before settings-shell.js):
       <link rel="stylesheet" href="/shared/length-panel.css" />
       <script src="/shared/length-panel-schema.js"></script>
       <script src="/shared/length-panel.js" data-game="wordle"></script>
   and have the game call  LengthPanel.update(gameState)  every time its state arrives.
   data-no-exact="1" removes the "exact length in random mode" choice (BETWEENDLE: it would narrow the answer down).
   ========================================================================== */
(function () {
  "use strict";
  if (window.LengthPanel) return;
  var Schema = window.LengthPanelSchema;
  if (!Schema) return;

  var script = document.currentScript;
  var game = (script && script.getAttribute("data-game")) || (document.body && document.body.getAttribute("data-game")) || "";
  var noExact = !!(script && script.getAttribute("data-no-exact"));
  var storageKey = "craft.lenpanel." + game;
  var cid = Math.random().toString(36).slice(2, 10);

  var S = Schema.defaults();
  var lastGame = null;
  var el = null;            // the panel on the page
  var btn = null;           // the quick show / hide button
  var socket = null;
  var pendingPatch = null;
  var sendTimer = null;
  var ui = null;            // the settings controls { key: setter }
  var prevPanels = null;    // the two previews in Settings
  var lastSig = "";
  var lastHeight = -1;

  function $(s, r) { return (r || document).querySelector(s); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]; }); }
  function mk(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }

  /* ------------------------------------------------------------------ cache + settings */
  function fixed(cfg) { if (noExact && cfg.randomShows === "exact") cfg.randomShows = "range"; return cfg; }
  function readCache() {
    try { var t = localStorage.getItem(storageKey); S = fixed(Schema.normalize(t ? JSON.parse(t) : null)); } catch (e) { S = Schema.defaults(); }
  }
  function writeCache() { try { localStorage.setItem(storageKey, JSON.stringify(S)); } catch (e) { /* private mode: still works this session */ } }

  /** The host changed something: apply it right now, remember it, and tell the server (shortly after, batched). */
  function change(patch) {
    var clean = Schema.cleanPatch(patch);
    for (var k in clean) S[k] = clean[k];
    fixed(S);
    writeCache();
    render(true);
    syncControls();
    pendingPatch = pendingPatch || {};
    for (var k2 in clean) pendingPatch[k2] = S[k2];
    clearTimeout(sendTimer);
    sendTimer = setTimeout(flush, 160);
  }
  function flush() {
    if (!pendingPatch) return;
    var p = pendingPatch; pendingPatch = null;
    if (socket && socket.connected) socket.emit("lp:set", { game: game, patch: p, cid: cid });
  }

  /* ------------------------------------------------------------------ text -> parts */
  function partsFor(template, vals) {
    return String(template || "").split("|").map(function (x) { return x.trim(); }).filter(Boolean).map(function (seg) {
      var h = esc(seg).replace(/\{(length|min|max|range|language)\}/gi, function (m, k) { return '<b class="lpNum">' + esc(String(vals[k.toLowerCase()])) + "</b>"; });
      return h.replace(/<b class="lpNum">1<\/b>(\s+)letters\b/gi, '<b class="lpNum">1</b>$1letter');
    });
  }
  function infoOf(g) {
    var min = Number(g.lengthMin), max = Number(g.lengthMax), n = Number(g.wordLength);
    var random = g.lengthMode === "random" && max > min;
    var lang = g.wordLanguageInfo && g.wordLanguageInfo.label ? String(g.wordLanguageInfo.label).replace(/^[^\wÀ-￿]+/, "").trim() : "";
    return { random: random, n: n, min: min, max: max, language: lang };
  }
  // Fills one panel element (the real one, or a preview in Settings). cfg = settings, info = { random, n, min, max, language }
  function fill(target, cfg, info) {
    var range = info.min + " - " + info.max;
    var exact = info.random && cfg.randomShows === "exact" && !noExact;
    var vals = { length: info.random && !exact ? range : info.n, min: info.min, max: info.max, range: range, language: info.language || "" };
    var parts = partsFor(info.random ? cfg.randomText : cfg.fixedText, vals);
    var rows = Math.max(1, Math.min(cfg.rows, parts.length || 1));
    var per = Math.max(1, Math.ceil(parts.length / rows));
    var html = "";
    if (cfg.title) html += '<div class="lpTitle">' + esc(cfg.title) + "</div>";
    for (var i = 0; i < parts.length; i += per) {
      var items = parts.slice(i, i + per).map(function (x, j) { return (j ? '<span class="lpDiv" aria-hidden="true"></span>' : "") + '<span class="lpPart">' + x + "</span>"; });
      html += '<div class="lpRow">' + (i === 0 && cfg.icon ? '<span class="lpIcon" aria-hidden="true">' + esc(cfg.icon) + "</span>" : "") + items.join("") + "</div>";
    }
    target.innerHTML = html;
    style(target, cfg);
    return Boolean(parts.length || cfg.title);
  }
  function setVar(t, k, v) { if (v === "" || v == null) t.style.removeProperty(k); else t.style.setProperty(k, v); }
  function hexToRgb(h) { var n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function inkFor(hex) { var c = hexToRgb(hex); return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) > 150 ? "#1b1b22" : "#ffffff"; }
  var FONT_CSS = {
    "default": "", rounded: "'Quicksand','Nunito',system-ui,sans-serif", grotesk: "'Space Grotesk','Inter',system-ui,sans-serif",
    serif: "Georgia,'Times New Roman',serif", mono: "ui-monospace,'SFMono-Regular',Menlo,Consolas,monospace", script: "'Pacifico',cursive"
  };
  var WEIGHT_CSS = { normal: "400", bold: "700", heavy: "800" };
  var SHADOW_CSS = ["none", "0 2px 6px rgba(0,0,0,.18)", "0 6px 16px rgba(0,0,0,.28)", "0 8px 26px rgba(0,0,0,.40), 0 0 16px var(--lp-glow, rgba(255,255,255,.18))"];
  function style(t, c) {
    t.setAttribute("data-align", c.align);
    t.setAttribute("data-box", c.box ? "on" : "off");
    t.setAttribute("data-divider", c.divider);
    t.setAttribute("data-case", c.titleCase);
    setVar(t, "--lp-scale", (c.size / 100).toFixed(2));
    setVar(t, "--lp-num", (c.numSize / 100).toFixed(2) + "em");
    setVar(t, "--lp-title", (c.titleSize / 100).toFixed(2) + "em");
    setVar(t, "--lp-font", FONT_CSS[c.font]);
    setVar(t, "--lp-weight", WEIGHT_CSS[c.weight]);
    setVar(t, "--lp-spacing", c.spacing + "px");
    setVar(t, "--lp-lgap", c.lineGap + "px");
    setVar(t, "--lp-pgap", c.partGap + "px");
    setVar(t, "--lp-radius", c.radius + "px");
    setVar(t, "--lp-bw", c.bw + "px");
    setVar(t, "--lp-bstyle", c.borderStyle);
    setVar(t, "--lp-padx", c.padX + "px");
    setVar(t, "--lp-pady", c.padY + "px");
    setVar(t, "--lp-mt", c.marginTop + "px");
    setVar(t, "--lp-mb", c.marginBottom + "px");
    setVar(t, "--lp-width", c.widthPct + "%");
    setVar(t, "--lp-opacity", (c.opacity / 100).toFixed(2));
    setVar(t, "--lp-shadow", SHADOW_CSS[c.shadow]);
    var bg = "";
    if (c.bg) { var rgb = hexToRgb(c.bg); bg = "rgba(" + rgb[0] + "," + rgb[1] + "," + rgb[2] + "," + (c.bgOpacity / 100).toFixed(2) + ")"; }
    setVar(t, "--lp-bg", bg);
    setVar(t, "--lp-border", c.border);
    setVar(t, "--lp-glow", c.border || c.bg);
    // readable text: the host's own color, otherwise follow a custom background color
    setVar(t, "--lp-ink", c.ink || (c.bg && c.box && c.bgOpacity >= 55 ? inkFor(c.bg) : ""));
    setVar(t, "--lp-title-ink", c.titleInk);
    setVar(t, "--lp-num-ink", c.numInk);
    t.classList.toggle("lpAnimate", !!c.animate);
  }

  /* ------------------------------------------------------------------ placement */
  function container() { return document.querySelector(".round-card") || document.querySelector(".board-section"); }
  function boardEl() { return document.getElementById("tilesWrap") || document.getElementById("grid") || document.getElementById("board"); }
  function keyboardEl() { return document.getElementById("keyboardSection") || document.querySelector(".keyboard-section"); }
  function legendEl() { return document.getElementById("legendSection"); }
  // where the panel should sit: { parent, before } - "before" null = at the end of parent
  function target() {
    var c = container();
    if (!c) return null;
    var board = boardEl(), kb = keyboardEl(), lg = legendEl();
    var pos = S.position;
    if (pos === "belowBoard" && board && board.parentNode) return { parent: board.parentNode, before: board.nextSibling };
    if (pos === "aboveKeyboard" && kb && kb.parentNode) return { parent: kb.parentNode, before: kb };
    if ((pos === "aboveBoard" || pos === "aboveKeyboard") && board && board.parentNode) return { parent: board.parentNode, before: board };
    if (pos === "belowLegend" && lg && lg.parentNode) return { parent: lg.parentNode, before: lg.nextSibling };
    // "top": right under the floating message window, above the legend
    var toast = c.querySelector(".toast-slot");
    if (toast && toast.parentNode && toast !== el) return { parent: toast.parentNode, before: toast.nextSibling };
    return { parent: c, before: c.firstChild };
  }
  function place() {
    if (!el) return;
    var t = target();
    if (!t) return;
    // already in the right place? (the legend is inserted at the same anchor, so for "top" also stay in front of it)
    var wanted = t.before === el ? el.nextSibling : t.before;
    if (el.parentNode === t.parent && el.nextSibling === wanted) { fixTop(); return; }
    t.parent.insertBefore(el, t.before === el ? el.nextSibling : t.before);
    fixTop();
  }
  // "top" must stay ABOVE the legend even if the legend was (re)inserted at the same anchor after this panel
  function fixTop() {
    var lg = legendEl();
    if (S.position !== "top" || !lg || lg.parentNode !== el.parentNode) return;
    if (el.compareDocumentPosition(lg) & Node.DOCUMENT_POSITION_PRECEDING) el.parentNode.insertBefore(el, lg);
  }
  var observer = null, placeTimer = null;
  function watch() {
    var c = container();
    if (!c || observer || !window.MutationObserver) return;
    observer = new MutationObserver(function () {
      clearTimeout(placeTimer);
      placeTimer = setTimeout(place, 30);
    });
    observer.observe(c, { childList: true, subtree: true });
  }

  /* ------------------------------------------------------------------ rendering */
  function build() {
    el = document.getElementById("lengthPanel");
    if (!el) {
      el = document.createElement("div");
      el.id = "lengthPanel";
      el.className = "lengthPanel";
      el.setAttribute("aria-live", "polite");
      el.hidden = true;
    }
    place();
    watch();
  }
  function render(force) {
    if (!el) return;
    var g = lastGame;
    var on = !!g && S.show && Number(g.wordLength) > 0 && (g.status !== "idle" || S.showIdle);
    var info = g ? infoOf(g) : null;
    var sig = on ? JSON.stringify([S, info.random, info.random ? (S.randomShows === "exact" ? info.n : 0) : info.n, info.min, info.max, info.language]) : "off:" + S.show;
    updateButton();
    if (sig === lastSig && !force) return;
    var textChanged = lastSig !== "" && lastSig.indexOf("off") !== 0;
    lastSig = sig;
    if (!on) { el.hidden = true; el.innerHTML = ""; paintPreviews(); notifyHeight(); return; }
    el.hidden = !fill(el, S, info);
    if (S.animate && textChanged && !el.hidden) { el.classList.remove("lpPop"); void el.offsetWidth; el.classList.add("lpPop"); }
    place();
    paintPreviews();
    notifyHeight();
  }
  // the games size their board to the space that is left: tell them when the panel got taller / shorter (as the legend does)
  function notifyHeight() {
    var raf = window.requestAnimationFrame || function (f) { return setTimeout(f, 16); };
    raf(function () {
      var h = el && !el.hidden ? el.offsetHeight : 0;
      if (Math.abs(h - lastHeight) < 1) return;
      lastHeight = h;
      try { window.dispatchEvent(new Event("resize")); } catch (e) { /* ignore */ }
    });
  }
  function updateButton() {
    if (!btn) return;
    btn.hidden = !S.toolbarBtn;
    btn.classList.toggle("lpBtnOff", !S.show);
    btn.setAttribute("aria-pressed", String(S.show));
    btn.title = S.show ? "Hide the word length panel" : "Show the word length panel";
    btn.setAttribute("aria-label", btn.title);
  }
  function buildButton() {
    if (document.getElementById("lengthPanelBtn")) { btn = document.getElementById("lengthPanelBtn"); return; }
    var row = $(".toolbarRow");
    if (!row) return;
    btn = document.createElement("button");
    btn.type = "button";
    btn.id = "lengthPanelBtn";
    btn.className = "iconBtn lpToolbarBtn";
    btn.textContent = "🔡";
    btn.addEventListener("click", function () { change({ show: !S.show }); });
    var settings = document.getElementById("settingsBtn");
    if (settings && settings.parentNode === row) row.insertBefore(btn, settings); else row.appendChild(btn);
    updateButton();
  }

  /* ------------------------------------------------------------------ the settings section */
  var PRESET_NOTE = "Quick looks only change the style (texts and the show / hide switch stay).";
  function previewInfo(random) {
    var g = lastGame || {};
    var info = g.lengthMin ? infoOf(g) : { random: false, n: 6, min: 4, max: 12, language: "English" };
    var min = info.min > 0 ? info.min : 4;
    var max = info.max > min ? info.max : Math.max(min + 1, 12);
    var n = !info.random && info.n > 0 ? info.n : 6;
    return { random: random, n: n, min: min, max: max, language: info.language || "English" };
  }
  function paintPreviews() {
    if (!prevPanels) return;
    fill(prevPanels.fixed, S, previewInfo(false));
    fill(prevPanels.random, S, previewInfo(true));
  }

  function groupTitle(root, text) { root.appendChild(mk("div", "lpGroup", text)); }
  function addSwitch(root, key, label) {
    var row = mk("label", "switchRow lpSwitch");
    var cb = document.createElement("input"); cb.type = "checkbox";
    var track = mk("span", "switchTrack"); track.appendChild(mk("span", "switchThumb"));
    row.appendChild(cb); row.appendChild(track); row.appendChild(mk("span", "switchLabel", label));
    cb.addEventListener("change", function () { var p = {}; p[key] = cb.checked; change(p); });
    root.appendChild(row);
    ui[key] = function () { cb.checked = !!S[key]; };
  }
  function addSlider(root, key, label, unit, hint) {
    var f = Schema.FIELDS[key];
    var wrap = mk("div", "lpField");
    var head = mk("div", "lpHead");
    head.appendChild(mk("span", "lpLabel", label));
    var val = mk("span", "lpVal", "");
    head.appendChild(val);
    wrap.appendChild(head);
    var r = document.createElement("input");
    r.type = "range"; r.className = "lpRange"; r.min = f.min; r.max = f.max; r.step = f.step; r.setAttribute("aria-label", label);
    r.addEventListener("input", function () { var p = {}; p[key] = Number(r.value); change(p); });
    wrap.appendChild(r);
    if (hint) wrap.appendChild(mk("div", "lpHint", hint));
    root.appendChild(wrap);
    ui[key] = function () { if (document.activeElement !== r) r.value = String(S[key]); val.textContent = S[key] + (unit || ""); };
  }
  function addChips(root, key, label, options, hint) {
    var wrap = mk("div", "lpField");
    wrap.appendChild(mk("div", "lpLabel", label));
    var row = mk("div", "lpChips");
    var btns = {};
    options.forEach(function (o) {
      var b = mk("button", "lpChip", o[1]); b.type = "button";
      b.addEventListener("click", function () { var p = {}; p[key] = o[0]; change(p); });
      row.appendChild(b); btns[o[0]] = b;
    });
    wrap.appendChild(row);
    if (hint) wrap.appendChild(mk("div", "lpHint", hint));
    root.appendChild(wrap);
    ui[key] = function () { for (var v in btns) { btns[v].classList.toggle("selected", v === S[key]); btns[v].setAttribute("aria-pressed", String(v === S[key])); } };
  }
  function addText(root, key, label, placeholder) {
    var f = Schema.FIELDS[key];
    var wrap = mk("div", "lpField");
    wrap.appendChild(mk("div", "lpLabel", label));
    var inp = document.createElement("input");
    inp.type = "text"; inp.className = "lpText"; inp.maxLength = f.max; inp.placeholder = placeholder || ""; inp.autocomplete = "off"; inp.spellcheck = false;
    inp.setAttribute("aria-label", label);
    inp.addEventListener("input", function () { var p = {}; p[key] = inp.value; change(p); });
    wrap.appendChild(inp);
    root.appendChild(wrap);
    ui[key] = function () { if (document.activeElement !== inp) inp.value = S[key]; };
  }
  var AUTO_FALLBACK = { bg: "#e8dcc4", border: "#cfc3a8", ink: "#3a2d20", titleInk: "#3a2d20", numInk: "#3a2d20" };
  function addColor(root, key, label, hint) {
    var wrap = mk("div", "lpField");
    var head = mk("div", "lpHead");
    head.appendChild(mk("span", "lpLabel", label));
    var state = mk("span", "lpVal", "");
    head.appendChild(state);
    wrap.appendChild(head);
    var row = mk("div", "lpColorRow");
    var inp = document.createElement("input"); inp.type = "color"; inp.className = "lpColor"; inp.setAttribute("aria-label", label);
    inp.addEventListener("input", function () { var p = {}; p[key] = inp.value; change(p); });
    var auto = mk("button", "lpChip", "Auto"); auto.type = "button";
    auto.addEventListener("click", function () { var p = {}; p[key] = ""; change(p); });
    row.appendChild(inp); row.appendChild(auto);
    wrap.appendChild(row);
    if (hint) wrap.appendChild(mk("div", "lpHint", hint));
    root.appendChild(wrap);
    ui[key] = function () {
      var v = S[key];
      if (document.activeElement !== inp) inp.value = v || AUTO_FALLBACK[key];
      state.textContent = v ? v.toUpperCase() : "Auto";
      auto.classList.toggle("selected", !v);
    };
  }

  function buildPanel(root) {
    ui = {};
    var r = mk("div", "lpUi");

    groupTitle(r, "Show / hide");
    addSwitch(r, "show", "Show the word length panel to viewers");
    addSwitch(r, "showIdle", "Also show it before a round has started");
    addSwitch(r, "toolbarBtn", "Quick show / hide button (🔡) in the top bar");

    groupTitle(r, "Preview");
    r.appendChild(mk("div", "lpLabel", "When the length is fixed"));
    var pf = mk("div", "lengthPanel lpPreview");
    r.appendChild(pf);
    r.appendChild(mk("div", "lpLabel", "When the length is random"));
    var pr = mk("div", "lengthPanel lpPreview");
    r.appendChild(pr);
    prevPanels = { fixed: pf, random: pr };

    groupTitle(r, "Quick looks");
    var presetRow = mk("div", "lpChips");
    Schema.PRESETS.forEach(function (p) {
      var b = mk("button", "lpChip", p.name); b.type = "button";
      b.addEventListener("click", function () {
        // a look = every style field back to the default, then the preset on top (texts and show / hide stay)
        var keep = { show: S.show, showIdle: S.showIdle, toolbarBtn: S.toolbarBtn, title: S.title, fixedText: S.fixedText, randomText: S.randomText, icon: S.icon, randomShows: S.randomShows, position: S.position };
        var base = Schema.defaults();
        var patch = {};
        for (var k in base) patch[k] = keep[k] !== undefined ? keep[k] : base[k];
        for (var k2 in p.patch) patch[k2] = p.patch[k2];
        change(patch);
      });
      presetRow.appendChild(b);
    });
    r.appendChild(presetRow);
    r.appendChild(mk("div", "lpHint", PRESET_NOTE));

    groupTitle(r, "Texts");
    addText(r, "title", "Title (leave empty for no title)", "Word length");
    addText(r, "fixedText", "Text when the length is fixed", "{length} letters");
    addText(r, "randomText", "Text when the length is random", "Random: {range}");
    addText(r, "icon", "Icon in front of the text (optional)", "🔡");
    r.appendChild(mk("div", "lpHint", "Put several texts in one line by separating them with | , for example:  {length} letters | {language}  . Each part becomes its own item (\"Rows\" spreads the parts over several rows). Words you can use: {length}  {min}  {max}  {range}  {language}."));
    if (noExact) {
      r.appendChild(mk("div", "lpHint", "When the length is random, {length} shows the range - never the round's exact length, which would narrow the answer down."));
    } else {
      addChips(r, "randomShows", "When the length is random, show", [["range", "The range (4 - 12)"], ["exact", "This round's exact length"]], "The range keeps it a surprise; the exact length matches the number of tiles on the board.");
    }

    groupTitle(r, "Position and layout");
    addChips(r, "position", "Where it sits", [["top", "Top (above the legend)"], ["belowLegend", "Below the legend"], ["aboveBoard", "Above the board"], ["aboveKeyboard", "Above the keyboard"], ["belowBoard", "Below the board"]]);
    addChips(r, "align", "Text alignment", [["left", "Left"], ["center", "Center"], ["right", "Right"]]);
    addSlider(r, "rows", "Rows", "", "Spreads the | separated parts over this many rows (never more rows than parts).");
    addSlider(r, "widthPct", "Panel width", "%");

    groupTitle(r, "Text");
    addSlider(r, "size", "Text size", "%", "From very small (40%) to huge (300%).");
    addSlider(r, "numSize", "Number size", "%", "How much bigger the numbers are than the rest of the text.");
    addSlider(r, "titleSize", "Title size", "%");
    addChips(r, "titleCase", "Title letters", [["upper", "CAPITALS"], ["normal", "Normal"]]);
    addChips(r, "weight", "Text weight", [["normal", "Normal"], ["bold", "Bold"], ["heavy", "Heavy"]]);
    addChips(r, "font", "Font", [["default", "Standard"], ["rounded", "Rounded"], ["grotesk", "Modern"], ["serif", "Serif"], ["mono", "Typewriter"], ["script", "Script"]]);
    addSlider(r, "spacing", "Letter spacing", "px");
    addSlider(r, "lineGap", "Space between rows", "px");
    addSlider(r, "partGap", "Space around dividers", "px");
    addChips(r, "divider", "Divider between parts", [["line", "Line"], ["dot", "Dot"], ["slash", "Slash"], ["dash", "Dash"], ["none", "None"]]);

    groupTitle(r, "Box");
    addSwitch(r, "box", "Show the box (background and border)");
    addSlider(r, "radius", "Corner roundness", "px");
    addSlider(r, "bw", "Border thickness", "px");
    addChips(r, "borderStyle", "Border style", [["solid", "Solid"], ["dashed", "Dashed"], ["dotted", "Dotted"], ["double", "Double"]]);
    addSlider(r, "padX", "Inner space left / right", "px");
    addSlider(r, "padY", "Inner space top / bottom", "px");
    addSlider(r, "marginTop", "Space above the panel", "px");
    addSlider(r, "marginBottom", "Space below the panel", "px");
    addSlider(r, "shadow", "Shadow / glow depth", "");
    addSlider(r, "opacity", "Panel see-through-ness (100% = solid)", "%");

    groupTitle(r, "Colors");
    addColor(r, "bg", "Background color", "Auto follows the legend's panel.");
    addSlider(r, "bgOpacity", "Background strength (custom background only)", "%");
    addColor(r, "border", "Border color", "Auto follows the legend's panel.");
    addColor(r, "ink", "Text color", "Auto picks a readable color.");
    addColor(r, "titleInk", "Title color", "Auto = the text color.");
    addColor(r, "numInk", "Number color", "Auto = the text color.");

    groupTitle(r, "Motion");
    addSwitch(r, "animate", "Pop animation when the text changes (new round)");

    var actions = mk("div", "lpActions");
    var reset = mk("button", "btn btnGhost lpBtn", "Reset the look"); reset.type = "button";
    reset.addEventListener("click", function () {
      var base = Schema.defaults(); base.show = S.show;
      change(base);
    });
    var all = mk("button", "btn btnGhost lpBtn", "Apply this look to every game"); all.type = "button";
    all.addEventListener("click", function () {
      if (!window.confirm("Copy this word length panel look (texts, size, colors, rows ...) to every word game? Each game keeps its own show / hide switch and position.")) return;
      flush();
      if (socket && socket.connected) { socket.emit("lp:apply_all", { game: game }); all.textContent = "Applied to every game ✓"; setTimeout(function () { all.textContent = "Apply this look to every game"; }, 2500); }
      else all.textContent = "Not connected - try again";
    });
    actions.appendChild(reset); actions.appendChild(all);
    r.appendChild(actions);

    root.appendChild(r);
    syncControls();
    paintPreviews();
  }
  function syncControls() { if (!ui) return; for (var k in ui) ui[k](); paintPreviews(); }

  function mountPanel() {
    var picker = document.getElementById("shadePicker") || document.querySelector("[data-color-shades]") || document.getElementById("exColorsBody") || document.getElementById("cdColorsBody"); // update 99: EXPANDLE / CITYDLE have their own colors card instead of Color shades
    if (!picker || document.getElementById("lengthPanelSettings")) return;
    var host = picker.closest(".drawerSection") || picker.closest(".host-card");
    if (!host) return;
    var intro = "The panel that tells viewers how long the secret word is. Show or hide it at any time, change its texts, rows (1-8), text size (40-300%), font, colors, box and position, or pick a ready-made look. Every change applies right away on every screen.";
    var wrap = document.createElement("div");
    wrap.id = "lengthPanelSettings";
    if (host.classList.contains("host-card")) {
      wrap.className = "host-card";
      wrap.innerHTML = '<div class="host-card-title">🔡 WORD LENGTH PANEL</div><p class="host-note" style="font-size:12px;opacity:.75;margin:0 0 8px">' + esc(intro) + '</p><div class="lpMount"></div>';
    } else {
      wrap.className = "drawerSection";
      wrap.innerHTML = '<h4>Word length panel</h4><p class="sectionNote">' + esc(intro) + '</p><div class="lpMount"></div>';
    }
    host.parentNode.insertBefore(wrap, host.nextSibling);
    buildPanel(wrap.querySelector(".lpMount"));
  }

  /* ------------------------------------------------------------------ sync with the server */
  function connect() {
    if (socket) return;
    function go() {
      if (typeof io === "undefined") return;
      socket = io("/lenpanel");
      socket.on("connect", function () { socket.emit("lp:join", { game: game }); });
      socket.on("lp:state", function (msg) {
        if (!msg || msg.game !== game) return;
        if (msg.by && msg.by === cid) return;          // my own change coming back
        if (pendingPatch) return;                      // I still have edits waiting to be sent; they win
        if (msg.kind === "join" && !msg.saved) {
          // the server has nothing saved (fresh install / wiped disk) but this browser remembers the host's choice: give it back
          var cached = null;
          try { cached = localStorage.getItem(storageKey); } catch (e) { /* ignore */ }
          if (cached) socket.emit("lp:set", { game: game, patch: S, cid: cid });
          return;
        }
        S = fixed(Schema.normalize(msg.settings));
        writeCache();
        render(true);
        syncControls();
      });
    }
    if (typeof io !== "undefined") { go(); return; }
    var tag = document.createElement("script");
    tag.src = "/socket.io/socket.io.js";
    tag.onload = go;
    document.head.appendChild(tag);
  }

  /* ------------------------------------------------------------------ public API + boot */
  window.LengthPanel = {
    /** Call with the game's state every time it arrives (needs status, wordLength, lengthMode, lengthMin, lengthMax, wordLanguageInfo). */
    update: function (g) { lastGame = g || null; render(false); },
    get: function () { return Object.assign({}, S); },
    set: function (patch) { change(patch || {}); },
    show: function (on) { change({ show: !!on }); },
    toggle: function () { change({ show: !S.show }); }
  };

  readCache();
  function ready() {
    build();
    buildButton();
    mountPanel();
    if (lastGame) render(true); else updateButton();
    connect();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", ready); else ready();
})();
