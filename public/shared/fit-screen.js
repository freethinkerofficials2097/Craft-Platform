/* fit-screen.js (update 131, safety nets added in update 132) - see fit-screen.css. Makes the game one screen without scrolling.
   Only ever SHRINKS the game (CSS zoom, crisp text) when the screen is too small for everything at full size.
   It starts from full size again only when the window size / rotation changes. No jumping up and down. */
(function () {
  "use strict";
  var doc = document.documentElement;
  var MIN_ZOOM = 0.7;      // never smaller than this (text stays readable)
  var STEP = 0.02;
  var GROW_MARGIN = 40;   // extra px of spare list height needed before the game is allowed to grow back
  var MIN_LIST = 130;      // px (at the current zoom) the guess list must keep when it is empty / has one row
  var MIN_LIST_ROWS = 175; // update 132: ...and when it holds guesses it must show about 3 rows, not 2 half rows
  var app = null, list = null, card = null, zoom = 1, lastW = 0, lastH = 0, queued = false, timer = null, observer = null;
  doc.classList.add("fs");

  function setZoom(z) {
    zoom = Math.max(MIN_ZOOM, Math.min(1, z));
    doc.style.setProperty("--fs-zoom", String(zoom));
  }
  var compact = 0;
  /* update 137: ONE banner size for every game. The title banner (tagline hidden, tighter gaps) used to switch on and off depending on
     how much each game had on screen, so one game had a big banner and the next a small one. Now it depends only on the screen height:
     every phone-sized screen gets the same compact banner in every game; tall screens (desktop / tablet) keep the full banner. */
  function baseCompact() { return window.innerHeight < 1000 ? 2 : 0; }
  function setCompact(n) {
    n = Math.max(n, baseCompact());
    compact = n;
    doc.classList.toggle("fs-compact", n >= 1);
    doc.classList.toggle("fs-compact2", n >= 2);
  }
  /* update 134: RE-SIZE THE TILES WHEN THE ZOOM CHANGES. Every game works out its tile size from the width of its guess list at the
     moment a guess is drawn. fit-screen changes the zoom AFTER that, so the list suddenly became wider (in game pixels) and the
     rows stayed small, leaving a blank strip beside them (small tiles, sometimes medium, sometimes big, depending on when the guess
     was drawn). Every game already redraws its tiles on a window "resize", so one resize event after the zoom settles is enough. */
  var tilesZoom = 1, retileQueued = false;
  function retile() {
    if (Math.abs(zoom - tilesZoom) < 0.001 || retileQueued) return;
    retileQueued = true;
    requestAnimationFrame(function () {
      retileQueued = false;
      if (Math.abs(zoom - tilesZoom) < 0.001) return;
      tilesZoom = zoom;
      try { window.dispatchEvent(new Event("resize")); } catch (e) {}
      fitRows();
    });
  }
  /* update 134: the games ask "how much height may a tile row use?" with a guess (window height - list top - 230) that is wrong whenever
     the page is zoomed or the legend / keyboard are tall (it came out at 150px and made the tiles small). In the one-screen layout the
     list's REAL height is known, so the answer is taken from it. (Only the games that have this helper are affected.) */
  function patchTileHeight() {
    if (window.__fsTileHeightPatched || typeof window.computeAvailableTilesHeight !== "function") return;
    window.__fsTileHeightPatched = true;
    var orig = window.computeAvailableTilesHeight;
    window.computeAvailableTilesHeight = function () {
      try {
        var box = list || document.getElementById("tilesWrap");
        if (doc.classList.contains("fs") && !doc.classList.contains(SCROLL_CLS) && box && box.offsetParent !== null && box.clientHeight > 60) {
          return Math.max(80, box.clientHeight - 16);
        }
      } catch (e) {}
      return orig.apply(this, arguments);
    };
  }
  function setVh() { doc.style.setProperty("--fs-vh", window.innerHeight + "px"); }
  function minList() {
    var b = list && list.parentNode && list.parentNode.classList && list.parentNode.classList.contains("fxBoard") ? list : list;
    return b && b.children && b.children.length >= 2 ? MIN_LIST_ROWS : MIN_LIST;
  }
  function overflowing() {
    if (!app) return false;
    if (window.__fitScreenPre) window.__fitScreenPre();   // (TRAVLE) let the globe take / give back its share first
    if (app.scrollHeight > app.clientHeight + 1) return true;
    // the card that holds legend + keyboard + guess list must hold ALL of them (it clips instead of scrolling)
    if (card && card.scrollHeight > card.clientHeight + 1) return true;
    var box = list && list.parentNode && list.parentNode.classList && list.parentNode.classList.contains("fxBoard") ? list.parentNode : list;
    if (box && box.offsetParent !== null && box.clientHeight < minList() - 1) return true;
    return false;
  }
  var SCROLL_CLS = "fs-scroll";
  function fit(fromFull) {
    queued = false;
    app = app || document.querySelector(".app") || document.getElementById("app");
    if (!app) return;
    list = list || app.querySelector(".tilesWrap") || app.querySelector(".round-card > .grid") || app.querySelector(".board-section > #board") || app.querySelector("#game > .board > .guess-list");
    card = card || app.querySelector(".round-card") || app.querySelector(".board-section") || app.querySelector("main.board") || app.querySelector("#game");
    setVh();
    // update 132: measure in "one screen" mode every time (the scroll fallback below is switched off for the measurement,
    // then switched back on in the same frame if the game still does not fit - the user never sees the switch).
    var y = window.pageYOffset || 0, wasScroll = doc.classList.contains(SCROLL_CLS);
    if (wasScroll) doc.classList.remove(SCROLL_CLS);
    if (fromFull) { setZoom(1); setCompact(0); }   // (setCompact never goes below the screen's base level)
    var guard = 0;
    // update 134: first trim dead space (level 1: tighter gaps / smaller message slot; level 2: also the banner's description line),
    // and only then shrink the whole game. Bigger, steadier tiles and text on small phones.
    if (zoom >= 1 && overflowing()) { setCompact(1); if (overflowing()) setCompact(2); }
    while (overflowing() && zoom > MIN_ZOOM + 0.0001 && guard++ < 40) setZoom(zoom - STEP);
    // update 132: even at the smallest zoom it does not fit -> NEVER clip it: let the page scroll like a normal page.
    var stillTooBig = overflowing();
    if (stillTooBig) doc.classList.add(SCROLL_CLS);
    if (wasScroll && stillTooBig && y) window.scrollTo(0, y);
    if (zoom < 1 || compact > baseCompact()) scheduleGrow();
    fitRows();
    retile();
  }
  /* update 132: ROW FIT. Every game works out its tile size ONCE (from the width it measured at that moment) and keeps it
     until the next guess. If the width changes afterwards (a scrollbar appears, the zoom changes, the phone turns, fonts
     load) the last tile of a long word used to be cut off. Here every guess row is measured again after each change and,
     only if it is wider than its box, shrunk (CSS zoom, crisp) until it fits. Rows that already fit are never touched. */
  function rowsOf(box) {
    if (!box) return [];
    var kids = box.children, out = [];
    for (var i = 0; i < kids.length; i++) out.push(kids[i]);
    return out;
  }
  var fitRowsBusy = false;
  /* update 137: ONE TILE-SIZE RULE FOR EVERY GAME.
     Each game used to work out its own tile size (some capped tiles at about 30px "as if the word had 17 letters", some used 40px,
     some 60px), so the same 5-letter word looked small in one game, medium in the next and big in the third, with a blank strip beside
     the rows. Now, after a game has drawn its guess rows, rows that are narrower than the box are scaled UP (CSS zoom, crisp text)
     until they fill the box width - but never beyond MAX_ROW_H px tall (so a 5-letter word gets about 52px tiles, a 10-letter word
     about 30px) and never so much that fewer than about 2.5 rows would stay visible. Rows that already fill the box (cards, pills, bars)
     are left alone. Hosts who chose their own sizes in Settings > Customize keep their choice (no automatic growing). */
  var MAX_ROW_H = 58;
  var MIN_VISIBLE_ROWS = 2.5;
  var customChecked = 0, customVal = false;
  function hostCustomised() {
    var now = Date.now();
    if (now - customChecked < 1500) return customVal;
    customChecked = now; customVal = false;
    try {
      var game = (document.body && document.body.getAttribute("data-game")) || "";
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (!k || k.indexOf("craft.custom.") !== 0) continue;
        if (k.slice(-2) !== "__" && game && k.slice(-(game.length + 1)) !== "." + game && k.slice(-5) !== "__all") continue;
        var j = JSON.parse(localStorage.getItem(k) || "{}");
        if ((j.tiles && Object.keys(j.tiles).length) || (j.size && (j.size.board || j.size.tiles))) { customVal = true; break; }
      }
    } catch (e) {}
    return customVal;
  }
  function unionWidth(row) {      // width of what is really inside the row (same pixels as getBoundingClientRect)
    try {
      var rg = document.createRange(); rg.selectNodeContents(row);
      var b = rg.getBoundingClientRect(); return b ? b.width : 0;
    } catch (e) { return 0; }
  }
  function fitRows() {
    var box = list;
    if (!box || fitRowsBusy) return;
    fitRowsBusy = true;
    try {
      var avail = box.clientWidth;
      if (!avail) return;
      var cs = window.getComputedStyle(box);
      avail -= (parseFloat(cs.paddingLeft) || 0) + (parseFloat(cs.paddingRight) || 0);
      var rows = rowsOf(box), i, r;
      // 1. natural size of every row; shrink the ones that are too wide
      for (i = 0; i < rows.length; i++) {
        r = rows[i];
        if (r.style.zoom) r.style.zoom = "";           // measure at natural size
        var need = r.scrollWidth;
        if (need > avail + 1) r.style.zoom = String(Math.max(0.4, Math.floor((avail / need) * 1000) / 1000));
      }
      // 2. grow tile rows that are narrower than the box (one common factor, so every row of the list has the same size)
      if (hostCustomised() || !rows.length || doc.classList.contains(SCROLL_CLS)) return;
      var boxRect = box.getBoundingClientRect();
      if (!boxRect.width || !box.clientWidth) return;
      var k = boxRect.width / box.clientWidth;           // layout px -> screen px (page zoom)
      var maxUnion = 0, maxH = 0, shrunk = false;
      for (i = 0; i < rows.length; i++) {
        r = rows[i];
        if (r.style.zoom) { shrunk = true; break; }
        var u = unionWidth(r), h = r.getBoundingClientRect().height;
        if (u > maxUnion) maxUnion = u;
        if (h > maxH) maxH = h;
      }
      if (shrunk || !maxUnion || !maxH) return;
      var rowLayoutH = maxH / k, unionLayout = maxUnion / k;
      if (unionLayout > avail - 4) return;                // already fills the box (cards, pills, bars, long words)
      var f = Math.min(avail / unionLayout, MAX_ROW_H / rowLayoutH, 2.4);
      var listH = box.clientHeight - ((parseFloat(cs.paddingTop) || 0) + (parseFloat(cs.paddingBottom) || 0));
      if (listH > 80) f = Math.min(f, Math.max(1, listH / (MIN_VISIBLE_ROWS * rowLayoutH)));
      f = Math.floor(f * 100) / 100;
      if (f < 1.05) return;
      for (i = 0; i < rows.length; i++) rows[i].style.zoom = String(f);
    } finally {
      fitRowsBusy = false;
      if (observer && observer.takeRecords) observer.takeRecords();   // our own style writes must not trigger another fit
    }
  }
  // Grow back (after something big - a panel, a banner - went away). Only when there is CLEAR spare room (the guess
  // list would still keep MIN_LIST + GROW_MARGIN px at the bigger size), so the size can never bounce up and down.
  var growTimer = 0;
  function listBox() {
    return list && list.parentNode && list.parentNode.classList && list.parentNode.classList.contains("fxBoard") ? list.parentNode : list;
  }
  function scheduleGrow() {
    if (growTimer) return;
    growTimer = setTimeout(function () { growTimer = 0; grow(); }, 1800);
  }
  function grow() {
    if (!app || (zoom >= 1 && compact <= baseCompact())) return;
    // update 132: measure in one-screen mode (the scroll fallback is switched off for the measurement and back on if still needed)
    var y = window.pageYOffset || 0, wasScroll = doc.classList.contains(SCROLL_CLS);
    if (wasScroll) doc.classList.remove(SCROLL_CLS);
    var start = zoom, ok = zoom, guard = 0;
    while (ok < 1 && guard++ < 40) {
      setZoom(ok + STEP);
      var box = listBox();
      var roomy = !overflowing() && (!box || box.offsetParent === null || box.clientHeight >= minList() + GROW_MARGIN);
      if (!roomy) break;
      ok = zoom;
    }
    setZoom(ok);
    if (ok >= 1 && compact > baseCompact()) {           // full size again: see whether the trimmed dead space can come back
      var back = compact;
      for (var lv = compact - 1; lv >= baseCompact(); lv--) {
        setCompact(lv);
        var bx = listBox();
        if (overflowing() || (bx && bx.offsetParent !== null && bx.clientHeight < minList() + GROW_MARGIN)) { setCompact(lv + 1); break; }
      }
    }
    if (overflowing() || (listBox() && listBox().offsetParent !== null && listBox().clientHeight < minList() - 1)) doc.classList.add(SCROLL_CLS);
    if (wasScroll && y) window.scrollTo(0, y);
    if (ok < 1 && ok !== start) scheduleGrow();
    fitRows();
    retile();
  }
  function schedule(fromFull) {
    if (fromFull) { lastW = -1; }
    if (queued) return;
    queued = true;
    requestAnimationFrame(function () { fit(fromFull === true); });
  }
  function onResize() {
    var w = window.innerWidth, h = window.innerHeight;
    if (Math.abs(w - lastW) < 1 && Math.abs(h - lastH) < 1) return;
    lastW = w; lastH = h;
    clearTimeout(timer);
    timer = setTimeout(function () { schedule(true); }, 80);
  }
  function start() {
    app = document.querySelector(".app") || document.getElementById("app");
    if (!app) return;
    lastW = window.innerWidth; lastH = window.innerHeight;
    patchTileHeight();
    setCompact(0);
    fit(true);
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", function () { setTimeout(onResize, 200); });
    if (window.visualViewport) window.visualViewport.addEventListener("resize", onResize);
    // anything inside the game that appears / disappears / changes size (legend, hint chips, banners, host bar...)
    if (window.MutationObserver) {
      observer = new MutationObserver(function () { if (observer._t) return; observer._t = setTimeout(function () { observer._t = 0; schedule(false); }, 120); });
      observer.observe(app, { childList: true, subtree: true, attributes: true, attributeFilter: ["hidden", "class", "style"] });
    }
    // update 132: re-fit the rows whenever the guess list gets a different width or gets new rows
    list = list || app.querySelector(".tilesWrap") || app.querySelector(".round-card > .grid") || app.querySelector(".board-section > #board") || app.querySelector("#game > .board > .guess-list");
    if (list) {
      var rowQueued = false, rowSched = function () { if (rowQueued) return; rowQueued = true; requestAnimationFrame(function () { rowQueued = false; fitRows(); }); };
      if (window.ResizeObserver) { try { new ResizeObserver(rowSched).observe(list); } catch (e) {} }
      if (window.MutationObserver) { try { new MutationObserver(rowSched).observe(list, { childList: true }); } catch (e) {} }
    }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { schedule(true); });
    window.addEventListener("load", function () { schedule(true); });
    window.__fitScreen = { refit: function () { schedule(true); }, zoom: function () { return zoom; } };
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
