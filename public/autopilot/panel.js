/* AFK AUTOPILOT - control panel (update 109, notes + save/apply in update 112).  Prepare everything ahead of time, press Start, walk away.
   Talks to server/autopilot/autopilot-engine.js (REST + Server-Sent Events).  Changes are a draft until you press Save (bottom bar / Ctrl+S). */
(function () {
  "use strict";
  var main = document.getElementById("main"), tabsEl = document.getElementById("tabs"), pillEl = document.getElementById("pill"), savedEl = document.getElementById("saved");
  var cfg = null, S = null, catalog = null, profiles = [], editKeyRequired = false, tab = "run", saveTimer = null, skew = 0;
  var TABS = [["run", "▶ Run"], ["rotation", "🔁 Schedule"], ["games", "🎮 Games"], ["notes", "📝 Notes"], ["voting", "🗳️ Voting"], ["display", "🎨 Stage look"], ["safety", "🛡️ Safety"], ["setups", "💾 Setups"]];

  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function clear(n) { while (n.firstChild) n.removeChild(n.firstChild); }
  function key() { try { return localStorage.getItem("apEditKey") || ""; } catch (e) { return ""; } }
  function call(method, path, body) {
    var h = { "Content-Type": "application/json" };
    if (key()) h["x-edit-key"] = key();
    return fetch(path, { method: method, headers: h, body: body === undefined ? undefined : JSON.stringify(body) }).then(function (r) {
      if (r.status === 401) {
        var k = window.prompt("This site is protected. Enter the HOME edit key:");
        if (k) { try { localStorage.setItem("apEditKey", k); } catch (e) {} return call(method, path, body); }
        throw new Error("The edit key is needed to change anything.");
      }
      return r.json().then(function (j) { if (!r.ok || j.ok === false) throw new Error(j.error || "Something went wrong."); return j; });
    });
  }
  function act(path, body, okMsg) {
    return call("POST", path, body || {}).then(function (j) { if (j.state) onState(j.state); if (okMsg) flash(okMsg); return j; }).catch(function (e) { window.alert(e.message); });
  }
  function flash(t) { savedEl.textContent = t; clearTimeout(flash.t); flash.t = setTimeout(function () { if (savedEl.textContent === t) savedEl.textContent = ""; }, 2500); }

  /* ---------- config helpers + SAVE MODEL (update 112) ----------
     cfg      = the draft you are editing           savedStr = the last version the server confirmed it wrote to disk
     Every change only changes the draft (and keeps a copy of it in this browser). Nothing is lost until you leave without saving - and then the
     page warns you. Save = write to the server's disk (kept for every future launch). Save & apply now = save + give the settings to the game on screen. */
  var savedStr = "", meta = {}, autoSave = lsGet("apAutoSave") === "1", draftTimer = null, ui = { open: {}, search: "", filter: "all", bulk: {}, notesFilter: "all", draft: null, backup: null, hideBackup: false };
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function lsDel(k) { try { localStorage.removeItem(k); } catch (e) {} }
  function readJSON(k) { try { return JSON.parse(lsGet(k) || "null"); } catch (e) { return null; } }
  function stable(o) { // JSON with sorted keys, so "same settings typed in another order" is not a change
    if (Array.isArray(o)) return "[" + o.map(stable).join(",") + "]";
    if (o && typeof o === "object") return "{" + Object.keys(o).sort().map(function (k) { return JSON.stringify(k) + ":" + stable(o[k]); }).join(",") + "}";
    return JSON.stringify(o);
  }
  function dirty() { return Boolean(cfg) && stable(cfg) !== savedStr; }
  function get(path) { return path.split(".").reduce(function (o, k) { return o == null ? o : o[k]; }, cfg); }
  function set(path, v) {
    var p = path.split("."), o = cfg;
    for (var i = 0; i < p.length - 1; i++) { if (o[p[i]] == null || typeof o[p[i]] !== "object") o[p[i]] = {}; o = o[p[i]]; }
    o[p[p.length - 1]] = v;
    queueSave();
  }
  function queueSave() { // (name kept from update 109) - marks the draft as changed
    renderBar();
    clearTimeout(draftTimer);
    draftTimer = setTimeout(function () { if (dirty()) lsSet("apDraft", JSON.stringify({ t: Date.now(), cfg: cfg })); else lsDel("apDraft"); }, 400);
    if (autoSave) { clearTimeout(saveTimer); saveTimer = setTimeout(function () { doSave(false, true); }, 1500); }
  }
  function hhmm(ts) { return ts ? new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""; }
  function when(ts) { return ts ? new Date(ts).toLocaleString([], { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "never"; }

  var barState = "";
  function doSave(apply, silent) {
    clearTimeout(saveTimer);
    barState = "saving"; renderBar();
    return call("POST", "/api/autopilot/save", { config: cfg, apply: Boolean(apply) }).then(function (j) {
      meta = j.meta || meta;
      var changedByServer = stable(cfg) !== stable(j.config);
      savedStr = stable(j.config);
      if (changedByServer) cfg = j.config;
      lsDel("apDraft"); ui.draft = null;
      barState = j.written === false ? "memory" : "saved";
      if (j.state) S = j.state;
      refreshBackup();
      renderBar();
      if (!silent || changedByServer) render();
      if (!silent) flash(j.written === false ? "⚠ Saved in memory only" : apply && j.applied ? "Saved & applied ✓" : "Saved ✓");
      return j;
    }).catch(function (e) { barState = "error:" + e.message; renderBar(); window.alert(e.message); });
  }
  function discard() {
    if (!dirty() || !window.confirm("Throw away the changes you have not saved?")) return;
    lsDel("apDraft"); load();
  }
  // a copy of the whole setup (settings + named setups) is kept in THIS browser too: if the hosting wipes its disk, the panel offers to restore it
  function refreshBackup() {
    fetch("/api/autopilot/export", { cache: "no-store" }).then(function (r) { return r.json(); }).then(function (data) { lsSet("apBackup", JSON.stringify({ t: Date.now(), data: data })); }).catch(function () {});
  }
  window.addEventListener("beforeunload", function (e) { if (dirty()) { e.preventDefault(); e.returnValue = ""; return ""; } });
  document.addEventListener("keydown", function (e) { if ((e.ctrlKey || e.metaKey) && (e.key === "s" || e.key === "S")) { e.preventDefault(); if (cfg) doSave(false); } });

  var barEl = document.getElementById("savebar");
  function renderBar() {
    if (!barEl) return;
    clear(barEl);
    if (!cfg) return;
    var isDirty = dirty(), st = el("span", "bst");
    if (barState === "saving") { st.textContent = "Saving…"; st.className = "bst"; }
    else if (barState.indexOf("error:") === 0) { st.textContent = "⛔ Not saved: " + barState.slice(6); st.className = "bst bad"; }
    else if (isDirty) { st.textContent = "● You have changes that are not saved yet"; st.className = "bst dirty"; }
    else if (barState === "memory" || (meta && meta.writable === false)) { st.textContent = "⚠ Saved in memory only - the server could not write to its disk"; st.className = "bst bad"; }
    else { st.textContent = "✓ All saved" + (meta && meta.savedAt ? " · " + hhmm(meta.savedAt) : ""); st.className = "bst ok"; }
    barEl.className = "savebar" + (isDirty ? " dirty" : "");
    barEl.appendChild(st);
    var ctl = el("div", "bctl");
    var a = el("label", "auto"); var cb = el("input"); cb.type = "checkbox"; cb.checked = autoSave;
    cb.onchange = function () { autoSave = cb.checked; lsSet("apAutoSave", autoSave ? "1" : "0"); if (autoSave && dirty()) queueSave(); };
    a.appendChild(cb); a.appendChild(document.createTextNode(" Save automatically")); ctl.appendChild(a);
    if (isDirty) { var dc = el("button", "b", "↩ Discard"); dc.onclick = discard; ctl.appendChild(dc); }
    var sv = el("button", "b go", "💾 Save"); sv.title = "Keeps these settings for every future launch (Ctrl+S)"; sv.onclick = function () { doSave(false); }; ctl.appendChild(sv);
    if (S && S.running && S.current) {
      var ap = el("button", "b acc", "💾 Save & apply now"); ap.title = "Saves, then gives the settings to the game on screen (a fresh round starts)";
      ap.onclick = function () { if (window.confirm("Save, and apply the settings to the game on screen now? A fresh round of " + S.current.name + " starts.")) doSave(true); };
      ctl.appendChild(ap);
    }
    barEl.appendChild(ctl);
  }

  /* ---------- field builders ---------- */
  function wrap(label, help, node, row) { var f = el("div", "f" + (row ? " row" : "")); var l = el("label", "", label); f.appendChild(node); f.appendChild(l); if (!row) { f.removeChild(node); f.appendChild(l); f.appendChild(node); } if (help) f.appendChild(el("small", "", help)); return f; }
  function num(path, label, min, max, help, unit) {
    var i = el("input"); i.type = "number"; i.min = min; i.max = max; i.value = get(path);
    i.oninput = function () { var v = Number(i.value); if (isFinite(v)) set(path, Math.min(max, Math.max(min, v))); };
    return wrap(label + (unit ? " (" + unit + ")" : ""), help, i);
  }
  function sel(path, label, options, help, rerender) {
    var s = el("select");
    options.forEach(function (o) { var op = el("option", "", o[1]); op.value = o[0]; s.appendChild(op); });
    s.value = String(get(path));
    s.onchange = function () { set(path, s.value); if (rerender) render(); };
    return wrap(label, help, s);
  }
  function chk(path, label, help, rerender) {
    var c = el("input"); c.type = "checkbox"; c.checked = Boolean(get(path));
    c.onchange = function () { set(path, c.checked); if (rerender) render(); };
    return wrap(label, help, c, true);
  }
  function txt(path, label, help, max) {
    var i = el("input"); i.type = "text"; i.maxLength = max || 120; i.value = get(path) || "";
    i.oninput = function () { set(path, i.value); };
    return wrap(label, help, i);
  }
  function area(path, label, help, asLines) {
    var t = el("textarea"), v = get(path);
    t.value = Array.isArray(v) ? v.join(asLines ? "\n" : ", ") : v || "";
    t.oninput = function () { set(path, asLines ? t.value.split("\n").map(function (x) { return x.trim(); }).filter(Boolean) : t.value.split(/[\s,;]+/).filter(Boolean)); };
    return wrap(label, help, t);
  }
  function color(path, label) { var i = el("input"); i.type = "color"; i.value = get(path) || "#ff5c8a"; i.oninput = function () { set(path, i.value); }; return wrap(label, "", i); }
  function gameName(id) { var g = catalog.games.filter(function (x) { return x.id === id; })[0]; return g ? g.emoji + " " + g.name : id; }
  function gameSelect(path, label, help) {
    return sel(path, label, catalog.games.map(function (g) { return [g.id, g.emoji + " " + g.name]; }), help);
  }
  function gameList(path, label, help, ordered) {
    var box = el("div", "f"); box.appendChild(el("label", "", label)); if (help) box.appendChild(el("small", "", help));
    var list = get(path) || [], chips = el("div", "chips");
    list.forEach(function (id, i) {
      var c = el("span", "chip"); c.appendChild(el("span", "", (ordered ? (i + 1) + ". " : "") + gameName(id)));
      if (ordered) { var up = el("button", "", "↑"); up.onclick = function () { if (i > 0) { var l = list.slice(); l.splice(i - 1, 0, l.splice(i, 1)[0]); set(path, l); render(); } }; c.appendChild(up); }
      var x = el("button", "", "×"); x.onclick = function () { var l = list.slice(); l.splice(i, 1); set(path, l); render(); }; c.appendChild(x);
      chips.appendChild(c);
    });
    box.appendChild(chips);
    var add = el("select"); var o0 = el("option", "", "➕ add a game…"); o0.value = ""; add.appendChild(o0);
    catalog.games.forEach(function (g) { if (!ordered && list.indexOf(g.id) >= 0) return; var o = el("option", "", g.emoji + " " + g.name); o.value = g.id; add.appendChild(o); });
    add.onchange = function () { if (add.value) { set(path, list.concat([add.value])); render(); } };
    box.appendChild(add);
    return box;
  }
  function card(title, help) { var c = el("section", "card"); c.appendChild(el("h2", "", title)); if (help) c.appendChild(el("p", "help", help)); return c; }
  function grid(c, nodes) { var g = el("div", "grid"); nodes.forEach(function (n) { if (n) g.appendChild(n); }); c.appendChild(g); return c; }

  /* ---------- tabs ---------- */
  function tRun() {
    var d = document.createDocumentFragment();
    var st = card("Status");
    var run = S.running, ph = S.phase, cur = S.current;
    var stat = el("div", "stat");
    function stx(a, b) { var x = el("div"); x.appendChild(el("b", "", a)); x.appendChild(el("span", "", b)); stat.appendChild(x); }
    stx("Autopilot", !run ? "OFF" : S.paused ? "PAUSED" : "RUNNING");
    stx("Phase", run ? ph : "—");
    stx("Game", cur ? cur.emoji + " " + cur.name : "—");
    stx("Time left in game", run && cur && (ph === "playing") ? mmss(secs(cur.sessionEndsAt)) : "—");
    stx("Games played", String(S.gamesPlayed || 0));
    stx("Platform", S.platform ? S.platform.mode.toUpperCase() + " · " + S.platform.status : "—");
    stx("Stage page", S.stage && S.stage.alive ? "open ✓" : "not open");
    stx("Viewers", S.platform && S.platform.viewers != null ? String(S.platform.viewers) : "—");
    st.appendChild(stat);
    (S.warnings || []).forEach(function (w) { st.appendChild(el("div", "warn " + (w.level === "bad" ? "bad" : "warn"), (w.level === "bad" ? "⛔ " : "⚠️ ") + w.text)); });
    if (!(S.warnings || []).length && run) st.appendChild(el("div", "warn good", "✅ Everything looks fine."));
    d.appendChild(st);
    d.appendChild(readyCard());

    var ctl = card("Controls", "You can interrupt at any moment. Stopping keeps the current game on screen so you can carry on by hand.");
    var b = el("div", "btns");
    function btn(label, cls, fn, dis) { var x = el("button", "b " + cls, label); x.disabled = Boolean(dis); x.onclick = fn; b.appendChild(x); return x; }
    btn("▶ Start autopilot", "go", function () { act("/api/autopilot/start", {}, "Started"); }, run);
    btn("▶ Start now (no countdown)", "", function () { act("/api/autopilot/start", { now: true }, "Started"); }, run);
    btn(S.paused ? "▶ Resume" : "⏸ Pause", "warn", function () { act(S.paused ? "/api/autopilot/resume" : "/api/autopilot/pause"); }, !run);
    btn("⏭ Skip game", "", function () { act("/api/autopilot/skip"); }, !run);
    btn("🗳 Vote now", "", function () { act("/api/autopilot/vote-now"); }, !run);
    btn("➕ +5 min", "", function () { act("/api/autopilot/extend", { minutes: 5 }); }, !run || !cur);
    btn("🔁 Restart game", "", function () { act("/api/autopilot/restart-game"); }, !run || !cur);
    btn("⏹ Stop", "stop", function () { if (window.confirm("Stop the autopilot?")) act("/api/autopilot/stop"); }, !run);
    ctl.appendChild(b);
    var f = el("div", "btns");
    var fs = el("select"); catalog.games.forEach(function (g) { var o = el("option", "", g.emoji + " " + g.name); o.value = g.id; fs.appendChild(o); });
    f.appendChild(fs);
    var fb = el("button", "b", "Switch to this game now"); fb.disabled = !run; fb.onclick = function () { act("/api/autopilot/force", { gameId: fs.value }); }; f.appendChild(fb);
    var pv = el("button", "b", "🧪 Practice vote"); pv.disabled = run; pv.title = "Shows the vote screen on the stage without switching anything"; pv.onclick = function () { act("/api/autopilot/preview-vote"); }; f.appendChild(pv);
    var tv = el("button", "b", "➕ 10 test votes"); tv.disabled = ph !== "voting"; tv.onclick = function () { act("/api/autopilot/test-vote", { count: 10 }); }; f.appendChild(tv);
    ctl.appendChild(f);
    d.appendChild(ctl);

    var lk = card("Your stage link", "Put THIS page in TikTok LIVE Studio / OBS (window or browser source) instead of a single game. It shows every game, the vote and the splash screens. Press Esc on it for a small host bar.");
    var l = el("div", "link"); var url = location.origin + "/autopilot/stage"; l.appendChild(el("span", "", url));
    var cp = el("button", "b", "Copy"); cp.onclick = function () { try { navigator.clipboard.writeText(url); flash("Copied ✓"); } catch (e) { window.prompt("Copy this link:", url); } }; l.appendChild(cp);
    var op = el("a", "b", "Open stage"); op.href = "/autopilot/stage"; op.target = "_blank"; op.rel = "noopener"; op.style.textDecoration = "none"; l.appendChild(op);
    lk.appendChild(l);
    lk.appendChild(el("p", "help", "Checklist: ① HOME is in LIVE mode and connected ② this stage page is open in your streaming software ③ you pressed Start."));
    d.appendChild(lk);

    if (S.vote && (ph === "voting")) {
      var vc = card("Open vote");
      S.vote.options.forEach(function (o) { vc.appendChild(el("div", "", o.n + ". " + o.emoji + " " + o.name + (o.count != null ? " — " + o.count : ""))); });
      vc.appendChild(el("p", "help", (S.vote.voters || 0) + " voter(s) · " + secs(S.vote.endsAt) + " s left" + (S.vote.rejected ? " · " + S.vote.rejected + " vote(s) refused (not eligible)" : "")));
      d.appendChild(vc);
    }
    var h = card("What has been played");
    if (!S.history.length) h.appendChild(el("p", "help", "Nothing yet."));
    else { var t = el("table"); var hr = el("tr"); ["Game", "Rounds", "Why it ended", "Top player"].forEach(function (x) { hr.appendChild(el("th", "", x)); }); t.appendChild(hr);
      S.history.slice().reverse().forEach(function (x) { var r = el("tr"); r.appendChild(el("td", "", x.emoji + " " + x.name)); r.appendChild(el("td", "", String(x.rounds))); r.appendChild(el("td", "", x.reason)); r.appendChild(el("td", "", x.top && x.top[0] ? x.top[0].username + " (" + x.top[0].score + ")" : "—")); t.appendChild(r); });
      h.appendChild(t); }
    d.appendChild(h);
    var lg = card("Event log"); var box = el("div", "log");
    S.log.slice().reverse().forEach(function (x) { var r = el("div", x.level); r.appendChild(el("time", "", new Date(x.t).toLocaleTimeString())); r.appendChild(document.createTextNode(x.text)); box.appendChild(r); });
    lg.appendChild(box); d.appendChild(lg);
    return d;
  }

  function tRotation() {
    var d = document.createDocumentFragment();
    d.appendChild(grid(card("How the next game is chosen", "After every game session the autopilot picks the next game this way."), [
      sel("rotation.mode", "Next game is…", [["vote", "Voted by the audience"], ["sequence", "Taken from my list, in order"], ["random", "Random"], ["weighted", "Random, favouring higher “weight” games"]], "", true),
      sel("run.firstGame", "The very first game is…", [["vote", "Voted by the audience"], ["fixed", "A game I choose"], ["random", "Random"], ["sequence", "First game of my list"]], "", true),
      get("run.firstGame") === "fixed" ? gameSelect("run.firstGameId", "First game") : null,
      num("rotation.avoidRepeatLast", "Do not repeat the last … games", 0, 10, "While enough other games are switched on."),
      chk("rotation.allowReplay", "The game that just ended may come again"),
      num("rotation.breakSeconds", "Next-game splash time", 2, 120, "Used when there is no vote (list / random).", "seconds")
    ]));
    if (get("rotation.mode") === "sequence" || get("run.firstGame") === "sequence") {
      var c = card("My game list (in order)", "Leave empty to use every switched-on game in catalog order.");
      c.appendChild(gameList("rotation.sequence", "Order of games", "", true));
      c.appendChild(chk("rotation.loop", "Start again from the top when the list ends"));
      d.appendChild(c);
    }
    d.appendChild(grid(card("One game session", "How long each game runs. Every game can override this in the Games tab."), [
      num("session.minutes", "Session length", 1, 240, "", "minutes"),
      sel("session.endRule", "A session ends…", [["time", "when the time is up"], ["rounds", "after N finished rounds"], ["either", "at the time OR the rounds, whichever is first"]], "", true),
      get("session.endRule") !== "time" ? num("session.rounds", "Rounds per session", 1, 100, "Needs the stage page open (it counts the finished rounds).") : null,
      chk("session.finishRound", "When time is up, let the running round finish first"),
      num("session.graceSeconds", "…but wait at most", 5, 900, "", "seconds"),
      num("session.showLeaderboardSeconds", "Show the session leaderboard for", 0, 60, "0 = skip it.", "seconds")
    ]));
    d.appendChild(grid(card("Start & stop of the whole run"), [
      num("run.startDelaySeconds", "Countdown after pressing Start", 0, 600, "", "seconds"),
      sel("run.stopRule", "The autopilot stops by itself…", [["never", "never (until I stop it)"], ["hours", "after some hours"], ["games", "after some games"]], "", true),
      get("run.stopRule") === "hours" ? num("run.stopAfterHours", "Run for", 1, 48, "", "hours") : null,
      get("run.stopRule") === "games" ? num("run.stopAfterGames", "Play", 1, 200, "", "games") : null
    ]));
    return d;
  }

  /* ---------- GAMES tab (update 112): switch on, timing, and each game's own gameplay settings ---------- */
  function fieldInfo(k) { return catalog.fields[k] || {}; }
  function optLabel(k, v) { var f = fieldInfo(k), o = (f.options || []).filter(function (x) { return String(x[0]) === String(v); })[0]; return o ? o[1] : String(v); }
  function unitOf(g) { return g.id === "numberblindle" ? "digits" : "letters"; }
  function summaryOf(g) { // short chips that tell, at a glance, what this game will use
    if (!g.family) return ["its own saved settings"];
    var st = get("games." + g.id + ".settings") || {}, out = [];
    if (st.difficulty) out.push(optLabel("difficulty", st.difficulty).replace(/ \(.*\)/, ""));
    if (st.lengthMode === "random") out.push((st.lengthMin || "?") + "–" + (st.lengthMax || "?") + " " + unitOf(g));
    else if (st.wordLength) out.push(st.wordLength + " " + unitOf(g));
    else if (st.lengthMode === "fixed") out.push("fixed length");
    if (st.regions && st.regions.length) out.push(st.regions.length + " region" + (st.regions.length === 1 ? "" : "s"));
    if (st.startLength !== undefined) out.push("start " + (st.startLength || "3–5"));
    if (st.maxLength !== undefined) out.push("max " + (st.maxLength || "auto"));
    if (st.roundSeconds) out.push(st.roundSeconds + " s round");
    if (st.starterWord !== undefined) out.push(st.starterWord ? "starter word" : "no starter word");
    if (st.allowRepeats !== undefined) out.push(st.allowRepeats ? "digits repeat" : "no repeats");
    if (st.autoContinueDelaySeconds) out.push("pause " + st.autoContinueDelaySeconds + " s");
    return out.length ? out : ["game's own settings"];
  }
  function setPreset(path, k, v) { var o = get(path); if (!o || typeof o !== "object") { set(path, {}); o = get(path); } if (v === undefined) delete o[k]; else o[k] = v; queueSave(); }

  // a row of buttons: (keep) | option | option ...  - click the active one again to go back to "keep"
  function segmented(options, cur, onPick, keepLabel) {
    var box = el("div", "seg");
    [["", keepLabel || "(keep)"]].concat(options).forEach(function (o) {
      var on = (cur === undefined || cur === null || cur === "") ? o[0] === "" : String(cur) === String(o[0]);
      var b = el("button", on ? "on" : "", o[1]); b.type = "button";
      b.onclick = function () { onPick(o[0] === "" || (on && o[0] !== "") ? undefined : o[0]); };
      box.appendChild(b);
    });
    return box;
  }
  function numBox(cur, f, onSet, ph) {
    var i = el("input"); i.type = "number"; i.min = f.min; i.max = f.max; i.placeholder = ph || "(keep)"; i.value = cur === undefined || cur === null ? "" : cur;
    i.oninput = function () { onSet(i.value === "" ? undefined : Math.min(f.max, Math.max(f.min, Number(i.value)))); };
    return i;
  }

  // the editor for ONE set of settings. `read()` gives the current values, `write(k, v)` stores one value (v === undefined = keep), `keys` = the fields this game has
  function settingsForm(g, read, write, rebuild) {
    var gr = el("div", "sform"), st = read(), keys = g.keys, has = function (k) { return keys.indexOf(k) >= 0; };
    function row(label, node, help) { var r = el("div", "srow"); r.appendChild(el("label", "", label)); r.appendChild(node); if (help) r.appendChild(el("small", "", help)); gr.appendChild(r); }
    if (has("difficulty")) row("Difficulty", segmented(fieldInfo("difficulty").options.map(function (o) { return [o[0], o[1].replace(/ \(.*\)/, "")]; }), st.difficulty, function (v) { write("difficulty", v); rebuild(); }));
    if (has("lengthMode")) {
      row("Word length", segmented(fieldInfo("lengthMode").options.map(function (o) { return [o[0], o[0] === "fixed" ? "Always the same" : "Random in a range"]; }), st.lengthMode, function (v) { write("lengthMode", v); rebuild(); }), "Fixed = every round has the same number of " + unitOf(g) + ". Range = a different length each round.");
      var showFixed = st.lengthMode !== "random", showRange = st.lengthMode !== "fixed";
      if (has("wordLength") && showFixed) row("Number of " + unitOf(g), numBox(st.wordLength, fieldInfo("wordLength"), function (v) { write("wordLength", v); }), "The game uses the lengths it has " + (g.id === "numberblindle" ? "codes" : "words") + " for.");
      if (has("lengthMin") && showRange) { var rr = el("div", "two"); rr.appendChild(numBox(st.lengthMin, fieldInfo("lengthMin"), function (v) { write("lengthMin", v); }, "shortest")); rr.appendChild(el("span", "", "to")); rr.appendChild(numBox(st.lengthMax, fieldInfo("lengthMax"), function (v) { write("lengthMax", v); }, "longest")); row("Length range", rr); }
    }
    if (has("startLength")) row("Starting length", segmented(fieldInfo("startLength").options.map(function (o) { return [o[0], o[1]]; }), st.startLength === undefined ? undefined : String(st.startLength), function (v) { write("startLength", v === undefined ? undefined : Number(v)); rebuild(); }));
    if (has("maxLength")) row("Longest word", numBox(st.maxLength, fieldInfo("maxLength"), function (v) { write("maxLength", v); }, "(keep)"), "0 = automatic.");
    if (has("roundSeconds")) row("Round time", numBox(st.roundSeconds, fieldInfo("roundSeconds"), function (v) { write("roundSeconds", v); }), "seconds");
    if (has("starterWord")) row("Starter word", segmented([["true", "On"], ["false", "Off"]], st.starterWord === undefined ? undefined : String(st.starterWord), function (v) { write("starterWord", v === undefined ? undefined : v === "true"); rebuild(); }), "Opens every round with one free word.");
    if (has("allowRepeats")) row("Digits may repeat", segmented([["true", "Yes"], ["false", "No"]], st.allowRepeats === undefined ? undefined : String(st.allowRepeats), function (v) { write("allowRepeats", v === undefined ? undefined : v === "true"); rebuild(); }));
    if (has("regions")) {
      var choices = catalog.regions[g.id] || [], box = el("div", "cb"), sel0 = st.regions || [];
      function put(list) { write("regions", list.length ? list : undefined); rebuild(); }
      choices.forEach(function (r) { var lab = el("label"); var c = el("input"); c.type = "checkbox"; c.checked = sel0.indexOf(r[0]) >= 0; c.onchange = function () { var now = (read().regions || []).slice(), ix = now.indexOf(r[0]); if (c.checked && ix < 0) now.push(r[0]); if (!c.checked && ix >= 0) now.splice(ix, 1); put(now); }; lab.appendChild(c); lab.appendChild(document.createTextNode(r[1])); box.appendChild(lab); });
      var wrapR = el("div"); wrapR.appendChild(box);
      var qb = el("div", "btns tight"); var all = el("button", "b sm", "All"); all.onclick = function () { put(choices.map(function (r) { return r[0]; })); }; var none = el("button", "b sm", "None (keep)"); none.onclick = function () { put([]); }; qb.appendChild(all); qb.appendChild(none); wrapR.appendChild(qb);
      row("Where the secret place can be", wrapR, "Nothing ticked = keep the game's own choice.");
    }
    if (has("autoContinueDelaySeconds")) row("Pause between rounds", numBox(st.autoContinueDelaySeconds, fieldInfo("autoContinueDelaySeconds"), function (v) { write("autoContinueDelaySeconds", v); }), "seconds");
    return gr;
  }

  function copyableGames(g) { return catalog.games.filter(function (x) { return x.family && x.id !== g.id && x.keys.some(function (k) { return g.keys.indexOf(k) >= 0; }); }); }
  function presetEditor(g, onChange) {
    var det = el("details", "preset"); det.open = Boolean(ui.open[g.id]);
    det.ontoggle = function () { ui.open[g.id] = det.open; };
    det.appendChild(el("summary", "", "⚙ Game settings"));
    var body = el("div", "pbody"); det.appendChild(body);
    if (!g.family) { body.appendChild(el("p", "help", "This game runs with the settings you saved inside the game itself (open the game once and set it there). The autopilot still starts, times and switches it.")); return det; }
    var path = "games." + g.id + ".settings";
    function build() {
      clear(body);
      body.appendChild(el("p", "help", "Only what you set here is sent to the game every time it starts in a session. “(keep)” = the game's own setting."));
      var tools = el("div", "btns tight");
      var cp = copyableGames(g);
      if (cp.length) {
        var cs = el("select", "sm"); var c0 = el("option", "", "📋 Copy settings from…"); c0.value = ""; cs.appendChild(c0);
        cp.forEach(function (x) { var o = el("option", "", x.emoji + " " + x.name); o.value = x.id; cs.appendChild(o); });
        cs.onchange = function () {
          if (!cs.value) return; var src = get("games." + cs.value + ".settings") || {}, n = 0;
          g.keys.forEach(function (k) { if (src[k] !== undefined) { setPreset(path, k, JSON.parse(JSON.stringify(src[k]))); n++; } else setPreset(path, k, undefined); }); // a true copy: what the other game leaves on "keep" is cleared here too
          flash(n ? "Copied " + n + " setting" + (n === 1 ? "" : "s") : "Nothing to copy"); build(); onChange();
        };
        tools.appendChild(cs);
      }
      var rs = el("button", "b sm", "↺ Back to the game's own settings"); rs.onclick = function () { set(path, {}); build(); onChange(); }; tools.appendChild(rs);
      body.appendChild(tools);
      body.appendChild(settingsForm(g, function () { return get(path) || {}; }, function (k, v) { setPreset(path, k, v); onChange(); }, build));
    }
    build();
    return det;
  }

  function bulkTool() {
    var c = card("⚡ Set many games at once", "Pick the settings once and copy them to every game that has the option - much faster than editing 20+ games one by one. Then fine-tune single games below. (Nothing is final until you press Save.)");
    var b = ui.bulk, keys = ["difficulty", "lengthMode", "wordLength", "lengthMin", "lengthMax", "autoContinueDelaySeconds"];
    var pseudo = { id: "_bulk", keys: keys, family: true };
    var body = el("div"); c.appendChild(body);
    function build() {
      clear(body);
      body.appendChild(settingsForm(pseudo, function () { return b; }, function (k, v) { if (v === undefined) delete b[k]; else b[k] = v; }, build));
      var tr = el("div", "f"); tr.appendChild(el("label", "", "Copy to"));
      var ts = el("select"); [["on", "Only the games that are switched on"], ["all", "All games that have these options"]].forEach(function (o) { var op = el("option", "", o[1]); op.value = o[0]; ts.appendChild(op); }); ts.value = b._target || "on"; ts.onchange = function () { b._target = ts.value; }; tr.appendChild(ts); body.appendChild(tr);
      var bt = el("div", "btns");
      var ap = el("button", "b go", "Copy to games"); ap.onclick = function () {
        var vals = Object.keys(b).filter(function (k) { return k.charAt(0) !== "_" && b[k] !== undefined; });
        if (!vals.length) { window.alert("Choose at least one setting above first."); return; }
        var n = 0;
        catalog.games.forEach(function (g) {
          if (!g.family || ((b._target || "on") === "on" && !get("games." + g.id + ".enabled"))) return;
          var any = false; vals.forEach(function (k) { if (g.keys.indexOf(k) >= 0) { setPreset("games." + g.id + ".settings", k, b[k]); any = true; } });
          if (any) n++;
        });
        flash("Copied to " + n + " game" + (n === 1 ? "" : "s") + " - press Save to keep it"); render();
      }; bt.appendChild(ap);
      var cl = el("button", "b stop", "Clear all game settings"); cl.onclick = function () { if (window.confirm("Set every game back to its own settings? (Your notes stay.)")) { catalog.games.forEach(function (g) { set("games." + g.id + ".settings", {}); }); render(); } }; bt.appendChild(cl);
      body.appendChild(bt);
    }
    build();
    return c;
  }

  function tGames() {
    var d = document.createDocumentFragment();
    d.appendChild(bulkTool());
    var c = card("🎮 Your games", "Tick the games you want in the rotation. Open “⚙ Game settings” to set difficulty, word length and more for that game. “Minutes” and “Rounds” override the default session for the game (0 = default); “Weight” matters for the weighted picks.");
    var tb = el("div", "toolbar");
    var q = el("input"); q.type = "text"; q.placeholder = "🔍 Find a game…"; q.value = ui.search;
    var f = el("select"); [["all", "All games"], ["on", "Switched on"], ["off", "Switched off"]].forEach(function (o) { var op = el("option", "", o[1]); op.value = o[0]; f.appendChild(op); }); f.value = ui.filter;
    var cnt = el("span", "count");
    var all = el("button", "b sm", "Switch all on"); all.onclick = function () { catalog.games.forEach(function (g) { set("games." + g.id + ".enabled", true); }); render(); };
    var none = el("button", "b sm", "Switch all off"); none.onclick = function () { catalog.games.forEach(function (g) { set("games." + g.id + ".enabled", false); }); render(); };
    [q, f, all, none, cnt].forEach(function (x) { tb.appendChild(x); }); c.appendChild(tb);
    var list = el("div", "glist"); c.appendChild(list);
    var rows = [];
    function refreshCount() { var n = catalog.games.filter(function (g) { return get("games." + g.id + ".enabled"); }).length; cnt.textContent = n + " of " + catalog.games.length + " games on"; }
    function applyFilter() { rows.forEach(function (r) { var on = Boolean(get("games." + r.g.id + ".enabled")), txt = (r.g.name + " " + (get("games." + r.g.id + ".aka") || []).join(" ")).toLowerCase(); r.node.style.display = (ui.filter === "on" && !on) || (ui.filter === "off" && on) || (ui.search && txt.indexOf(ui.search.toLowerCase()) < 0) ? "none" : ""; }); }
    q.oninput = function () { ui.search = q.value; applyFilter(); }; f.onchange = function () { ui.filter = f.value; applyFilter(); };
    catalog.games.forEach(function (g) {
      var p = "games." + g.id, on = get(p + ".enabled");
      var node = el("div", "grow" + (on ? "" : " off"));
      var top = el("div", "gtop");
      var cb = el("input"); cb.type = "checkbox"; cb.checked = Boolean(on); cb.title = "Include this game in the rotation";
      cb.onchange = function () { set(p + ".enabled", cb.checked); node.className = "grow" + (cb.checked ? "" : " off"); refreshCount(); applyFilter(); };
      top.appendChild(cb);
      var nm = el("div", "gname"); nm.appendChild(el("b", "", g.emoji + " " + g.name));
      var chips = el("div", "gchips"); nm.appendChild(chips); top.appendChild(nm);
      var nums = el("div", "gnums");
      [["minutes", "Minutes", 0, 240], ["rounds", "Rounds", 0, 100], ["weight", "Weight", 1, 10]].forEach(function (a) {
        var w = el("label", "mini"); w.appendChild(el("span", "", a[1])); var i = el("input"); i.type = "number"; i.min = a[2]; i.max = a[3]; i.value = get(p + "." + a[0]);
        i.oninput = function () { var v = Number(i.value); if (isFinite(v)) set(p + "." + a[0], Math.min(a[3], Math.max(a[2], v))); }; w.appendChild(i); nums.appendChild(w);
      });
      top.appendChild(nums); node.appendChild(top);
      function refreshChips() {
        clear(chips);
        summaryOf(g).forEach(function (s) { chips.appendChild(el("span", "gc", s)); });
        var n = get(p + ".aka") || [], hasNote = n.length || get(p + ".inspiredBy") || get(p + ".voteNote");
        var nb = el("span", "gc note" + (hasNote ? " has" : ""), hasNote ? "📝 notes" : "📝 no notes"); nb.title = "Edit in the Notes tab"; nb.onclick = function () { tab = "notes"; ui.notesFilter = "all"; render(); window.scrollTo(0, 0); }; chips.appendChild(nb);
      }
      refreshChips();
      node.appendChild(presetEditor(g, refreshChips));
      list.appendChild(node); rows.push({ g: g, node: node });
    });
    refreshCount(); applyFilter();
    d.appendChild(c);
    return d;
  }

  /* ---------- NOTES tab (update 112): what the audience reads about each game ---------- */
  function tNotes() {
    var d = document.createDocumentFragment(), L = catalog.noteLimits || { akaCount: 6, akaChars: 40, inspiredBy: 80, voteNote: 120, howTo: 140 };
    var intro = card("📝 Notes for your viewers", "Your games have their own names, but many are inspired by games people already know. Write the other names here so viewers recognise them, and add a short note for each game. They appear on the stage during the vote, on the winner screen and on the next-game splash.");
    grid(intro, [
      chk("display.showAka", "Show “Also known as” and “Inspired by” under each game", "", true),
      chk("display.showVoteNotes", "Show my note under each game during the vote", "", true),
      chk("display.showNotesOnSplash", "Show my note on the winner screen and the next-game splash", "", true)
    ]);
    d.appendChild(intro);

    var pv = card("👀 Preview of the vote screen", "This is how the games look on the stage (games with notes are shown first here; the real vote shows as many options as you set in Voting).");
    var pvBox = el("div", "pv"); pv.appendChild(pvBox);
    var pb = el("div", "btns"); var show = el("button", "b", "🧪 Show it on the stage (practice vote)"); show.disabled = Boolean(S.running);
    show.title = "Saves first, then shows a practice vote on the stage page - nothing is switched";
    show.onclick = function () { doSave(false, true).then(function () { return act("/api/autopilot/preview-vote", {}, "Practice vote started"); }); }; pb.appendChild(show);
    pv.appendChild(pb); d.appendChild(pv);
    function drawPreview() {
      clear(pvBox);
      function hasN(g) { var p = "games." + g.id; return ((get(p + ".aka") || []).length || get(p + ".inspiredBy") || get(p + ".voteNote")) ? 1 : 0; }
      var on = catalog.games.filter(function (g) { return get("games." + g.id + ".enabled"); }).sort(function (a, b) { return hasN(b) - hasN(a); }).slice(0, Math.max(2, Math.min(6, get("vote.options") || 4)));
      if (!on.length) { pvBox.appendChild(el("p", "help", "Switch on some games in the Games tab first.")); return; }
      on.forEach(function (g, i) {
        var p = "games." + g.id, row = el("div", "popt"); row.appendChild(el("div", "pn", String(i + 1))); row.appendChild(el("div", "pe", g.emoji));
        var t = el("div", "pt"); t.appendChild(el("div", "pnm", g.name));
        var aka = get(p + ".aka") || [], ins = get(p + ".inspiredBy"), note = get(p + ".voteNote");
        if (get("display.showAka") && aka.length) t.appendChild(el("div", "paka", "Also known as: " + aka.join(" · ")));
        if (get("display.showAka") && ins) t.appendChild(el("div", "paka", "💡 " + ins));
        if (get("display.showVoteNotes") && note) t.appendChild(el("div", "pnt", "📝 " + note));
        row.appendChild(t); pvBox.appendChild(row);
      });
    }
    var pvT = null; function refreshPreview() { clearTimeout(pvT); pvT = setTimeout(drawPreview, 120); }
    drawPreview();

    var c = card("Your games", "");
    var tb = el("div", "toolbar");
    var f = el("select"); [["all", "All games"], ["on", "Only games switched on"], ["empty", "Games without notes yet"]].forEach(function (o) { var op = el("option", "", o[1]); op.value = o[0]; f.appendChild(op); }); f.value = ui.notesFilter;
    f.onchange = function () { ui.notesFilter = f.value; render(); }; tb.appendChild(f);
    var done = catalog.games.filter(function (g) { var p = "games." + g.id; return (get(p + ".aka") || []).length || get(p + ".inspiredBy") || get(p + ".voteNote"); }).length;
    tb.appendChild(el("span", "count", done + " of " + catalog.games.length + " games have notes")); c.appendChild(tb);
    function field(path, label, ph, max, isAka) {
      var w = el("div", "nf"); w.appendChild(el("label", "", label));
      var i = el("input"); i.type = "text"; i.placeholder = ph; i.maxLength = isAka ? 300 : max;
      var cur = get(path); i.value = isAka ? (cur || []).join(", ") : cur || "";
      var ct = el("small", "ct", isAka ? "up to " + L.akaCount + " names" : i.value.length + " / " + max);
      i.oninput = function () {
        if (isAka) { var seen = {}; set(path, i.value.split(/[,;|]+/).map(function (x) { return x.replace(/\s+/g, " ").trim().slice(0, L.akaChars); }).filter(function (x) { var k = x.toLowerCase(); if (!x || seen[k]) return false; seen[k] = 1; return true; }).slice(0, L.akaCount)); }
        else { set(path, i.value); ct.textContent = i.value.length + " / " + max; }
        refreshPreview();
      };
      if (isAka) i.onblur = function () { i.value = (get(path) || []).join(", "); };
      w.appendChild(i); w.appendChild(ct); return w;
    }
    var shown = 0;
    catalog.games.forEach(function (g) {
      var p = "games." + g.id, on = get(p + ".enabled"), has = (get(p + ".aka") || []).length || get(p + ".inspiredBy") || get(p + ".voteNote");
      if ((ui.notesFilter === "on" && !on) || (ui.notesFilter === "empty" && has)) return;
      shown++;
      var r = el("div", "nrow" + (on ? "" : " off")); r.appendChild(el("h3", "", g.emoji + " " + g.name + (on ? "" : "  (switched off)")));
      var gr = el("div", "ngrid");
      gr.appendChild(field(p + ".aka", "Also known as (other names)", "Other names, separated by commas", L.akaChars, true));
      gr.appendChild(field(p + ".inspiredBy", "Inspired by", "The game it is inspired by", L.inspiredBy));
      gr.appendChild(field(p + ".voteNote", "Note for viewers during the vote", "A short tip or note", L.voteNote));
      gr.appendChild(field(p + ".howTo", "“How to play” line (optional)", g.howTo, L.howTo));
      r.appendChild(gr); c.appendChild(r);
    });
    if (!shown) c.appendChild(el("p", "help", "Nothing to show with this filter."));
    d.appendChild(c);
    return d;
  }

  function tVoting() {
    var d = document.createDocumentFragment();
    d.appendChild(grid(card("The vote", "Used when the next game is “voted by the audience” (and for the first game if you chose that)."), [
      num("vote.seconds", "Voting time", 10, 600, "", "seconds"),
      num("vote.options", "Games to choose from", 2, 9),
      sel("vote.optionPick", "Which games are offered", [["random", "Random games"], ["weighted", "Random, favouring higher weight"], ["all", "Every switched-on game (max 9)"], ["fixed", "Always my list below"]], "", true),
      get("vote.optionPick") === "fixed" ? gameList("vote.fixedOptions", "My vote list", "Up to 9 games.", false) : null,
      chk("vote.includeReplayOption", "Also offer “play the current game again”"),
      sel("vote.method", "Viewers vote by typing…", [["number", "the number (1, 2, 3…)"], ["letter", "a letter (A, B, C…)"], ["name", "the game name"], ["any", "number or name"]]),
      chk("vote.changeVote", "A viewer can change their vote (last one counts)"),
      chk("vote.showCounts", "Show live vote counts on screen"),
      num("vote.maxVotesPerMinutePerUser", "Anti-spam: max votes per viewer per minute", 1, 120)
    ]));
    d.appendChild(grid(card("When the vote ends"), [
      num("vote.minVotes", "Minimum total votes", 1, 1000, "Fewer than this = no result (see below)."),
      sel("vote.tie", "A tie is decided by", [["random", "chance"], ["first", "the first listed game"], ["longest-waiting", "the game that waited longest"], ["revote", "a short second vote (max 2)"]]),
      sel("vote.noResult", "If nobody (enough) voted", [["random", "pick a random offered game"], ["default", "my default game"], ["replay", "play the same game again"], ["sequence", "next game of my list"]], "", true),
      get("vote.noResult") === "default" ? gameSelect("vote.defaultGameId", "Default game") : null,
      num("vote.resultSeconds", "Show the winner for", 2, 60, "", "seconds"),
      num("vote.extendSecondsIfClose", "Close vote: add time once", 0, 60, "If the top two are within 1 vote in the last 5 seconds. 0 = off.", "seconds")
    ]));
    var el0 = card("Who may vote", "A viewer may vote if ANY ticked rule fits them (or they are on the allow list). Followers / subscribers / moderators come from TikTok's data for their chat message; gifters / sharers / people who followed are remembered during this live.");
    grid(el0, [
      chk("eligibility.everyone", "Everyone"),
      chk("eligibility.followers", "Followers of the host"),
      chk("eligibility.subscribers", "Subscribers"),
      chk("eligibility.moderators", "Moderators"),
      chk("eligibility.gifters", "People who sent a gift in this live", "", true),
      get("eligibility.gifters") ? num("eligibility.giftMinCoins", "…at least this many coins", 1, 100000) : null,
      chk("eligibility.sharers", "People who shared the live")
    ]);
    d.appendChild(el0);
    d.appendChild(grid(card("Vote weight", "A vote counts several times for these viewers (the highest that applies to a viewer is used)."), [
      num("eligibility.weightFollower", "Follower", 1, 20), num("eligibility.weightSubscriber", "Subscriber", 1, 20), num("eligibility.weightGifter", "Gifter", 1, 20), num("eligibility.weightModerator", "Moderator", 1, 20)
    ]));
    d.appendChild(grid(card("Lists", "TikTok usernames, separated by commas or spaces (no @ needed)."), [
      area("eligibility.allowList", "Always allowed to vote"), area("eligibility.blockList", "Never allowed to vote")
    ]));
    var mem = card("This live's memory"); mem.appendChild(el("p", "help", "Remembered since the server started: " + S.memory.gifters + " gifter(s), " + S.memory.followers + " new follower(s), " + S.memory.sharers + " sharer(s)."));
    var rb = el("button", "b", "Forget them (start of a new live)"); rb.onclick = function () { act("/api/autopilot/reset-memory", {}, "Cleared"); }; mem.appendChild(rb); d.appendChild(mem);
    return d;
  }

  function tDisplay() {
    var d = document.createDocumentFragment();
    d.appendChild(grid(card("Texts on the stage"), [
      txt("display.voteTitle", "Vote title", "", 80), txt("display.breakTitle", "Next-game splash title", "", 60),
      txt("display.voteHint", "“How to vote” line", "Empty = made automatically from your vote method and who may vote.", 160)
    ]));
    var t = card("Rotating tips", "Shown under the vote and splash screens, one at a time. One tip per line.");
    t.appendChild(area("display.tips", "Tips", "", true)); t.appendChild(num("display.tipSeconds", "Change tip every", 3, 60, "", "seconds")); d.appendChild(t);
    d.appendChild(grid(card("Look"), [
      sel("display.theme", "Theme", [["dark", "Dark"], ["light", "Light"]]), color("display.accent", "Accent colour"),
      chk("display.showTimer", "Show the small session timer on the game"), chk("display.showUpNext", "Show “vote soon” in the last minute"),
      chk("display.showHowTo", "Show a one-line “how to play” on the next-game splash"),
      num("display.transitionSeconds", "Black loading screen between games", 1, 30, "", "seconds")
    ]));
    return d;
  }

  function tSafety() {
    var d = document.createDocumentFragment();
    d.appendChild(grid(card("If something goes wrong"), [
      sel("run.onDisconnect", "When TikTok stays disconnected", [["keep", "keep going (the platform reconnects by itself)"], ["pause", "pause the autopilot until it is back"], ["stop", "stop the autopilot"]], "", true),
      get("run.onDisconnect") !== "keep" ? num("run.disconnectGraceSeconds", "…after being disconnected for", 10, 3600, "", "seconds") : null,
      num("run.idleStopMinutes", "Stop if nobody types in chat for", 0, 600, "0 = never.", "minutes"),
      chk("run.resumeAfterRestart", "If the server restarts while running, carry on by itself")
    ]));
    var c = card("Protecting this panel");
    c.appendChild(el("p", "help", editKeyRequired ? "This site has a HOME edit key: every change here needs it. It is asked once and remembered in this browser." : "Anyone who knows this address can change the autopilot. To lock it, set HOME_EDIT_KEY in your hosting environment (the same key protects the HOME page)."));
    var kb = el("button", "b", "Enter / change edit key"); kb.onclick = function () { var k = window.prompt("HOME edit key:", key()); if (k !== null) { try { localStorage.setItem("apEditKey", k); } catch (e) {} flash("Key saved in this browser"); } }; c.appendChild(kb);
    d.appendChild(c);
    return d;
  }

  /* ---------- READY CHECK (top of the Run tab) ---------- */
  function readyCard() {
    var c = card("✅ Ready check", "Everything you prepared, at a glance.");
    var en = catalog.games.filter(function (g) { return get("games." + g.id + ".enabled"); });
    var withNotes = en.filter(function (g) { var p = "games." + g.id; return (get(p + ".aka") || []).length || get(p + ".inspiredBy") || get(p + ".voteNote"); });
    var withSet = en.filter(function (g) { return g.family && Object.keys(get("games." + g.id + ".settings") || {}).length; });
    function line(level, text, linkText, tabName) {
      var r = el("div", "warn " + level, (level === "good" ? "✅ " : level === "bad" ? "⛔ " : "ℹ️ ") + text);
      if (linkText) { var a = el("a", "", " " + linkText + " →"); a.href = "#"; a.onclick = function (e) { e.preventDefault(); tab = tabName; render(); window.scrollTo(0, 0); }; r.appendChild(a); }
      c.appendChild(r);
    }
    if (dirty()) { var r = el("div", "warn warn", "⚠️ You have changes that are not saved yet. "); var sb = el("button", "b go", "💾 Save now"); sb.onclick = function () { doSave(false); }; r.appendChild(sb); c.appendChild(r); }
    else line("good", "Your settings are saved" + (meta && meta.savedAt ? " (" + when(meta.savedAt) + ") and will be there next time you launch the platform." : "."));
    if (en.length < 2 && get("rotation.mode") === "vote") line("bad", "Only " + en.length + " game switched on - viewers need at least 2 to vote.", "Choose games", "games");
    else line("good", en.length + " games switched on.", "Change", "games");
    line(withSet.length ? "good" : "info", withSet.length + " of them have their own difficulty / length settings." + (withSet.length ? "" : " (Otherwise each game uses the settings it last had.)"), "Set them", "games");
    line(withNotes.length ? "good" : "info", withNotes.length + " of " + en.length + " have notes for your viewers (other names, inspired by, a note).", "Edit notes", "notes");
    return c;
  }

  /* ---------- notices at the top of every tab ---------- */
  function notices() {
    var f = document.createDocumentFragment();
    function box(cls, text, buttons) { var b = el("div", "notice " + cls); b.appendChild(el("div", "", text)); var bt = el("div", "btns tight"); buttons.forEach(function (x) { var k = el("button", "b sm " + (x[2] || ""), x[0]); k.onclick = x[1]; bt.appendChild(k); }); b.appendChild(bt); f.appendChild(b); }
    if (ui.draft) box("warn", "You have unsaved changes from " + when(ui.draft.t) + " that were never saved (the page was closed or reloaded). Bring them back?", [
      ["↩ Bring them back", function () { cfg = ui.draft.cfg; ui.draft = null; queueSave(); render(); }, "go"],
      ["Throw them away", function () { lsDel("apDraft"); ui.draft = null; render(); }]]);
    if (ui.backup) box("bad", "Nothing is saved on the server yet - this happens when the hosting wipes its disk after a redeploy. This browser still has a copy of your setup from " + when(ui.backup.t) + ".", [
      ["♻ Restore my setup", function () { call("POST", "/api/autopilot/import", { data: ui.backup.data }).then(function () { ui.backup = null; flash("Setup restored ✓"); return load(); }).catch(function (e) { window.alert(e.message); }); }, "go"],
      ["Ignore", function () { ui.backup = null; ui.hideBackup = true; render(); }]]);
    if (meta && meta.writable === false) box("bad", "The server cannot write to its disk (" + (meta.error || "read-only") + "). Your settings work now but will be lost at the next restart. See Setups → “Where is my setup stored?”.", []);
    if (meta && meta.source === "shipped" && !dirty()) box("good", "Loaded from the setup file shipped with this deployment. Press Save to keep it on the server too.", []);
    if (meta && meta.source === "backup") box("warn", "The main setup file was damaged - your last backup copy was loaded. Check your settings, then press Save.", []);
    return f;
  }

  /* ---------- SETUPS tab ---------- */
  function download(name, text) {
    var a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([text], { type: "application/json" })); a.download = name; document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  function tSetups() {
    var d = document.createDocumentFragment();

    var w = card("💾 Where is my setup stored?", "Press 💾 Save (bottom of the screen) once and your setup is kept on the server - you do not need to set it up again the next time you launch the platform.");
    var st = el("div", "stat");
    function stx(a, b) { var x = el("div"); x.appendChild(el("b", "", a)); x.appendChild(el("span", "", b)); st.appendChild(x); }
    stx("Last saved", meta && meta.savedAt ? when(meta.savedAt) : "never");
    stx("Loaded from", (meta && meta.sourceLabel) || "—");
    stx("Server disk", meta && meta.writable === false ? "⚠ not writable" : "OK ✓");
    stx("Not saved yet", dirty() ? "yes ●" : "no");
    w.appendChild(st);
    w.appendChild(el("p", "help", "Saved file on the server: " + (meta && meta.file || "data/autopilot.json")));
    var tip = el("details", "preset"); tip.appendChild(el("summary", "", "My host wipes files when I redeploy - how do I keep my setup?"));
    var ul = el("div", "pbody");
    [
      "Easiest: press “⬇ Download my setup file” below, put that file into the project's data/ folder, rename it autopilot-setup.json, and deploy. A fresh server loads it by itself.",
      "Or use a persistent disk: on Render add a Disk (mount path /var/data) and set the environment variable AUTOPILOT_FILE = /var/data/autopilot.json. Then your Save survives every redeploy.",
      "As a safety net, this browser also keeps a copy of your setup. If the server ever starts empty, this page offers to restore it."
    ].forEach(function (t) { ul.appendChild(el("p", "help", "• " + t)); });
    tip.appendChild(ul); w.appendChild(tip); d.appendChild(w);

    var bk = card("🧰 Backup file", "A single file with all your settings, notes and named setups. Keep it somewhere safe, or move your setup to another server.");
    var bb = el("div", "btns");
    var dl = el("button", "b go", "⬇ Download my setup file"); dl.onclick = function () { fetch("/api/autopilot/export", { cache: "no-store" }).then(function (r) { return r.json(); }).then(function (j) { download("autopilot-setup.json", JSON.stringify(j, null, 1)); }).catch(function (e) { window.alert(e.message); }); }; bb.appendChild(dl);
    var up = el("button", "b", "⬆ Restore from a file…"); var fi = el("input"); fi.type = "file"; fi.accept = ".json,application/json"; fi.style.display = "none";
    fi.onchange = function () {
      var f = fi.files && fi.files[0]; if (!f) return;
      var rd = new FileReader(); rd.onload = function () {
        if (!window.confirm("Replace your current settings with the ones in “" + f.name + "”? (Your named setups are kept and the file's are added.)")) return;
        call("POST", "/api/autopilot/import", { data: String(rd.result) }).then(function () { lsDel("apDraft"); flash("Restored ✓"); return load(); }).catch(function (e) { window.alert(e.message); });
      }; rd.readAsText(f); fi.value = "";
    };
    up.onclick = function () { fi.click(); }; bb.appendChild(up); bb.appendChild(fi);
    bk.appendChild(bb); d.appendChild(bk);

    var c = card("📁 Named setups", "Keep several complete setups (for example “Night stream”, “Quick rotation”) and switch between them in one click. The current settings are saved first.");
    var n = el("input"); n.type = "text"; n.placeholder = "Name of this setup, e.g. Night stream"; n.value = cfg.name || ""; c.appendChild(n);
    var b = el("div", "btns"); var sv = el("button", "b go", "💾 Save everything as this named setup");
    sv.onclick = function () { if (!n.value.trim()) { window.alert("Give the setup a name first."); return; } cfg.name = n.value.trim(); doSave(false, true).then(function () { return act("/api/autopilot/profiles", { name: n.value }, "Setup saved"); }).then(function () { return load(); }); };
    b.appendChild(sv); c.appendChild(b);
    if (!profiles.length) c.appendChild(el("p", "help", "No named setups yet."));
    var list = el("div"); profiles.forEach(function (p) {
      var r = el("div", "btns"); r.appendChild(el("b", "", "📁 " + p + (p === cfg.name ? "  (current)" : "")));
      var lb = el("button", "b", "Load"); lb.onclick = function () { if (dirty() && !window.confirm("You have unsaved changes - loading a setup replaces them. Continue?")) return; act("/api/autopilot/profiles/load", { name: p }, "Loaded").then(function () { lsDel("apDraft"); return load(); }); }; r.appendChild(lb);
      var db = el("button", "b stop", "Delete"); db.onclick = function () { if (window.confirm("Delete setup “" + p + "”?")) call("DELETE", "/api/autopilot/profiles/" + encodeURIComponent(p)).then(load); }; r.appendChild(db);
      list.appendChild(r);
    });
    c.appendChild(list); d.appendChild(c);

    var x = el("details", "preset"); x.appendChild(el("summary", "", "Advanced: settings as text"));
    var body = el("div", "pbody"); var ta = el("textarea"); ta.value = JSON.stringify(cfg, null, 1); ta.style.minHeight = "180px"; body.appendChild(ta);
    var xb = el("div", "btns"); var im = el("button", "b acc", "Use what is in the box"); im.onclick = function () { try { var o = JSON.parse(ta.value); cfg = o; queueSave(); flash("Loaded into the editor - press Save to keep it"); render(); } catch (e) { window.alert("That is not valid settings text."); } }; xb.appendChild(im); body.appendChild(xb);
    x.appendChild(body); d.appendChild(x);
    return d;
  }

  /* ---------- render ---------- */
  function secs(ts) { return Math.max(0, Math.ceil((ts - (Date.now() + skew)) / 1000)); }
  function mmss(s) { return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); }
  function render() {
    if (!cfg || !S || !catalog) return;
    var y = window.scrollY;
    clear(tabsEl);
    TABS.forEach(function (t) { var b = el("button", t[0] === tab ? "on" : "", t[1]); b.onclick = function () { tab = t[0]; render(); window.scrollTo(0, 0); }; tabsEl.appendChild(b); });
    clear(main);
    main.appendChild(notices());
    var fn = { run: tRun, rotation: tRotation, games: tGames, notes: tNotes, voting: tVoting, display: tDisplay, safety: tSafety, setups: tSetups }[tab];
    main.appendChild(fn());
    window.scrollTo(0, y);
    updatePill(); renderBar();
  }
  function updatePill() {
    if (!S) return;
    pillEl.textContent = !S.running ? "OFF" : S.paused ? "PAUSED" : "RUNNING · " + S.phase.toUpperCase();
    pillEl.className = "pill " + (!S.running ? "off" : S.paused ? "pause" : "on");
  }

  function onState(st) {
    var was = S && S.running;
    S = st; skew = st.serverNow - Date.now();
    updatePill();
    if (was !== st.running) renderBar();
    if (tab === "run" || tab === "voting") { var a = document.activeElement; if (!(a && /INPUT|SELECT|TEXTAREA/.test(a.tagName))) render(); }
  }
  function load() {
    return fetch("/api/autopilot", { cache: "no-store" }).then(function (r) { return r.json(); }).then(function (j) {
      cfg = j.config; S = j.state; catalog = j.catalog; profiles = j.profiles || []; editKeyRequired = j.editKeyRequired; meta = j.meta || {}; skew = S.serverNow - Date.now();
      savedStr = stable(cfg); barState = "";
      // unsaved work from a previous visit?
      var dr = readJSON("apDraft"); ui.draft = dr && dr.cfg && stable(dr.cfg) !== savedStr ? dr : null; if (!ui.draft) lsDel("apDraft");
      // the server starts empty but this browser has a backup (the hosting wiped its disk)?
      var bk = readJSON("apBackup"); ui.backup = !ui.hideBackup && meta.source === "defaults" && bk && bk.data && bk.data.config && stable(bk.data.config) !== savedStr ? bk : null;
      if (meta.source !== "defaults" && meta.writable !== false) refreshBackup(); // keep this browser's copy in step with what the server has (never overwrite it with an empty server)
      render();
    });
  }
  load();
  try { var es = new EventSource("/api/autopilot/stream"); es.onmessage = function (e) { try { onState(JSON.parse(e.data)); } catch (x) {} }; } catch (e) {}
  setInterval(function () { if (S && S.running && tab === "run") { var a = document.activeElement; if (!(a && /INPUT|SELECT|TEXTAREA/.test(a.tagName))) render(); } }, 1000);
})();
