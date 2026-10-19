/* ==========================================================================
   WORD LENGTH PANEL - settings schema (update 90)
   ONE list of every setting (type, range, default), used by BOTH the browser
   (public/shared/length-panel.js) and the server (server/shared/length-panel-hub.js),
   so the two can never disagree about what is allowed.

   Types: bool | int (min..max, step) | enum (list) | color ("" = automatic) | text (max characters)
   ========================================================================== */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.LengthPanelSchema = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var FONTS = ["default", "rounded", "grotesk", "serif", "mono", "script"];
  var POSITIONS = ["top", "belowLegend", "aboveBoard", "aboveKeyboard", "belowBoard"];

  var FIELDS = {
    // --- show / hide ---
    show:         { t: "bool", d: true },                  // the panel is shown (the master switch)
    showIdle:     { t: "bool", d: false },                 // also show it before a round has started
    toolbarBtn:   { t: "bool", d: true },                  // quick show / hide button in the top toolbar
    // --- texts ---
    title:        { t: "text", d: "Word length", max: 40 },
    fixedText:    { t: "text", d: "{length} letters", max: 160 },
    randomText:   { t: "text", d: "Random: {range}", max: 160 },
    icon:         { t: "text", d: "", max: 4 },             // an emoji / symbol in front of the text
    randomShows:  { t: "enum", d: "range", list: ["range", "exact"] },   // random length: the range, or the round's exact length
    // --- layout ---
    position:     { t: "enum", d: "top", list: POSITIONS },
    align:        { t: "enum", d: "center", list: ["left", "center", "right"] },
    rows:         { t: "int", d: 1, min: 1, max: 8, step: 1 },
    widthPct:     { t: "int", d: 100, min: 20, max: 100, step: 5 },
    // --- text ---
    size:         { t: "int", d: 100, min: 40, max: 300, step: 5 },        // % of the normal size
    numSize:      { t: "int", d: 130, min: 60, max: 300, step: 5 },        // % of the text size, for the numbers
    titleSize:    { t: "int", d: 76, min: 40, max: 200, step: 2 },         // % of the text size, for the title
    titleCase:    { t: "enum", d: "upper", list: ["upper", "normal"] },
    weight:       { t: "enum", d: "heavy", list: ["normal", "bold", "heavy"] },
    font:         { t: "enum", d: "default", list: FONTS },
    spacing:      { t: "int", d: 0, min: -2, max: 12, step: 1 },           // px between letters
    lineGap:      { t: "int", d: 3, min: 0, max: 40, step: 1 },            // px between rows
    partGap:      { t: "int", d: 10, min: 0, max: 60, step: 1 },           // px beside each divider
    divider:      { t: "enum", d: "line", list: ["line", "dot", "slash", "dash", "none"] },
    // --- box ---
    box:          { t: "bool", d: true },                  // draw the box (background + border)
    radius:       { t: "int", d: 12, min: 0, max: 60, step: 1 },
    bw:           { t: "int", d: 1, min: 0, max: 10, step: 1 },
    borderStyle:  { t: "enum", d: "solid", list: ["solid", "dashed", "dotted", "double"] },
    padX:         { t: "int", d: 12, min: 0, max: 60, step: 1 },
    padY:         { t: "int", d: 7, min: 0, max: 40, step: 1 },
    marginTop:    { t: "int", d: 2, min: 0, max: 60, step: 1 },
    marginBottom: { t: "int", d: 8, min: 0, max: 60, step: 1 },
    shadow:       { t: "int", d: 0, min: 0, max: 3, step: 1 },
    opacity:      { t: "int", d: 100, min: 20, max: 100, step: 5 },        // whole panel
    bgOpacity:    { t: "int", d: 100, min: 0, max: 100, step: 5 },         // only used with a custom background color
    // --- colors ("" = automatic: follows the theme) ---
    bg:           { t: "color", d: "" },
    border:       { t: "color", d: "" },
    ink:          { t: "color", d: "" },
    titleInk:     { t: "color", d: "" },
    numInk:       { t: "color", d: "" },
    // --- motion ---
    animate:      { t: "bool", d: false }                  // a short pop whenever the text changes (new round)
  };

  function defaults() {
    var o = {};
    for (var k in FIELDS) o[k] = FIELDS[k].d;
    return o;
  }

  /** Takes ANY object and returns a complete, valid settings object (unknown / broken values fall back). */
  function normalize(raw) {
    var out = defaults();
    if (!raw || typeof raw !== "object") return out;
    for (var k in FIELDS) {
      var f = FIELDS[k], v = raw[k];
      if (v === undefined || v === null) continue;
      if (f.t === "bool") { if (typeof v === "boolean") out[k] = v; }
      else if (f.t === "int") {
        var n = Number(v);
        if (v !== "" && isFinite(n)) out[k] = Math.min(f.max, Math.max(f.min, Math.round(n)));
      } else if (f.t === "enum") { if (f.list.indexOf(v) >= 0) out[k] = v; }
      else if (f.t === "color") {
        if (typeof v === "string") { var c = v.trim(); if (c === "") out[k] = ""; else if (/^#[0-9a-fA-F]{6}$/.test(c)) out[k] = c.toLowerCase(); }
      } else if (f.t === "text") {
        if (typeof v === "string") out[k] = v.replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, f.max);
      }
    }
    return out;
  }

  /** Same, but for a partial patch: only the valid keys that were really sent are returned. */
  function cleanPatch(raw) {
    var out = {};
    if (!raw || typeof raw !== "object") return out;
    var full = normalize(raw);
    for (var k in FIELDS) if (raw[k] !== undefined && raw[k] !== null) out[k] = full[k];
    return out;
  }

  /** Ready-made looks. Each one is a partial settings object laid over the defaults. */
  var PRESETS = [
    { id: "classic", name: "Classic", patch: {} },
    { id: "minimal", name: "Minimal", patch: { box: false, bw: 0, size: 110, divider: "dot", padX: 0, titleCase: "normal" } },
    { id: "badge", name: "Big badge", patch: { size: 170, numSize: 150, rows: 1, radius: 40, bw: 3, padY: 10, padX: 22, weight: "heavy", shadow: 2 } },
    { id: "neon", name: "Neon", patch: { bg: "#0b0b1a", border: "#39ffd0", ink: "#d9fff6", titleInk: "#39ffd0", numInk: "#ffffff", bw: 2, radius: 14, shadow: 3, font: "mono" } },
    { id: "soft", name: "Soft pill", patch: { radius: 60, bw: 0, bg: "#ffe9b8", ink: "#4a3410", titleInk: "#8a5a10", numInk: "#4a3410", shadow: 1, font: "rounded", padX: 24 } },
    { id: "dark", name: "Dark card", patch: { bg: "#1b1f2a", border: "#3a4256", ink: "#f4f1ea", titleInk: "#9fb0d0", numInk: "#ffd166", radius: 10, bw: 1, shadow: 1 } },
    { id: "ticket", name: "Dashed ticket", patch: { borderStyle: "dashed", bw: 2, radius: 6, divider: "slash", font: "mono", titleCase: "upper" } },
    { id: "stream", name: "Big for stream", patch: { size: 220, numSize: 140, rows: 1, padY: 12, padX: 24, weight: "heavy", shadow: 1 } }
  ];

  return { FIELDS: FIELDS, FONTS: FONTS, POSITIONS: POSITIONS, PRESETS: PRESETS, defaults: defaults, normalize: normalize, cleanPatch: cleanPatch };
});
