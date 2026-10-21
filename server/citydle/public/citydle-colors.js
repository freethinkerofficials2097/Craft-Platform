/* ==========================================================================
   CITYDLE COLORS (update 95, extended in update 96)
   One place that owns every CITYDLE color and shape setting. The server keeps the host's choices (server/shared/citydle-colors-store.js)
   and sends them in every state; this script turns them into CSS variables on <html>:
        --cd-green  --cd-green-ink  --cd-green-sub  --cd-green-bd  --cd-green-dark   (same for yellow, orange, gray, dir, km)
        --cd-frame  --cd-ring  --cd-head-ink  --cd-bw  --cd-radius  --cd-h  --cd-gap  --cd-frame-w  --cd-city-scale ...
   The tiles, the badges AND the legend (/shared/legend.js reads the very same variables) all use those variables, so a color
   changed in Settings -> City colors shows in the game and in the legend at once. The legend's own chip color pickers write here too
   (CitydleColors.set), so changing a color in the legend changes the game as well.
   ========================================================================== */
(function () {
  "use strict";

  var DEFAULTS = {
    greenBg: "#4caf50", greenInk: "#ffffff", greenBd: "#357a38",
    yellowBg: "#e3b505", yellowInk: "#1b1b1f", yellowBd: "#a98200",
    orangeBg: "#ee7b30", orangeInk: "#1b1b1f", orangeBd: "#b45514",
    grayBg: "#8a8a92", grayInk: "#121214", grayBd: "#6a6a72",
    dirBg: "#3c3c40", dirInk: "#f3f1e6", dirBd: "#2b2b2e",
    kmBg: "#3c3c40", kmInk: "#f3f1e6", kmBd: "#2b2b2e",
    frame: "#3c3c40", ring: "#ffd700",
    greenSub: "", yellowSub: "", orangeSub: "", graySub: "", headInk: "",
    borderW: 0, radius: 5, tileH: 46, rowGap: 8, frameW: 3, cityScale: 100, cityWeight: 800, countryScale: 100,
    showCountry: true, upper: true
  };
  var AUTO = { greenSub: 1, yellowSub: 1, orangeSub: 1, graySub: 1, headInk: 1 };
  var NUM = { borderW: [0, 8], radius: [0, 30], tileH: [30, 90], rowGap: [0, 30], frameW: [0, 10], cityScale: [60, 160], cityWeight: [400, 900], countryScale: [50, 180] };
  var BOOL = { showCountry: 1, upper: 1 };
  var HEX = /^#[0-9a-f]{6}$/i;

  var cur = {};
  Object.keys(DEFAULTS).forEach(function (k) { cur[k] = DEFAULTS[k]; });
  var sender = null;
  var inputs = {}; // setting key -> its <input> in the Settings card (filled when the card is built)

  // legend entry id -> the color part it shows
  var LEGEND_KEYS = { green: "green", score: "green", yellow: "yellow", orange: "orange", gray: "gray", list: "gray", arrow: "dir", km: "km", latest: "frame" };

  function clampByte(n) { return Math.max(0, Math.min(255, Math.round(n))); }
  function darken(hex, f) {
    var n = parseInt(String(hex).slice(1), 16);
    var r = clampByte(((n >> 16) & 255) * f), g = clampByte(((n >> 8) & 255) * f), b = clampByte((n & 255) * f);
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

  // checks one value; returns the cleaned value or undefined
  function clean(k, v) {
    if (k in BOOL) return typeof v === "boolean" ? v : undefined;
    if (k in NUM) { var n = Math.round(Number(v)); if (!isFinite(n)) return undefined; return Math.max(NUM[k][0], Math.min(NUM[k][1], n)); }
    if (k in AUTO && v === "") return "";
    return HEX.test(String(v)) ? String(v).toLowerCase() : undefined;
  }

  function paint() {
    var root = document.documentElement.style;
    ["green", "yellow", "orange", "gray", "dir", "km"].forEach(function (p) {
      var bg = cur[p + "Bg"], ink = cur[p + "Ink"];
      root.setProperty("--cd-" + p, bg);
      root.setProperty("--cd-" + p + "-ink", ink);
      root.setProperty("--cd-" + p + "-bd", cur[p + "Bd"]);
      root.setProperty("--cd-" + p + "-dark", darken(bg, 0.72));
      var sub = cur[p + "Sub"]; // only the four city tiles have a country line
      root.setProperty("--cd-" + p + "-sub", sub || ink);
      root.setProperty("--cd-" + p + "-sub-op", sub ? "1" : ".85");
    });
    root.setProperty("--cd-frame", cur.frame);
    root.setProperty("--cd-frame-ink", "#ffffff");
    root.setProperty("--cd-frame-dark", darken(cur.frame, 0.72));
    root.setProperty("--cd-ring", cur.ring);
    root.setProperty("--cd-head-ink", cur.headInk || "var(--text)");
    root.setProperty("--cd-head-op", cur.headInk ? "1" : ".7");
    root.setProperty("--cd-bw", cur.borderW + "px");
    root.setProperty("--cd-radius", cur.radius + "px");
    root.setProperty("--cd-h", cur.tileH + "px");
    root.setProperty("--cd-gap", cur.rowGap + "px");
    root.setProperty("--cd-frame-w", cur.frameW + "px");
    root.setProperty("--cd-city-scale", String(cur.cityScale / 100));
    root.setProperty("--cd-country-scale", String(cur.countryScale / 100));
    root.setProperty("--cd-weight", String(cur.cityWeight));
    root.setProperty("--cd-upper", cur.upper ? "uppercase" : "none");
    root.setProperty("--cd-country-display", cur.showCountry ? "block" : "none");
    syncInputs();
    try { window.dispatchEvent(new CustomEvent("citydle-colors", { detail: cur })); } catch (e) { /* old browser */ }
  }

  function cache() { try { localStorage.setItem("citydleColors", JSON.stringify(cur)); } catch (e) { /* private mode */ } }
  function loadCache() {
    try {
      var t = JSON.parse(localStorage.getItem("citydleColors") || "null");
      if (t) Object.keys(DEFAULTS).forEach(function (k) { var v = clean(k, t[k]); if (v !== undefined) cur[k] = v; });
    } catch (e) { /* ignore */ }
  }
  loadCache();
  paint(); // no flash on reload: the last known look is applied immediately

  // the server's colors (called with every state)
  function update(colors, send) {
    if (send) sender = send;
    if (!colors) return;
    var changed = false;
    Object.keys(DEFAULTS).forEach(function (k) {
      var v = clean(k, colors[k]);
      if (v !== undefined && cur[k] !== v) { cur[k] = v; changed = true; }
    });
    if (changed) { cache(); paint(); }
  }

  function push(patch) {
    var changed = false;
    var wire = {};
    Object.keys(patch).forEach(function (k) {
      if (!(k in DEFAULTS)) return;
      wire[k] = patch[k];
      var v = clean(k, patch[k] === null ? DEFAULTS[k] : patch[k]);
      if (v !== undefined && cur[k] !== v) { cur[k] = v; changed = true; }
    });
    if (changed) { cache(); paint(); }
    if (sender) sender("set_colors", wire);
  }

  /* ---------------------------------------------------------------- legend bridge */
  function legendKey(id) { return LEGEND_KEYS[id] || null; }
  function getPart(part) { return cur[part + "Bg"] || cur[part] || "#888888"; }
  function setLegendPart(part, hex) { var o = {}; o[part === "frame" ? "frame" : part + "Bg"] = hex; push(o); }
  function resetLegendPart(part) { var o = {}; o[part === "frame" ? "frame" : part + "Bg"] = null; push(o); }

  /* ---------------------------------------------------------------- Settings -> City colors */
  var P_TILE = [["Bg", "Tile"], ["Ink", "Text"], ["Sub", "Country text"], ["Bd", "Border"]];
  var ROWS = [
    { h: "City tiles (each one has its own tile, text, country-text and border color)", rows: [
      { l: "Green — the right city", p: "green", pick: P_TILE },
      { l: "Yellow — right country, wrong city", p: "yellow", pick: P_TILE },
      { l: "Orange — right continent, wrong country", p: "orange", pick: P_TILE },
      { l: "Grey — wrong continent", p: "gray", pick: P_TILE } ] },
    { h: "Direction and distance", rows: [
      { l: "Direction arrow badge", p: "dir", pick: [["Bg", "Badge"], ["Ink", "Text"], ["Bd", "Border"]] },
      { l: "Distance (km) badge", p: "km", pick: [["Bg", "Badge"], ["Ink", "Text"], ["Bd", "Border"]] } ] },
    { h: "Newest guess, winner and headings", rows: [
      { l: "Frame around the newest guess (top row)", keys: [["frame", "Color"]] },
      { l: "Ring around the winning row", keys: [["ring", "Color"]] },
      { l: "Column headings (CITY / DIRECTION / DISTANCE) — empty = automatic", keys: [["headInk", "Text"]] } ] }
  ];
  var SLIDERS = [
    ["borderW", "Border width (tiles and badges)", "px"], ["radius", "Corner roundness", "px"], ["tileH", "Row height", "px"],
    ["rowGap", "Space between rows", "px"], ["frameW", "Frame thickness (newest guess)", "px"],
    ["cityScale", "City name size", "%"], ["cityWeight", "City name boldness", ""], ["countryScale", "Country line size", "%"]
  ];
  var SWITCHES = [["showCountry", "Show the country under the city name"], ["upper", "CITY NAMES IN CAPITAL LETTERS"]];
  var COLOR_KEYS = Object.keys(DEFAULTS).filter(function (k) { return !(k in NUM) && !(k in BOOL); });
  var PRESETS = [
    ["Classic (standard)", null],
    ["Color-blind friendly", { greenBg: "#1e73e8", greenInk: "#ffffff", greenBd: "#124a99", yellowBg: "#f2c230", yellowInk: "#1b1b1f", yellowBd: "#b28a0a", orangeBg: "#e8590c", orangeInk: "#ffffff", orangeBd: "#a33e06", grayBg: "#8b8f9e", grayInk: "#ffffff", grayBd: "#60647a", dirBg: "#243b6b", kmBg: "#243b6b", frame: "#243b6b" }],
    ["High contrast", { greenBg: "#00a651", greenInk: "#000000", yellowBg: "#ffe600", yellowInk: "#000000", orangeBg: "#ff7a00", orangeInk: "#000000", grayBg: "#cfcfcf", grayInk: "#000000", dirBg: "#000000", dirInk: "#ffffff", kmBg: "#000000", kmInk: "#ffffff", frame: "#000000" }],
    ["Soft pastel", { greenBg: "#9fd8a3", greenInk: "#1f3d22", yellowBg: "#f6e08a", yellowInk: "#4a3d00", orangeBg: "#f7bb92", orangeInk: "#5a2a08", grayBg: "#d3d3da", grayInk: "#33333a", dirBg: "#6b6f86", dirInk: "#ffffff", kmBg: "#6b6f86", kmInk: "#ffffff", frame: "#6b6f86" }],
    ["Night", { greenBg: "#2e7d32", greenInk: "#e8f5e9", yellowBg: "#a98200", yellowInk: "#fff8e1", orangeBg: "#b45514", orangeInk: "#fff3e8", grayBg: "#4a4a52", grayInk: "#e4e4ea", dirBg: "#111114", dirInk: "#f3f1e6", kmBg: "#111114", kmInk: "#f3f1e6", frame: "#111114" }]
  ];

  function syncInputs() {
    Object.keys(inputs).forEach(function (k) {
      var inp = inputs[k];
      if (document.activeElement === inp) return;
      if (inp.type === "checkbox") { inp.checked = !!cur[k]; return; }
      var v = cur[k];
      if (k in AUTO && !v) v = "#888888";
      if (String(inp.value) !== String(v)) inp.value = v;
      var out = inp.parentNode && inp.parentNode.querySelector(".cdcVal");
      if (out) out.textContent = cur[k] + (inp.dataset.unit || "");
    });
    var body = document.getElementById("cdColorsBody");
    if (body) {
      body.querySelectorAll(".cdcSample").forEach(function (s) {
        var p = s.dataset.p;
        s.style.background = cur[p + "Bg"] || cur[p];
        if (cur[p + "Ink"]) s.style.color = cur[p + "Ink"];
        if (cur[p + "Bd"]) s.style.border = Math.max(1, cur.borderW) + "px solid " + cur[p + "Bd"];
        s.style.borderRadius = cur.radius + "px";
      });
      body.querySelectorAll(".cdcAutoNote").forEach(function (n) { n.hidden = !!cur[n.dataset.k]; });
    }
  }

  function colorPicker(key, caption, row) {
    var wrap = document.createElement("label"); wrap.className = "cdcPick";
    var cap = document.createElement("small"); cap.textContent = caption;
    var inp = document.createElement("input"); inp.type = "color"; inp.value = cur[key] || "#888888";
    inp.addEventListener("input", function () { var o = {}; o[key] = inp.value; push(o); });
    inputs[key] = inp;
    wrap.appendChild(cap); wrap.appendChild(inp);
    if (key in AUTO) {
      var note = document.createElement("small"); note.className = "cdcAutoNote"; note.dataset.k = key; note.textContent = "auto"; note.hidden = !!cur[key];
      wrap.appendChild(note);
    }
    row.appendChild(wrap);
  }

  function build() {
    var body = document.getElementById("cdColorsBody");
    if (!body || body.dataset.built) return;
    body.dataset.built = "1";

    var pre = document.createElement("div"); pre.className = "cdcPresets";
    PRESETS.forEach(function (p) {
      var b = document.createElement("button"); b.type = "button"; b.className = "btn btnGhost cdcBtn"; b.textContent = p[0];
      b.addEventListener("click", function () {
        var patch = {};
        COLOR_KEYS.forEach(function (k) { patch[k] = p[1] && p[1][k] ? p[1][k] : null; }); // a preset only changes colors, never the shape settings
        push(patch);
      });
      pre.appendChild(b);
    });
    body.appendChild(pre);

    ROWS.forEach(function (grp) {
      var box = document.createElement("div"); box.className = "cdcGroup";
      var h = document.createElement("h5"); h.textContent = grp.h; box.appendChild(h);
      grp.rows.forEach(function (r) {
        var row = document.createElement("div"); row.className = "cdcRow";
        var keys = r.keys || r.pick.map(function (q) { return [r.p + q[0], q[1]]; });
        var sample = document.createElement("span"); sample.className = "cdcSample"; sample.dataset.p = r.p || keys[0][0];
        sample.textContent = r.p ? "Aa" : "";
        var lab = document.createElement("span"); lab.className = "cdcLabel"; lab.textContent = r.l;
        row.appendChild(sample); row.appendChild(lab);
        keys.forEach(function (pair) { colorPicker(pair[0], pair[1], row); });
        var rs = document.createElement("button"); rs.type = "button"; rs.className = "cdcReset"; rs.title = "Back to the standard look"; rs.textContent = "↺";
        rs.addEventListener("click", function () { var o = {}; keys.forEach(function (pair) { o[pair[0]] = null; }); push(o); });
        row.appendChild(rs);
        box.appendChild(row);
      });
      body.appendChild(box);
    });

    var shape = document.createElement("div"); shape.className = "cdcGroup";
    var sh = document.createElement("h5"); sh.textContent = "Tile shape and text"; shape.appendChild(sh);
    SLIDERS.forEach(function (s) {
      var row = document.createElement("div"); row.className = "cdcRow";
      var lab = document.createElement("span"); lab.className = "cdcLabel"; lab.textContent = s[1];
      var wrap = document.createElement("span"); wrap.className = "cdcRange";
      var inp = document.createElement("input"); inp.type = "range"; inp.min = NUM[s[0]][0]; inp.max = NUM[s[0]][1]; inp.step = s[0] === "cityWeight" ? 100 : 1; inp.value = cur[s[0]]; inp.dataset.unit = s[2];
      var out = document.createElement("span"); out.className = "cdcVal"; out.textContent = cur[s[0]] + s[2];
      inp.addEventListener("input", function () { var o = {}; o[s[0]] = Number(inp.value); out.textContent = inp.value + s[2]; push(o); });
      inputs[s[0]] = inp;
      wrap.appendChild(inp); wrap.appendChild(out);
      var rs = document.createElement("button"); rs.type = "button"; rs.className = "cdcReset"; rs.title = "Back to the standard value"; rs.textContent = "↺";
      rs.addEventListener("click", function () { var o = {}; o[s[0]] = null; push(o); });
      row.appendChild(lab); row.appendChild(wrap); row.appendChild(rs);
      shape.appendChild(row);
    });
    SWITCHES.forEach(function (s) {
      var row = document.createElement("label"); row.className = "cdcRow cdcSwitch";
      var inp = document.createElement("input"); inp.type = "checkbox"; inp.checked = !!cur[s[0]];
      inp.addEventListener("change", function () { var o = {}; o[s[0]] = inp.checked; push(o); });
      inputs[s[0]] = inp;
      var lab = document.createElement("span"); lab.className = "cdcLabel"; lab.textContent = s[1];
      row.appendChild(inp); row.appendChild(lab);
      shape.appendChild(row);
    });
    body.appendChild(shape);

    var all = document.createElement("button"); all.type = "button"; all.className = "btn btnGhost"; all.textContent = "Reset everything (colors, shape and text)";
    all.addEventListener("click", function () { var o = {}; Object.keys(DEFAULTS).forEach(function (k) { o[k] = null; }); push(o); if (sender) sender("reset_colors", {}); });
    body.appendChild(all);
    syncInputs();
  }

  window.CitydleColors = { update: update, build: build, set: push, legendKey: legendKey, getPart: getPart, setLegendPart: setLegendPart, resetLegendPart: resetLegendPart, DEFAULTS: DEFAULTS };
})();
