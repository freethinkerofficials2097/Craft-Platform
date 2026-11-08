/* fit-travle.js (update 131) - the globe is the one flexible part of TRAVLE: it gets exactly the height that is left
   after the route card, live feed and host dock, so nothing is cut off and the page never scrolls. */
(function () {
  "use strict";
  var MIN = 120, queued = false;
  function fit() {
    queued = false;
    var board = document.querySelector("main.board"), card = document.getElementById("globeCard"), wrap = document.getElementById("globeWrap");
    if (!board || !card || !wrap || wrap.classList.contains("expanded")) return;
    // offsetHeight / clientHeight are all in the same (un-zoomed) units, so this keeps working while fit-screen zooms the page
    var cs = getComputedStyle(board);
    var padV = (parseFloat(cs.paddingTop) || 0) + (parseFloat(cs.paddingBottom) || 0);
    var gap = parseFloat(cs.rowGap || cs.gap) || 0;
    var kids = Array.prototype.filter.call(board.children, function (c) { return c.offsetParent !== null || getComputedStyle(c).position === "fixed"; });
    var others = 0;
    kids.forEach(function (c) { if (c !== card) others += c.offsetHeight; });
    var chrome = card.offsetHeight - wrap.offsetHeight;
    var avail = board.clientHeight - padV - others - gap * (kids.length - 1) - chrome;
    var maxW = Math.min((document.documentElement.clientWidth / (parseFloat(document.documentElement.style.getPropertyValue("--fs-zoom")) || 1)) - 36, 640);
    var size = Math.max(MIN, Math.min(Math.floor(avail), maxW));
    var cur = parseFloat((document.documentElement.style.getPropertyValue("--globe-size") || "").replace("px", ""));
    if (cur === size) return;
    document.documentElement.style.setProperty("--globe-size", size + "px");
    if (window.Globe && window.Globe.isReady && window.Globe.isReady()) requestAnimationFrame(function () { window.Globe.resize(); });
  }
  window.__fitScreenPre = fit;   // fit-screen.js calls this (synchronously) every time it tries a new zoom
  function schedule() { if (queued) return; queued = true; requestAnimationFrame(fit); }
  function start() {
    schedule();
    window.addEventListener("resize", schedule);
    window.addEventListener("orientationchange", function () { setTimeout(schedule, 250); });
    window.addEventListener("load", schedule);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(schedule);
    if (window.ResizeObserver) {
      var ro = new ResizeObserver(schedule);
      ["routeOptimal", "routeYours", "feedCard", "hintChips"].forEach(function (id) { var e = document.getElementById(id); if (e) ro.observe(e); });
      var dock = document.querySelector(".host-dock"); if (dock) ro.observe(dock);
      var tb = document.querySelector(".topbar"); if (tb) ro.observe(tb);
      var rc = document.querySelector(".route-card"); if (rc) ro.observe(rc);
    }
    if (window.MutationObserver) {
      var board = document.querySelector("main.board");
      if (board) new MutationObserver(schedule).observe(board, { childList: true, subtree: true, attributes: true, attributeFilter: ["hidden", "class"] });
    }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
