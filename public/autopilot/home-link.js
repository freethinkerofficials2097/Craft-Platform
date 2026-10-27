/* HOME page (update 109): a small "AFK Autopilot" button that appears in LIVE mode (and whenever the autopilot is running). */
(function () {
  "use strict";
  var a = document.createElement("a");
  a.href = "/autopilot/"; a.hidden = true;
  a.style.cssText = "position:fixed;right:12px;bottom:12px;z-index:2147482000;font:700 13px/1.2 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;padding:9px 14px;border-radius:999px;color:#fff;text-decoration:none;background:#5b4bd6;box-shadow:0 3px 12px rgba(0,0,0,.35);";
  document.body.appendChild(a);
  function tick() {
    Promise.all([fetch("/api/platform", { cache: "no-store" }).then(function (r) { return r.json(); }), fetch("/api/autopilot", { cache: "no-store" }).then(function (r) { return r.json(); })]).then(function (r) {
      var plat = r[0] || {}, s = (r[1] && r[1].state) || {};
      var show = plat.mode === "live" || s.running;
      a.hidden = !show;
      a.textContent = s.running ? (s.paused ? "🤖 Autopilot PAUSED →" : "🤖 Autopilot RUNNING →") : "🤖 AFK Autopilot →";
      a.style.background = s.running ? (s.paused ? "#b8860b" : "#2e8b4f") : "#5b4bd6";
    }).catch(function () {});
  }
  tick(); setInterval(tick, 5000);
})();
