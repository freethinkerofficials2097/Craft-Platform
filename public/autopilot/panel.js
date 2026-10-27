/* AFK AUTOPILOT - control panel (update 109).  Prepare everything ahead of time, press Start, walk away.
   Talks to server/autopilot/autopilot-engine.js (REST + Server-Sent Events).  Settings auto-save a moment after every change. */
(function () {
  "use strict";
  var main = document.getElementById("main"), tabsEl = document.getElementById("tabs"), pillEl = document.getElementById("pill"), savedEl = document.getElementById("saved");
  var cfg = null, S = null, catalog = null, profiles = [], editKeyRequired = false, tab = "run", saveTimer = null, skew = 0;
  var TABS = [["run", "▶ Run"], ["rotation", "🔁 Schedule"], ["games", "🎮 Games"], ["voting", "🗳️ Voting"], ["display", "🎨 Stage look"], ["safety", "🛡️ Safety"], ["setups", "💾 Setups"]];

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

  /* ---------- config helpers ---------- */
  function get(path) { return path.split(".").reduce(function (o, k) { return o == null ? o : o[k]; }, cfg); }
  function set(path, v) {
    var p = path.split("."), o = cfg;
    for (var i = 0; i < p.length - 1; i++) { if (o[p[i]] == null || typeof o[p[i]] !== "object") o[p[i]] = {}; o = o[p[i]]; }
    o[p[p.length - 1]] = v;
    queueSave();
  }
  function queueSave() {
    savedEl.textContent = "Saving…";
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      call("PUT", "/api/autopilot/config", cfg).then(function () { flash("Saved ✓"); }).catch(function (e) { savedEl.textContent = "⚠ " + e.message; });
    }, 900);
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

  function presetEditor(g) {
    var det = el("details", "preset"); det.appendChild(el("summary", "", "Gameplay settings for " + g.name));
    if (!g.family) { det.appendChild(el("p", "help", "This game runs with the settings you saved inside the game itself. The autopilot still starts, times and switches it.")); return det; }
    var path = "games." + g.id + ".settings";
    det.appendChild(el("p", "help", "Leave a field empty to keep what the game already uses. These are sent to the game every time it starts in a session."));
    var gr = el("div", "grid");
    g.keys.forEach(function (k) {
      var f = catalog.fields[k], p = path + "." + k, cur = get(p), node;
      if (!f) return;
      if (f.type === "bool") {
        var s = el("select"); [["", "(keep)"], ["true", "On"], ["false", "Off"]].forEach(function (o) { var op = el("option", "", o[1]); op.value = o[0]; s.appendChild(op); });
        s.value = cur === undefined ? "" : String(cur); s.onchange = function () { setPreset(path, k, s.value === "" ? undefined : s.value === "true"); }; node = wrap(f.label, "", s);
      } else if (f.type === "select") {
        var s2 = el("select"); var k0 = el("option", "", "(keep)"); k0.value = ""; s2.appendChild(k0);
        f.options.forEach(function (o) { var op = el("option", "", o[1]); op.value = o[0]; s2.appendChild(op); });
        s2.value = cur === undefined ? "" : String(cur); s2.onchange = function () { setPreset(path, k, s2.value === "" ? undefined : s2.value); }; node = wrap(f.label, "", s2);
      } else if (f.type === "number") {
        var i = el("input"); i.type = "number"; i.min = f.min; i.max = f.max; i.placeholder = "(keep)"; i.value = cur === undefined ? "" : cur;
        i.oninput = function () { setPreset(path, k, i.value === "" ? undefined : Number(i.value)); }; node = wrap(f.label, "", i);
      } else if (f.type === "regions") {
        var choices = (catalog.regions[g.id] || []), box = el("div", "cb"), sel0 = cur || [];
        choices.forEach(function (r) { var lab = el("label"); var c = el("input"); c.type = "checkbox"; c.checked = sel0.indexOf(r[0]) >= 0; c.onchange = function () { var now = (get(p) || []).slice(); var ix = now.indexOf(r[0]); if (c.checked && ix < 0) now.push(r[0]); if (!c.checked && ix >= 0) now.splice(ix, 1); setPreset(path, k, now.length ? now : undefined); }; lab.appendChild(c); lab.appendChild(document.createTextNode(r[1])); box.appendChild(lab); });
        node = wrap(f.label + " (none ticked = keep)", "", box);
      }
      if (node) gr.appendChild(node);
    });
    det.appendChild(gr);
    return det;
  }
  function setPreset(path, k, v) { var o = get(path); if (!o || typeof o !== "object") { set(path, {}); o = get(path); } if (v === undefined) delete o[k]; else o[k] = v; queueSave(); }

  function tGames() {
    var d = document.createDocumentFragment();
    var c = card("Games the autopilot may run", "Tick the games you want in the rotation. “Minutes” and “Rounds” override the default session for that game (0 = default). “Weight” matters for the weighted / weighted-vote picks.");
    var b = el("div", "btns");
    var all = el("button", "b", "Switch all on"); all.onclick = function () { catalog.games.forEach(function (g) { set("games." + g.id + ".enabled", true); }); render(); };
    var none = el("button", "b", "Switch all off"); none.onclick = function () { catalog.games.forEach(function (g) { set("games." + g.id + ".enabled", false); }); render(); };
    b.appendChild(all); b.appendChild(none); c.appendChild(b);
    var t = el("table"), hr = el("tr"); ["On", "Game", "Minutes", "Rounds", "Weight"].forEach(function (x) { hr.appendChild(el("th", "", x)); }); t.appendChild(hr);
    catalog.games.forEach(function (g) {
      var p = "games." + g.id, on = get(p + ".enabled");
      var r = el("tr", on ? "" : "off");
      var td0 = el("td"); var cb = el("input"); cb.type = "checkbox"; cb.checked = Boolean(on); cb.onchange = function () { set(p + ".enabled", cb.checked); r.className = cb.checked ? "" : "off"; }; td0.appendChild(cb); r.appendChild(td0);
      var td1 = el("td"); td1.appendChild(el("b", "", g.emoji + " " + g.name)); td1.appendChild(el("div", "help", g.howTo)); td1.lastChild.style.cssText = "color:#a9acd6;font-size:12px"; r.appendChild(td1);
      [["minutes", 0, 240], ["rounds", 0, 100], ["weight", 1, 10]].forEach(function (a) {
        var td = el("td"); var i = el("input"); i.type = "number"; i.min = a[1]; i.max = a[2]; i.value = get(p + "." + a[0]); i.oninput = function () { var v = Number(i.value); if (isFinite(v)) set(p + "." + a[0], Math.min(a[2], Math.max(a[1], v))); }; td.appendChild(i); r.appendChild(td);
      });
      t.appendChild(r);
      var pr = el("tr"); var tdp = el("td"); tdp.colSpan = 5; tdp.appendChild(presetEditor(g)); pr.appendChild(tdp); t.appendChild(pr);
    });
    c.appendChild(t); d.appendChild(c);
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

  function tSetups() {
    var d = document.createDocumentFragment();
    var c = card("Setups", "Save the whole configuration under a name (for example “Night stream”, “Quick rotation”) and switch between them in one click.");
    var n = el("input"); n.type = "text"; n.placeholder = "Name of this setup"; n.value = cfg.name || ""; c.appendChild(n);
    var b = el("div", "btns"); var sv = el("button", "b go", "💾 Save current settings as this setup"); sv.onclick = function () { clearTimeout(saveTimer); call("PUT", "/api/autopilot/config", cfg).then(function () { return act("/api/autopilot/profiles", { name: n.value }, "Setup saved"); }).then(load); }; b.appendChild(sv); c.appendChild(b);
    var ul = el("div"); profiles.forEach(function (p) {
      var r = el("div", "btns"); r.appendChild(el("b", "", "📁 " + p));
      var lb = el("button", "b", "Load"); lb.onclick = function () { act("/api/autopilot/profiles/load", { name: p }, "Loaded").then(load); }; r.appendChild(lb);
      var db = el("button", "b stop", "Delete"); db.onclick = function () { if (window.confirm("Delete setup “" + p + "”?")) call("DELETE", "/api/autopilot/profiles/" + encodeURIComponent(p)).then(load); }; r.appendChild(db);
      ul.appendChild(r);
    });
    c.appendChild(ul); d.appendChild(c);
    var x = card("Export / import", "Copy your settings to another server, or back them up.");
    var ta = el("textarea"); ta.value = JSON.stringify(cfg, null, 1); ta.style.minHeight = "160px"; x.appendChild(ta);
    var xb = el("div", "btns"); var im = el("button", "b acc", "Import what is in the box"); im.onclick = function () { try { var o = JSON.parse(ta.value); call("PUT", "/api/autopilot/config", o).then(load).then(function () { flash("Imported ✓"); }); } catch (e) { window.alert("That is not valid settings text."); } }; xb.appendChild(im); x.appendChild(xb); d.appendChild(x);
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
    var fn = { run: tRun, rotation: tRotation, games: tGames, voting: tVoting, display: tDisplay, safety: tSafety, setups: tSetups }[tab];
    main.appendChild(fn());
    window.scrollTo(0, y);
    updatePill();
  }
  function updatePill() {
    if (!S) return;
    pillEl.textContent = !S.running ? "OFF" : S.paused ? "PAUSED" : "RUNNING · " + S.phase.toUpperCase();
    pillEl.className = "pill " + (!S.running ? "off" : S.paused ? "pause" : "on");
  }

  function onState(st) {
    S = st; skew = st.serverNow - Date.now();
    updatePill();
    if (tab === "run" || tab === "voting") { var a = document.activeElement; if (!(a && /INPUT|SELECT|TEXTAREA/.test(a.tagName))) render(); }
  }
  function load() {
    return fetch("/api/autopilot", { cache: "no-store" }).then(function (r) { return r.json(); }).then(function (j) {
      cfg = j.config; S = j.state; catalog = j.catalog; profiles = j.profiles || []; editKeyRequired = j.editKeyRequired; skew = S.serverNow - Date.now();
      render();
    });
  }
  load();
  try { var es = new EventSource("/api/autopilot/stream"); es.onmessage = function (e) { try { onState(JSON.parse(e.data)); } catch (x) {} }; } catch (e) {}
  setInterval(function () { if (S && S.running && tab === "run") { var a = document.activeElement; if (!(a && /INPUT|SELECT|TEXTAREA/.test(a.tagName))) render(); } }, 1000);
})();
