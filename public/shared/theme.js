/* ==========================================================================
   PLATFORM THEME SYSTEM — apply / persist / wire up <select data-theme-select>
   Shared by the hub and EVERY game, so a theme picked on any one page carries
   over to all the others (stored in localStorage).

   Two kinds of choices live in the same "Appearance" dropdown:
     1. the 6 plain colors (Cream, Sky Blue, Meadow Green, Blossom Pink, Lavender Violet, Honey Gold)
        - defined in /shared/theme.css as [data-theme="..."].
     2. the "Box colors & look" designs (update 120): 15 cute scrapbook looks inspired by the
        BOXDLE cover picture (Strawberry, Lavender, Mint, Peach, Sky, Night, Bubblegum, Lemon, Ocean,
        Cocoa, Sakura, Matcha, Coral, Blueberry, Cotton Candy).
        - each look is ONE palette of 11 colors. For every game except BOXDLE the palette is turned
          into the same --theme-* tokens the plain colors use (so every game picks it up with no
          per-game work) plus a few --look-* extras used by the graph-paper / stitched decoration
          in theme.css. BOXDLE uses the palette directly for its own boxes, tiles and title.
   ========================================================================== */
(function () {
  var PLAIN = ["cream", "blue", "green", "pink", "violet", "honey"];
  var STORAGE_KEY = "platformTheme";

  // key order: page, card, cardBorder, clockBox, gridBox, wordsBox, tile, tileInk, ink, accent, navy
  var KEYS = ["page", "card", "cardBorder", "clockBox", "gridBox", "wordsBox", "tile", "tileInk", "ink", "accent", "navy"];
  var LOOK_DEFS = [
    ["strawberry", "🍓 Strawberry",   "#fbf3e4", "#fff8ec", "#f4a6be", "#ede4fa", "#ffe9ef", "#fff2cf", "#ffffff", "#1f2a5c", "#2b2a4c", "#e8708f", "#1f2a5c"],
    ["lavender",   "💜 Lavender",     "#f4eefc", "#fbf7ff", "#b9a2e8", "#e6dcf7", "#efe6fb", "#fdf1ff", "#ffffff", "#3b2a78", "#33284f", "#8f6fdc", "#3b2a78"],
    ["mint",       "🍃 Mint",         "#eefaf3", "#f8fffb", "#7fcfa3", "#d9f3e6", "#e6f8ef", "#fffbe0", "#ffffff", "#1c5a43", "#25443a", "#33b383", "#1c5a43"],
    ["peach",      "🍑 Peach",        "#fff1e6", "#fffaf5", "#f6b08a", "#ffe3d1", "#fff0e0", "#fff7d6", "#ffffff", "#7a3320", "#4a2e26", "#f0824f", "#7a3320"],
    ["sky",        "☁️ Sky",          "#eaf4ff", "#f8fbff", "#8ec3f0", "#dcecfc", "#e5f1ff", "#fff6d9", "#ffffff", "#1d3f78", "#25365a", "#4a9be0", "#1d3f78"],
    ["night",      "🌙 Night",        "#1b1b3a", "#262650", "#8a7be0", "#303066", "#2b2b5c", "#34305f", "#3b3b78", "#ffffff", "#f1efff", "#ff8fb4", "#ffd6e6"],
    ["bubblegum",  "🍬 Bubblegum",    "#fff0f7", "#fffafd", "#ff8fc4", "#e4f4ff", "#ffe3f1", "#f3ecff", "#ffffff", "#7a1f5c", "#4a2340", "#ff5fa8", "#8a1f66"],
    ["lemon",      "🍋 Lemon Cream",  "#fffbe0", "#fffdf0", "#f0cf4d", "#e7f3d4", "#fff3b8", "#ffeede", "#fffdf5", "#5e4a00", "#4a3f12", "#e6a800", "#6b5300"],
    ["ocean",      "🌊 Ocean",        "#e3f7f6", "#f4fffe", "#4fc1c1", "#cfeef0", "#d6f2f1", "#fff7e0", "#ffffff", "#0b4f5c", "#17434d", "#1fa5ad", "#0b4f5c"],
    ["cocoa",      "🧸 Cocoa Bear",   "#f6ebdf", "#fff8f0", "#c99a72", "#ecd8c4", "#f3e1cd", "#fdf0d2", "#fffaf3", "#5a3520", "#4a3224", "#b8744a", "#5a3520"],
    ["sakura",     "🌸 Sakura",       "#fdeef0", "#fff8f9", "#f3a5b5", "#fbe0e6", "#fde6ea", "#f2f0ff", "#ffffff", "#8a2d48", "#55303a", "#ec7b96", "#8a2d48"],
    ["matcha",     "🍵 Matcha",       "#f0f5e1", "#fafdf0", "#9bbf5a", "#e1edc6", "#e8f2d2", "#fdf6dc", "#ffffff", "#34521a", "#34431f", "#7aa83a", "#34521a"],
    ["coral",      "🧡 Coral Sunset", "#fff0e8", "#fff9f5", "#ff9a7a", "#ffe0d4", "#ffe6da", "#fff3c9", "#ffffff", "#8a2a14", "#55291d", "#ff6b4a", "#8a2a14"],
    ["blueberry",  "🫐 Blueberry",    "#eceefc", "#f8f8ff", "#8b93e6", "#dcdffa", "#e3e6fb", "#f6efff", "#ffffff", "#25306e", "#2a3060", "#5b6bd6", "#25306e"],
    ["cotton",     "🍭 Cotton Candy", "#f3f0ff", "#fcfaff", "#b8a9f0", "#fde0f0", "#e0f0ff", "#e8fff4", "#ffffff", "#4a3a8a", "#3d3566", "#ff8fc8", "#4a3a8a"]
  ];

  var LOOKS = LOOK_DEFS.map(function (d) {
    var c = {};
    for (var i = 0; i < KEYS.length; i++) c[KEYS[i]] = d[i + 2];
    return { id: d[0], theme: "look-" + d[0], name: d[1], c: c };
  });
  var THEMES = PLAIN.concat(LOOKS.map(function (l) { return l.theme; }));

  // the 6 plain colors expressed as the same 11-color palette (BOXDLE uses this so the plain colors work there too)
  var PLAIN_PALETTES = {
    cream:  { page: "#fff3dc", card: "#fffbf2", cardBorder: "#d9be93", clockBox: "#f2e4c8", gridBox: "#f5e3c0", wordsBox: "#fff3dc", tile: "#ffffff", tileInk: "#6b4423", ink: "#5b4636", accent: "#d9a441", navy: "#6b4423" },
    blue:   { page: "#dcf0fa", card: "#f2fafd", cardBorder: "#6fafcb", clockBox: "#dceff7", gridBox: "#b9e0f2", wordsBox: "#dcf0fa", tile: "#ffffff", tileInk: "#1e5c7a", ink: "#5b4636", accent: "#3a9ac4", navy: "#1e5c7a" },
    green:  { page: "#e4f5dc", card: "#f4fbf0", cardBorder: "#6fa867", clockBox: "#ddeed2", gridBox: "#c4e7b4", wordsBox: "#e4f5dc", tile: "#ffffff", tileInk: "#2e5b26", ink: "#5b4636", accent: "#4f9d45", navy: "#2e5b26" },
    pink:   { page: "#fce3ee", card: "#fff6fa", cardBorder: "#d9678d", clockBox: "#fadce7", gridBox: "#f6c0d9", wordsBox: "#fce3ee", tile: "#ffffff", tileInk: "#8e2e52", ink: "#5b4636", accent: "#d9678d", navy: "#8e2e52" },
    violet: { page: "#eee1fa", card: "#f9f4fe", cardBorder: "#9c6fd1", clockBox: "#e9dbf7", gridBox: "#d9bef2", wordsBox: "#eee1fa", tile: "#ffffff", tileInk: "#4e2e78", ink: "#5b4636", accent: "#9c6fd1", navy: "#4e2e78" },
    honey:  { page: "#fdebbd", card: "#fffbef", cardBorder: "#d9a72e", clockBox: "#f7e7be", gridBox: "#fbd57f", wordsBox: "#fdebbd", tile: "#ffffff", tileInk: "#7a5109", ink: "#5b4636", accent: "#d9a72e", navy: "#7a5109" }
  };

  var listeners = [];
  var current = "cream";

  // ---- small color helpers ----
  function hexRgb(h) { var n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function rgbHex(r) { return "#" + r.map(function (v) { return Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0"); }).join(""); }
  function mix(a, b, t) { var x = hexRgb(a), y = hexRgb(b); return rgbHex([0, 1, 2].map(function (i) { return x[i] * (1 - t) + y[i] * t; })); }
  function lum(h) { return hexRgb(h).reduce(function (s, v, i) { v /= 255; v = v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); return s + v * [0.2126, 0.7152, 0.0722][i]; }, 0); }
  function rgba(h, a) { var c = hexRgb(h); return "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + a + ")"; }

  var TOKEN_NAMES = ["--theme-bg-top", "--theme-bg", "--theme-bg-deep", "--theme-card", "--theme-surface-2", "--theme-line", "--theme-deep",
    "--theme-ink", "--theme-ink-soft", "--theme-shadow", "--theme-name", "--look-accent", "--look-grid", "--look-tape1", "--look-tape2", "--look-tile", "--look-tile-ink", "--look-sticker"];

  function findLook(theme) {
    for (var i = 0; i < LOOKS.length; i++) if (LOOKS[i].theme === theme) return LOOKS[i];
    return null;
  }

  function clearLook(root) {
    for (var i = 0; i < TOKEN_NAMES.length; i++) root.style.removeProperty(TOKEN_NAMES[i]);
    root.removeAttribute("data-look");
    root.removeAttribute("data-look-dark");
  }

  function applyLook(root, look) {
    var c = look.c, dark = lum(c.page) < 0.2, s = root.style;
    s.setProperty("--theme-bg-top", dark ? mix(c.page, "#ffffff", 0.06) : mix(c.page, "#ffffff", 0.45));
    s.setProperty("--theme-bg", c.page);
    s.setProperty("--theme-bg-deep", dark ? mix(c.page, "#000000", 0.25) : mix(c.page, c.cardBorder, 0.3));
    s.setProperty("--theme-card", c.card);
    s.setProperty("--theme-surface-2", c.clockBox);
    s.setProperty("--theme-line", c.cardBorder);
    s.setProperty("--theme-deep", c.navy);
    s.setProperty("--theme-ink", c.ink);
    s.setProperty("--theme-ink-soft", mix(c.ink, c.card, 0.42));
    s.setProperty("--theme-shadow", dark ? "rgba(0,0,0,.45)" : rgba(c.navy, 0.2));
    s.setProperty("--theme-name", '"' + look.name.replace(/^\S+\s/, "") + '"');
    s.setProperty("--look-accent", c.accent);
    s.setProperty("--look-grid", dark ? "rgba(255,255,255,.06)" : rgba(c.accent, 0.13));
    s.setProperty("--look-tape1", rgba(c.accent, 0.45));
    s.setProperty("--look-tape2", rgba(mix(c.accent, "#a78be0", 0.55), 0.45));
    s.setProperty("--look-tile", c.tile);
    s.setProperty("--look-tile-ink", c.tileInk);
    s.setProperty("--look-sticker", dark ? c.page : "#ffffff");
    root.setAttribute("data-look", look.id);
    if (dark) root.setAttribute("data-look-dark", "1"); else root.removeAttribute("data-look-dark");
  }

  // the cute rounded fonts (Fredoka / Quicksand) are only fetched while a look is active
  function ensureLookFonts() {
    if (document.getElementById("look-fonts") || !document.head) return;
    var l = document.createElement("link");
    l.id = "look-fonts"; l.rel = "stylesheet";
    l.href = "https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600;700&family=Quicksand:wght@500;600;700&display=swap";
    document.head.appendChild(l);
  }

  function readSaved() {
    try {
      var v = localStorage.getItem(STORAGE_KEY);
      return THEMES.indexOf(v) !== -1 ? v : "cream";
    } catch (e) {
      return "cream";
    }
  }

  function apply(theme, opts) {
    if (THEMES.indexOf(theme) === -1) theme = "cream";
    var root = document.documentElement;
    current = theme;
    root.setAttribute("data-theme", theme);
    var look = findLook(theme);
    if (look) { applyLook(root, look); if (document.head) ensureLookFonts(); else document.addEventListener("DOMContentLoaded", ensureLookFonts); } else clearLook(root);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch (e) {}
    var selects = document.querySelectorAll("[data-theme-select]");
    for (var i = 0; i < selects.length; i++) {
      if (selects[i].value !== theme) selects[i].value = theme;
    }
    if (!(opts && opts.silent)) {
      for (var j = 0; j < listeners.length; j++) {
        try { listeners[j](theme); } catch (e) {}
      }
    }
  }

  // Apply immediately (before DOMContentLoaded) so there's no flash of the
  // wrong theme on load.
  apply(readSaved(), { silent: true });

  // Every Appearance dropdown gets the "Box colors & look" designs added under the 6 plain colors.
  function addLookOptions(sel) {
    if (sel.querySelector("optgroup[data-box-looks]")) return;
    var plainGroup = document.createElement("optgroup");
    plainGroup.label = "Plain colors";
    var opts = Array.prototype.slice.call(sel.querySelectorAll(":scope > option"));
    opts.forEach(function (o) { plainGroup.appendChild(o); });
    sel.appendChild(plainGroup);
    var g = document.createElement("optgroup");
    g.label = "🧸 Box colors & looks";
    g.setAttribute("data-box-looks", "1");
    LOOKS.forEach(function (l) {
      var o = document.createElement("option");
      o.value = l.theme;
      o.textContent = l.name;
      g.appendChild(o);
    });
    sel.appendChild(g);
  }

  function wireSelects() {
    var selects = document.querySelectorAll("[data-theme-select]");
    for (var i = 0; i < selects.length; i++) {
      addLookOptions(selects[i]);
      selects[i].value = current;
      selects[i].addEventListener("change", function (e) {
        apply(e.target.value);
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", wireSelects);
  } else {
    wireSelects();
  }

  window.PlatformTheme = {
    apply: apply,
    themes: THEMES,
    plain: PLAIN,
    looks: LOOKS,
    keys: KEYS,
    current: function () { return current; },
    onChange: function (fn) { listeners.push(fn); },
    // the 11-color palette of any theme (a look, or one of the 6 plain colors) - BOXDLE paints its boxes with it
    palette: function (theme) {
      var l = findLook(theme);
      if (l) return Object.assign({}, l.c);
      return Object.assign({}, PLAIN_PALETTES[theme] || PLAIN_PALETTES.cream);
    },
    isLook: function (theme) { return !!findLook(theme); },
    mix: mix, lum: lum, rgba: rgba
  };
})();
