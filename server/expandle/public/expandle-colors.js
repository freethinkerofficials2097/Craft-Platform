/* ==========================================================================
   EXPANDLE COLORS (update 96)
   EXPANDLE has ONE tile color: every letter of every row looks the same (no purple / blue / gold by meaning).
   The server keeps the host's choices (server/shared/expandle-colors-store.js) and sends them in every state; this script turns them into
   CSS variables on <html>:  --ex-tile  --ex-tile-ink  --ex-tile-bd  --ex-frame  --ex-timer  --ex-timer-ink  --ex-bw  --ex-radius  --ex-tile-scale
   The tiles AND the legend (/shared/legend.js reads the very same variables) use them, so a color changed in Settings -> Colors shows in the
   legend at once, and a color changed on a legend chip (ExpandleColors.setLegendPart) changes the game as well.
   ========================================================================== */
(function () {
  "use strict";
  var DEFAULTS = { tileBg: "#8a8f98", tileInk: "#ffffff", tileBd: "#62666d", frame: "#3c3c40", timerBg: "#2e7d32", timerInk: "#ffffff", borderW: 0, radius: 7, tileScale: 100 };
  var NUM = { borderW: [0, 6], radius: [0, 20], tileScale: [60, 115] };
  var HEX = /^#[0-9a-f]{6}$/i;
  var cur = {};
  Object.keys(DEFAULTS).forEach(function (k) { cur[k] = DEFAULTS[k]; });
  var sender = null, inputs = {};
  var LEGEND_KEYS = { tile: "tile", score: "tile", rule: "frame", latest: "frame", timer: "timer" };

  function clampByte(n) { return Math.max(0, Math.min(255, Math.round(n))); }
  function darken(hex, f) {
    var n = parseInt(String(hex).slice(1), 16);
    return "#" + ((1 << 24) + (clampByte(((n >> 16) & 255) * f) << 16) + (clampByte(((n >> 8) & 255) * f) << 8) + clampByte((n & 255) * f)).toString(16).slice(1);
  }
  function clean(k, v) {
    if (k in NUM) { var n = Math.round(Number(v)); return isFinite(n) ? Math.max(NUM[k][0], Math.min(NUM[k][1], n)) : undefined; }
    return HEX.test(String(v)) ? String(v).toLowerCase() : undefined;
  }

  function paint() {
    var r = document.documentElement.style;
    r.setProperty("--ex-tile", cur.tileBg);
    r.setProperty("--ex-tile-ink", cur.tileInk);
    r.setProperty("--ex-tile-bd", cur.tileBd);
    r.setProperty("--ex-tile-dark", darken(cur.tileBg, 0.72));
    r.setProperty("--ex-frame", cur.frame);
    r.setProperty("--ex-frame-ink", "#ffffff");
    r.setProperty("--ex-frame-dark", darken(cur.frame, 0.72));
    r.setProperty("--ex-timer", cur.timerBg);
    r.setProperty("--ex-timer-ink", cur.timerInk);
    r.setProperty("--ex-timer-dark", darken(cur.timerBg, 0.72));
    r.setProperty("--ex-bw", cur.borderW + "px");
    r.setProperty("--ex-radius", cur.radius + "px");
    r.setProperty("--ex-tile-scale", String(cur.tileScale / 100));
    syncInputs();
    try { window.dispatchEvent(new CustomEvent("expandle-colors", { detail: cur })); } catch (e) { /* old browser */ }
  }
  function cache() { try { localStorage.setItem("expandleColors", JSON.stringify(cur)); } catch (e) { /* private mode */ } }
  try {
    var t = JSON.parse(localStorage.getItem("expandleColors") || "null");
    if (t) Object.keys(DEFAULTS).forEach(function (k) { var v = clean(k, t[k]); if (v !== undefined) cur[k] = v; });
  } catch (e) { /* ignore */ }
  paint();

  function update(colors, send) {
    if (send) sender = send;
    if (!colors) return;
    var changed = false;
    Object.keys(DEFAULTS).forEach(function (k) { var v = clean(k, colors[k]); if (v !== undefined && cur[k] !== v) { cur[k] = v; changed = true; } });
    if (changed) { cache(); paint(); }
  }
  function push(patch) {
    var changed = false, wire = {};
    Object.keys(patch).forEach(function (k) {
      if (!(k in DEFAULTS)) return;
      wire[k] = patch[k];
      var v = clean(k, patch[k] === null ? DEFAULTS[k] : patch[k]);
      if (v !== undefined && cur[k] !== v) { cur[k] = v; changed = true; }
    });
    if (changed) { cache(); paint(); }
    if (sender) sender("set_colors", wire);
  }

  function legendKey(id) { return LEGEND_KEYS[id] || null; }
  function getPart(part) { return cur[part + "Bg"] || cur[part] || "#888888"; }
  function setLegendPart(part, hex) { var o = {}; o[part === "frame" ? "frame" : part + "Bg"] = hex; push(o); }
  function resetLegendPart(part) { var o = {}; o[part === "frame" ? "frame" : part + "Bg"] = null; push(o); }

  var ROWS = [
    { l: "Letter tiles (every row, every letter)", keys: [["tileBg", "Tile"], ["tileInk", "Letter"], ["tileBd", "Border"]], sample: "tile" },
    { l: "Frame around the newest row", keys: [["frame", "Color"]], sample: "frame" },
    { l: "Round clock and its bar", keys: [["timerBg", "Clock"], ["timerInk", "Text"]], sample: "timer" }
  ];
  var SLIDERS = [["borderW", "Tile border width", "px"], ["radius", "Tile corner roundness", "px"], ["tileScale", "Tile size", "%"]];
  var PRESETS = [
    ["Blue (standard)", null],
    ["Green", { tileBg: "#2e9e57", tileInk: "#ffffff", tileBd: "#1f7440" }],
    ["Purple", { tileBg: "#7b5ea7", tileInk: "#ffffff", tileBd: "#5a4380" }],
    ["Gold", { tileBg: "#f2b01e", tileInk: "#1b1b1f", tileBd: "#b9820a" }],
    ["Dark", { tileBg: "#2b2b30", tileInk: "#f3f1e6", tileBd: "#111114" }],
    ["White", { tileBg: "#ffffff", tileInk: "#1b1b1f", tileBd: "#b9b3a6" }]
  ];
  var COLOR_KEYS = ["tileBg", "tileInk", "tileBd", "frame", "timerBg", "timerInk"];

  function syncInputs() {
    Object.keys(inputs).forEach(function (k) {
      var inp = inputs[k];
      if (document.activeElement === inp) return;
      if (String(inp.value) !== String(cur[k])) inp.value = cur[k];
      var out = inp.parentNode && inp.parentNode.querySelector(".cdcVal");
      if (out) out.textContent = cur[k] + (inp.dataset.unit || "");
    });
    var body = document.getElementById("exColorsBody");
    if (!body) return;
    body.querySelectorAll(".cdcSample").forEach(function (s) {
      var k = s.dataset.s;
      if (k === "tile") { s.style.background = cur.tileBg; s.style.color = cur.tileInk; s.style.border = Math.max(1, cur.borderW) + "px solid " + cur.tileBd; s.style.borderRadius = cur.radius + "px"; }
      else if (k === "frame") { s.style.background = "transparent"; s.style.border = "3px solid " + cur.frame; }
      else { s.style.background = cur.timerBg; s.style.color = cur.timerInk; }
    });
  }

  function build() {
    var body = document.getElementById("exColorsBody");
    if (!body || body.dataset.built) return;
    body.dataset.built = "1";
    var pre = document.createElement("div"); pre.className = "cdcPresets";
    PRESETS.forEach(function (p) {
      var b = document.createElement("button"); b.type = "button"; b.className = "btn btnGhost cdcBtn"; b.textContent = p[0];
      b.addEventListener("click", function () {
        var patch = {};
        ["tileBg", "tileInk", "tileBd"].forEach(function (k) { patch[k] = p[1] ? p[1][k] : null; });
        push(patch);
      });
      pre.appendChild(b);
    });
    body.appendChild(pre);
    var box = document.createElement("div"); box.className = "cdcGroup";
    ROWS.forEach(function (r) {
      var row = document.createElement("div"); row.className = "cdcRow";
      var sample = document.createElement("span"); sample.className = "cdcSample"; sample.dataset.s = r.sample; sample.textContent = r.sample === "frame" ? "" : "A";
      var lab = document.createElement("span"); lab.className = "cdcLabel"; lab.textContent = r.l;
      row.appendChild(sample); row.appendChild(lab);
      r.keys.forEach(function (pair) {
        var wrap = document.createElement("label"); wrap.className = "cdcPick";
        var cap = document.createElement("small"); cap.textContent = pair[1];
        var inp = document.createElement("input"); inp.type = "color"; inp.value = cur[pair[0]];
        inp.addEventListener("input", function () { var o = {}; o[pair[0]] = inp.value; push(o); });
        inputs[pair[0]] = inp; wrap.appendChild(cap); wrap.appendChild(inp); row.appendChild(wrap);
      });
      var rs = document.createElement("button"); rs.type = "button"; rs.className = "cdcReset"; rs.title = "Back to the standard color"; rs.textContent = "↺";
      rs.addEventListener("click", function () { var o = {}; r.keys.forEach(function (pair) { o[pair[0]] = null; }); push(o); });
      row.appendChild(rs); box.appendChild(row);
    });
    SLIDERS.forEach(function (s) {
      var row = document.createElement("div"); row.className = "cdcRow";
      var lab = document.createElement("span"); lab.className = "cdcLabel"; lab.textContent = s[1];
      var wrap = document.createElement("span"); wrap.className = "cdcRange";
      var inp = document.createElement("input"); inp.type = "range"; inp.min = NUM[s[0]][0]; inp.max = NUM[s[0]][1]; inp.step = 1; inp.value = cur[s[0]]; inp.dataset.unit = s[2];
      var out = document.createElement("span"); out.className = "cdcVal"; out.textContent = cur[s[0]] + s[2];
      inp.addEventListener("input", function () { var o = {}; o[s[0]] = Number(inp.value); out.textContent = inp.value + s[2]; push(o); });
      inputs[s[0]] = inp; wrap.appendChild(inp); wrap.appendChild(out);
      var rs = document.createElement("button"); rs.type = "button"; rs.className = "cdcReset"; rs.textContent = "↺";
      rs.addEventListener("click", function () { var o = {}; o[s[0]] = null; push(o); });
      row.appendChild(lab); row.appendChild(wrap); row.appendChild(rs); box.appendChild(row);
    });
    body.appendChild(box);
    var all = document.createElement("button"); all.type = "button"; all.className = "btn btnGhost"; all.textContent = "Reset all EXPANDLE colors";
    all.addEventListener("click", function () { var o = {}; Object.keys(DEFAULTS).forEach(function (k) { o[k] = null; }); push(o); if (sender) sender("reset_colors", {}); });
    body.appendChild(all);
    syncInputs();
  }

  window.ExpandleColors = { update: update, build: build, set: push, legendKey: legendKey, getPart: getPart, setLegendPart: setLegendPart, resetLegendPart: resetLegendPart, DEFAULTS: DEFAULTS };
})();
