/* ==========================================================================
   CRAFT SETTINGS WORKSPACE  (update 58)
   One shared, professional Settings screen for all 14 games.

   Instead of a long side drawer, the game's existing settings are re-arranged into a centred
   workspace:  category sidebar  |  cards (one per feature, each with a title, a plain-language
   description and a badge saying whether it "Applies instantly" or "Needs Apply")  |  sticky
   footer with the connection status and the Apply button.  A search box filters every card.

   Nothing is rebuilt: the game's own controls (with their ids and listeners) are MOVED into the
   cards, and the game's own open/close code keeps driving it - this script only watches whether
   the original panel is open and shows the workspace instead.  If anything goes wrong the
   original panel is left alone, so settings can never become unreachable.

   API:  CraftSettings.open()   CraftSettings.close()   CraftSettings.goTo("hints")
   ========================================================================== */
(function () {
  "use strict";
  if (window.CraftSettings) return;

  /* ------------------------------------------------------------------ categories */
  var CATS = [
    { id: "play",    icon: "🎮", label: "Gameplay",        help: "How rounds are set up and played" },
    { id: "hints",   icon: "💡", label: "Hints",           help: "Which hints the host can give, and how often" },
    { id: "connect", icon: "📡", label: "Connection",      help: "TikTok LIVE link, mode and diagnostics" },
    { id: "look",    icon: "🎨", label: "Look & sound",    help: "Colours, fonts and audio" },
    { id: "scores",  icon: "🏆", label: "Scores & feedback", help: "Leaderboards, celebrations and messages" },
    { id: "tools",   icon: "🧰", label: "Live tools",      help: "Polls, alerts and host messages for your stream" }
  ];
  var CAT_RULES = [
    ["hints",   /^hints?\b/i],
    ["tools",   /live event|host say|^tools?$/i],
    ["connect", /tiktok|connect|^mode\b|game mode|diagnos|connection|status/i],
    ["look",    /appearance|theme|title font|colou?r shades|card design|word length panel|wave panel|city colors|^font|sound|audio|symbols? (look|style)/i],
    ["scores",  /score|leaderboard|celebration|rejection|reveal\s*&|winner/i]
  ];
  var ICONS = [
    [/appearance|theme/i, "🎨"], [/title font|^font/i, "🔤"], [/shades/i, "🌈"], [/card design/i, "🃏"], [/word length panel/i, "🔡"], [/wave panel/i, "🌊"], [/city colors/i, "🎨"], [/sound|audio/i, "🔊"],
    [/tiktok|connect/i, "📡"], [/^mode|game mode/i, "🧭"], [/diagnos/i, "🩺"],
    [/word length|trail length/i, "📏"], [/difficulty/i, "🎚️"], [/language/i, "🌐"], [/auto-?continue|between rounds|next round|timing|round (length|clock|setup)/i, "⏱️"],
    [/starter/i, "🎲"], [/strict/i, "🎯"], [/auto-?colou?r/i, "⌨️"], [/symbol/i, "🔣"], [/length hints/i, "🔢"], [/blur/i, "🌫️"],
    [/celebration|reveal/i, "🎉"], [/rejection/i, "💬"], [/score|leaderboard/i, "🏆"], [/hints?/i, "💡"],
    [/live event/i, "📊"], [/host say/i, "🎙️"], [/round control|round controls/i, "🕹️"]
  ];
  // features that only take effect after the host presses Apply (only used on games that have an Apply button)
  var NEEDS_APPLY = /word length(?! panel)|difficulty|auto-?continue|symbols|length hints|trail length|round (length|setup|timing)|rounds? &|timing|round clock|flag blur/i;

  /* ------------------------------------------------------------------ helpers */
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function mk(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]; }); }
  function clean(t) { return String(t || "").replace(/\s+/g, " ").replace(/[—–-]\s*(tap|applies|only|used).*$/i, "").trim(); }
  function ownText(el) { // text of a heading without nested spans/buttons
    var s = ""; for (var i = 0; i < el.childNodes.length; i++) if (el.childNodes[i].nodeType === 3) s += el.childNodes[i].textContent;
    return clean(s) || clean(el.textContent);
  }
  function catFor(title) { for (var i = 0; i < CAT_RULES.length; i++) if (CAT_RULES[i][1].test(title)) return CAT_RULES[i][0]; return "play"; }
  function iconFor(title) { for (var i = 0; i < ICONS.length; i++) if (ICONS[i][0].test(title)) return ICONS[i][1]; return "⚙️"; }
  function isNote(n) { return n.nodeType === 1 && /(^|\s)(sectionNote|field-note|settings-note|mini-note)(\s|$)/.test(n.className || ""); }

  /* ------------------------------------------------------------------ adapters: where is this game's settings panel? */
  var ADAPTERS = [
    { // the 9 letter-word games + Twistle
      name: "word", overlay: "#settingsOverlay", body: ".drawer", close: "#closeSettings", btn: "#settingsBtn", apply: "#applyBtn",
      isOpen: function (o) { return !o.hidden; }, mode: "sections", sectionSel: ":scope > .drawerSection", chipsSel: ":scope > .statusChips",
      titleSel: "h4", gameTitle: "Settings"
    },
    { // Flagle
      name: "flagle", overlay: "#settings-overlay", body: ".settingsBody", close: "#settings-close", btn: "#settings-btn", apply: "#settings-apply", applyNote: "#settings-status",
      isOpen: function (o) { return !o.hidden; }, mode: "flow", headSel: "h4.settings-subhead", untitled: ["Round timing & flag blur"], gameTitle: "Host settings"
    },
    { // Travle
      name: "travle", overlay: "#settingsDrawer", body: ".drawer-body", close: "#closeSettings", btn: "#settingsBtn", apply: "#applySettingsBtn", applyNote: "#applyNote",
      isOpen: function (o) { return o.classList.contains("open"); }, mode: "flow", headSel: "h3.drawer-subhead", chipsSel: ".status-card",
      untitled: ["Rounds & mode"], gameTitle: "Settings"
    },
    { // Findle
      name: "findle", overlay: "#drawer", body: "#drawer", close: "#closeDrawerBtn", btn: "#settingsBtn", apply: "#saveSettingsBtn",
      isOpen: function (o) { return o.classList.contains("open"); }, mode: "flow", headSel: "h2", skip: ".drawer-handle, .drawer-close", untitled: ["Settings"], gameTitle: "Settings"
    },
    { // Crossdle
      name: "crossdle", overlay: "#hostPanelOverlay", body: ".host-cards", close: "#hostPanelClose", btn: "#hostFab",
      isOpen: function (o) { return !o.classList.contains("hidden"); }, mode: "sections", sectionSel: ":scope > .host-card", titleSel: ".host-card-title", gameTitle: "Host controls"
    }
  ];

  var S = { ad: null, overlay: null, root: null, win: null, nav: null, main: null, foot: null, panes: {}, cards: [], applyProxy: null, built: false, open: false, active: "play", search: "" };

  /* ------------------------------------------------------------------ extraction */
  function titleOfSection(el, ad) {
    if (el.hasAttribute && el.hasAttribute("data-hint-settings")) return "Hints";
    var h = ad.titleSel ? $(ad.titleSel, el) : null;
    if (h && h.parentNode === el) { var t = ownText(h); if (t) return t; }
    var l = $(".switchLabel, .switch-label span:last-child, .fieldLabel, label", el);
    if (l) { var x = clean(l.textContent); if (x) return x.length > 38 ? x.slice(0, 36) + "…" : x; }
    return "Settings";
  }

  function extract(ad, overlay) {
    var bodyEl = ad.body === ad.overlay ? overlay : $(ad.body, overlay);
    if (!bodyEl) return null;
    var out = { cards: [], chips: [], apply: ad.apply ? $(ad.apply, document) : null, applyNote: ad.applyNote ? $(ad.applyNote, document) : null, bodyEl: bodyEl };
    var kids = Array.prototype.slice.call(bodyEl.children);

    if (ad.mode === "sections") {
      if (ad.chipsSel) $$(ad.chipsSel, bodyEl).forEach(function (c) { out.chips.push(c); });
      $$(ad.sectionSel, bodyEl).forEach(function (sec) {
        out.cards.push({ el: sec, title: titleOfSection(sec, ad), existing: true });
      });
      // loose things next to the sections (the Apply note, etc.)
      kids.forEach(function (k) {
        if (out.chips.indexOf(k) >= 0 || k === out.apply || k === out.applyNote || k.matches(ad.sectionSel.replace(":scope > ", "")) || k.classList.contains("drawerHead") || k.classList.contains("drawer-handle")) return;
        if (isNote(k) && out.apply) { out.applyNote = out.applyNote || k; }
      });
      return out;
    }

    // "flow" mode: headings / <hr> split a flat list of nodes into cards
    var cur = null, untitled = (ad.untitled || []).slice();
    function begin(title) { cur = { title: title, nodes: [] }; out.cards.push(cur); }
    kids.forEach(function (k) {
      if (ad.skip && k.matches(ad.skip)) return;
      if (k === out.apply || k === out.applyNote) return;
      if (ad.chipsSel && k.matches(ad.chipsSel)) { out.chips.push(k); return; }
      if (k.tagName === "HR") { cur = null; k.setAttribute("data-cs-gone", "1"); return; }
      if (k.classList.contains("drawerSection")) { out.cards.push({ el: k, title: titleOfSection(k, { titleSel: "h4" }), existing: true }); cur = null; return; }
      if (k.matches(ad.headSel)) { begin(ownText(k)); k.setAttribute("data-cs-gone", "1"); k.__csHead = true; cur.head = k; return; }
      if (!cur) begin(untitled.length ? untitled.shift() : "Settings");
      cur.nodes.push(k);
    });
    return out;
  }

  /* ------------------------------------------------------------------ card building */
  function upgradeCard(card, ad) {
    var el = card.el, title = card.title;
    if (!el) {
      el = mk("div", "csCard drawerSection-cs");
      card.nodes.forEach(function (n) { el.appendChild(n); });
      card.el = el;
    } else {
      el.classList.add("csCard");
    }
    var head = mk("div", "csCardHead");
    head.innerHTML = '<span class="csCardIcon" aria-hidden="true">' + iconFor(title) + '</span><h3 class="csCardTitle">' + esc(title) + "</h3>";
    // hide the game's original heading, but keep any button that lives inside it (e.g. Diagnostics hide/show)
    var oldH = el.querySelector(":scope > h4, :scope > h3, :scope > h2, :scope > .host-card-title");
    if (oldH) {
      var btns = $$("button", oldH);
      btns.forEach(function (b) { head.appendChild(b); });
      oldH.classList.add("csGone");
    }
    var badge = mk("span", "csBadge");
    var applyOn = !!(S.out && S.out.apply) && NEEDS_APPLY.test(title) && catFor(title) !== "hints";
    badge.className = "csBadge " + (applyOn ? "needs" : "live");
    badge.textContent = applyOn ? "Needs Apply" : (catFor(title) === "tools" ? "Live" : "Applies instantly");
    badge.title = applyOn ? "This setting takes effect when you press Apply." : "This setting takes effect straight away.";
    if (catFor(title) === "tools" || /^scores?$/i.test(title)) badge.style.display = "none";
    head.appendChild(badge);
    el.insertBefore(head, el.firstChild);
    // long explanations collapse to two lines with a "More" button
    $$(":scope > .sectionNote, :scope > .field-note, :scope > .settings-note, :scope > .mini-note, :scope > p", el).forEach(function (p) {
      if (p.classList.contains("miniStatus") || p.classList.contains("setup-status") || p.classList.contains("tiktok-status")) return;
      p.classList.add("csHelp");
      if ((p.textContent || "").length > 150) {
        p.classList.add("csClamp");
        var more = mk("button", "csMore"); more.type = "button"; more.textContent = "Read more";
        more.addEventListener("click", function () { var o = p.classList.toggle("csClamp"); more.textContent = o ? "Read more" : "Show less"; });
        p.parentNode.insertBefore(more, p.nextSibling);
      }
    });
    el.setAttribute("data-cs-title", title.toLowerCase());
    el.setAttribute("data-cs-cat", catFor(title));
    card.cat = catFor(title);
    return el;
  }

  /* ------------------------------------------------------------------ the workspace shell */
  function build(ad, overlay) {
    var out = extract(ad, overlay);
    if (!out || !out.cards.length) return false;
    S.out = out;

    var root = mk("div", "csOverlay"); root.hidden = true;
    var gameName = (document.querySelector(".heroTitle, .topbar-title, h1, .brand-title") || {}).textContent || "";
    gameName = clean(gameName).slice(0, 40);
    root.innerHTML =
      '<div class="csWin" role="dialog" aria-modal="true" aria-label="Settings">' +
        '<header class="csHead"><div class="csHeadTitle"><span class="csGear" aria-hidden="true">⚙️</span><div><h2>' + esc(ad.gameTitle === "Settings" ? "Settings" : ad.gameTitle) + '</h2>' +
        (gameName ? "<p>" + esc(gameName) + "</p>" : "") + '</div></div>' +
        '<button type="button" class="csClose" aria-label="Close settings">✕</button></header>' +
        '<div class="csBody"><nav class="csNav" aria-label="Settings categories"></nav><main class="csMain"></main></div>' +
        '<footer class="csFoot"><div class="csChips csGone"></div><div class="csFootBtns"></div></footer>' +
      "</div>";
    document.body.appendChild(root);
    S.root = root; S.win = $(".csWin", root); S.nav = $(".csNav", root); S.main = $(".csMain", root); S.foot = $(".csFoot", root);

    // panes (one per category)
    CATS.forEach(function (c) {
      var pane = mk("section", "csPane"); pane.setAttribute("data-cat", c.id); pane.hidden = true;
      pane.innerHTML = '<div class="csPaneHead"><h2>' + c.icon + " " + esc(c.label) + "</h2><p>" + esc(c.help) + "</p></div>" +
        '<div class="csCards"></div><p class="csEmpty" hidden>Nothing in this category matches your search.</p>';
      S.main.appendChild(pane); S.panes[c.id] = pane;
    });
    var none = mk("p", "csNoResults"); none.hidden = true; none.textContent = "No settings match your search."; S.main.appendChild(none); S.none = none;

    // footer: status chips + apply proxy
    out.chips.forEach(function (c) { $(".csChips", root).appendChild(c); c.classList.add("csChip"); });
    // footer: one button - Save & Apply. It presses the game's own Apply, then closes the settings.
    var proxy = mk("button", "csApply"); proxy.type = "button"; proxy.textContent = "Save & Apply";
    proxy.addEventListener("click", function () {
      try { if (out.apply) out.apply.click(); } catch (e) { console.warn(e); }
      setTimeout(function () { var c = $(ad.close); if (c) c.click(); else forceClose(); }, 120);
    });
    $(".csFootBtns", root).appendChild(proxy);
    S.applyProxy = proxy;
    // update 114: "Save & Apply as default" - apply now AND remember these settings on the server, so they are used again after a restart
    var defBtn = mk("button", "csApply csApplyDef"); defBtn.type = "button"; defBtn.textContent = "💾 Save & Apply as default";
    defBtn.title = "Applies the settings now and keeps them as this game's default: they stay even after the server restarts";
    defBtn.addEventListener("click", function () {
      try { if (out.apply) out.apply.click(); } catch (e) { console.warn(e); }
      defBtn.disabled = true; defBtn.textContent = "Saving…";
      setTimeout(function () {
        saveDefault().then(function (ok) { toast(ok === true ? "✔ Saved as the default for this game" : ok === "memory" ? "⚠ Applied, but the server could not write the file - it is kept until the next restart" : "⚠ Could not save the default (" + ok + ")"); })
          .then(function () { defBtn.disabled = false; defBtn.textContent = "💾 Save & Apply as default"; var c = $(ad.close); if (c) c.click(); else forceClose(); });
      }, 700); // give the game a moment to take the new settings, then read them back from the server
    });
    $(".csFootBtns", root).appendChild(defBtn);
    if (out.apply) out.apply.classList.add("csGone");
    if (out.applyNote) out.applyNote.classList.add("csGone");

    // cards -> panes
    out.cards.forEach(function (card) { place(card, ad); });
    // anything a script injects later (word language picker, hints form, …) is upgraded too
    S.mo = new MutationObserver(function () { sweep(ad); });
    S.mo.observe(out.bodyEl, { childList: true, subtree: false });
    $$(".csCards", root).forEach(function (cc) { S.mo.observe(cc, { childList: true }); });

    // original panel is now empty chrome: hide it for good (the game's own open/close code still works on it)
    overlay.classList.add("csOrig");
    $$("[data-cs-gone]", overlay).forEach(function (n) { n.classList.add("csGone"); });

    // events
    $(".csClose", root).addEventListener("click", function () { var c = $(ad.close); if (c) c.click(); else forceClose(); });
    root.addEventListener("mousedown", function (e) { if (e.target === root) { var c = $(ad.close); if (c) c.click(); else forceClose(); } });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && S.open) { var c = $(ad.close); if (c) c.click(); } });

    nav();
    return true;
  }

  function forceClose() { if (S.overlay) { try { S.ad.name === "word" || S.ad.name === "flagle" ? (S.overlay.hidden = true) : S.overlay.classList.remove("open"); } catch (e) {} } }

  function place(card, ad) {
    var el = upgradeCard(card, ad);
    var pane = S.panes[card.cat] || S.panes.play;
    $(".csCards", pane).appendChild(el);
    S.cards.push(card);
  }

  // a section injected into a pane/body by another script (e.g. word-language.js) -> upgrade it in place
  function sweep(ad) {
    var found = false;
    $$(".csCards > .drawerSection:not(.csCard), .csCards > .host-card:not(.csCard)", S.root).concat($$(":scope > .drawerSection:not(.csCard), :scope > .host-card:not(.csCard)", S.out.bodyEl)).forEach(function (sec) {
      var title = titleOfSection(sec, ad.titleSel ? ad : { titleSel: "h4, .host-card-title" });
      var card = { el: sec, title: title, existing: true };
      var before = sec.nextElementSibling; var parent = sec.parentNode;
      var el = upgradeCard(card, ad);
      var inPane = parent && parent.classList && parent.classList.contains("csCards");
      if (inPane && card.cat === parent.parentNode.getAttribute("data-cat")) { /* stay where the script put it */ }
      else { $(".csCards", S.panes[card.cat] || S.panes.play).appendChild(el); }
      S.cards.push(card); found = true;
    });
    if (found) { nav(); applySearch(); }
  }

  /* ------------------------------------------------------------------ navigation + search */
  function counts() { var c = {}; CATS.forEach(function (x) { c[x.id] = 0; }); $$(".csCard", S.root).forEach(function (e) { var k = e.getAttribute("data-cs-cat"); if (c[k] != null) c[k]++; }); return c; }
  function nav() {
    var c = counts(), html = "";
    CATS.forEach(function (x) {
      if (!c[x.id]) return;
      html += '<button type="button" class="csNavBtn' + (S.active === x.id ? " on" : "") + '" data-cat="' + x.id + '"><span class="csNavIcon">' + x.icon + '</span><span class="csNavText"><b>' + esc(x.label) + "</b><small>" + c[x.id] + (c[x.id] === 1 ? " section" : " sections") + "</small></span></button>";
    });
    S.nav.innerHTML = html;
    $$(".csNavBtn", S.nav).forEach(function (b) { b.addEventListener("click", function () { select(b.getAttribute("data-cat")); }); });
    if (!c[S.active]) { var first = CATS.filter(function (x) { return c[x.id]; })[0]; if (first) S.active = first.id; }
    paint();
  }
  function select(id) { S.active = id; applySearch(); paint(); if (S.main) S.main.scrollTop = 0; }
  function paint() {
    $$(".csNavBtn", S.nav).forEach(function (b) { b.classList.toggle("on", b.getAttribute("data-cat") === S.active); });
    var searching = !!S.search;
    CATS.forEach(function (c) {
      var pane = S.panes[c.id]; if (!pane) return;
      var vis = $$(".csCard:not(.csHide)", pane).length;
      pane.hidden = searching ? !vis : c.id !== S.active;
      $(".csPaneHead", pane).hidden = searching ? false : false;
    });
  }
  function applySearch() {
    var q = S.search, any = false;
    $$(".csCard", S.root).forEach(function (card) {
      var hit = !q || (card.getAttribute("data-cs-title") + " " + card.textContent).toLowerCase().indexOf(q) >= 0;
      card.classList.toggle("csHide", !hit); if (hit) any = true;
    });
    S.root.classList.toggle("csSearching", !!q);
    S.none.hidden = !q || any;
    paint();
  }
  function goTo(id) { if (!S.built) return; select(id); }

  var msgTimer = null;
  function flashMsg(t) { var m = $(".csFootMsg", S.root); if (!m) return; var old = m.getAttribute("data-old") || m.textContent; m.setAttribute("data-old", old); m.textContent = t; m.classList.add("flash"); clearTimeout(msgTimer); msgTimer = setTimeout(function () { m.textContent = old; m.classList.remove("flash"); }, 1800); }

  /* ------------------------------------------------------------------ open / close mirroring */
  function sync() {
    if (!S.built) return;
    var open = !!S.ad.isOpen(S.overlay);
    if (open === S.open) return;
    S.open = open; S.root.hidden = !open;
    document.documentElement.classList.toggle("csLock", open);
    if (open) { S.active = S.active || "play"; nav();  }
  }


  /* ------------------------------------------------------------------ update 114: saved defaults ("Save & Apply as default") */
  function gameId() { return (location.pathname.split("/").filter(Boolean)[0] || "").toLowerCase().replace(/\.html?$/, ""); }
  function editHeaders() { var h = { "Content-Type": "application/json" }; try { var k = localStorage.getItem("apEditKey"); if (k) h["x-edit-key"] = k; } catch (e) {} return h; }
  var SKIP_ID = /key|token|password|secret|sign|user(name)?$|handle|tiktok|connect|search|file|upload|chat|guess|answer|message/i;
  // the values of the game's own settings controls (used by games whose settings live in the browser: Flagle, Travle)
  function formSnapshot() {
    var out = {}, roots = [S.root, S.overlay];
    roots.forEach(function (r) {
      if (!r) return;
      $$("input, select, textarea", r).forEach(function (c) {
        var id = c.id; if (!id || SKIP_ID.test(id) || /^(button|submit|file|password|reset|image)$/.test(c.type)) return;
        out[id] = (c.type === "checkbox" || c.type === "radio") ? !!c.checked : c.value;
      });
    });
    return out;
  }
  function saveDefault() {
    var id = gameId(); if (!id) return Promise.resolve("no game");
    return fetch("/api/game-defaults/" + encodeURIComponent(id) + "/save", { method: "POST", headers: editHeaders(), body: JSON.stringify({ form: formSnapshot() }) })
      .then(function (r) { if (r.status === 401) { var k = window.prompt("This site is protected. Enter the HOME edit key:"); if (k) { try { localStorage.setItem("apEditKey", k); } catch (e) {} return saveDefault(); } return "edit key needed"; } return r.json().then(function (j) { return j && j.ok ? (j.written === false ? "memory" : true) : (j && j.error) || "error"; }); })
      .catch(function (e) { return String((e && e.message) || e); });
  }
  function toast(msg) {
    var t = mk("div", "csToast"); t.textContent = msg;
    t.style.cssText = "position:fixed;left:50%;bottom:28px;transform:translateX(-50%);z-index:2147483647;background:#1b1b2e;color:#fff;padding:12px 18px;border-radius:12px;font:600 14px system-ui,sans-serif;box-shadow:0 8px 24px rgba(0,0,0,.4);max-width:90vw;text-align:center";
    document.body.appendChild(t); setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 3800);
  }
  // Flagle and Travle keep their settings in the page (not on the server): put the saved form back and press the game's own Apply
  function restoreForm() {
    var id = gameId(); if (id !== "flagle" && id !== "travle") return;
    fetch("/api/game-defaults/" + encodeURIComponent(id), { cache: "no-store" }).then(function (r) { return r.json(); }).then(function (j) {
      var f = j && j.default && j.default.form; if (!f || !Object.keys(f).length) return;
      Object.keys(f).forEach(function (cid) {
        var c = document.getElementById(cid); if (!c) return;
        if (c.type === "checkbox" || c.type === "radio") c.checked = !!f[cid]; else c.value = f[cid];
        try { c.dispatchEvent(new Event("input", { bubbles: true })); c.dispatchEvent(new Event("change", { bubbles: true })); } catch (e) {}
      });
      setTimeout(function () { try { if (S.out && S.out.apply) S.out.apply.click(); } catch (e) {} }, 900);
    }).catch(function () {});
  }

  function init() {
    if (S.built || S.failed) return;
    for (var i = 0; i < ADAPTERS.length; i++) {
      var ad = ADAPTERS[i], overlay = $(ad.overlay);
      if (!overlay) continue;
      try {
        S.ad = ad; S.overlay = overlay;
        if (!build(ad, overlay)) { S.failed = true; return; }
        S.built = true;
        new MutationObserver(sync).observe(overlay, { attributes: true, attributeFilter: ["hidden", "class"] });
        sync();
        document.documentElement.classList.add("csReady");
        restoreForm(); // update 114
      } catch (e) {
        S.failed = true; console.warn("[settings-shell] fell back to the classic panel:", e);
        if (S.root && S.root.parentNode) S.root.parentNode.removeChild(S.root);
        document.documentElement.classList.remove("csReady");
      }
      return;
    }
  }

  window.CraftSettings = {
    open: function () { if (!S.built) return; var b = $(S.ad.btn); if (b) b.click(); },
    close: function () { if (!S.built) return; var c = $(S.ad.close); if (c) c.click(); },
    goTo: goTo,
    state: S
  };

  // wait until the page's own scripts have created their sections (language picker, hints form, …)
  function boot() { init(); if (S.built) { setTimeout(function () { sweep(S.ad); }, 400); setTimeout(function () { sweep(S.ad); }, 1500); } }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { setTimeout(boot, 0); });
  else setTimeout(boot, 0);
})();
