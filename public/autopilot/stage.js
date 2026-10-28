/* AFK AUTOPILOT - STAGE (update 109)
   The page the host captures in TikTok LIVE Studio / OBS while the autopilot runs.
   It FOLLOWS the server engine (GET /api/autopilot/stream): it shows the current game in a frame, draws the vote / result / leaderboard /
   next-game screens, applies the game's preset settings through the game page's own socket, and reports round progress back.
   Nothing here decides anything - the engine on the server owns the schedule, so reloading this page never loses the plan. */
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var frame = $("game"), ov = $("ov"), card = $("card"), tipEl = $("tip"), chip = $("chip"), banner = $("banner"), cover = $("cover"), coverText = $("coverText"), bar = $("bar");
  var S = null, skew = 0;
  var loaded = { loadSeq: -1, id: "" }, appliedSeq = -1, applyTimer = null, loadedAt = 0, coverUntil = 0;
  var roundsDone = 0, lastCounted = -1, lastTipAt = 0, tipIdx = 0;
  var lastSig = "";
  var key = function () { try { return localStorage.getItem("apEditKey") || ""; } catch (e) { return ""; } };

  function nowS() { return Date.now() + skew; }
  function left(ts) { return Math.max(0, Math.ceil((ts - nowS()) / 1000)); }
  function mmss(s) { return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function api(path, body) {
    var h = { "Content-Type": "application/json" };
    if (key()) h["x-edit-key"] = key();
    return fetch(path, { method: "POST", headers: h, body: JSON.stringify(body || {}) }).then(function (r) {
      if (r.status === 401) { var k = window.prompt("This site is protected. Enter the HOME edit key:"); if (k) { try { localStorage.setItem("apEditKey", k); } catch (e) {} return api(path, body); } }
      return r.json();
    });
  }

  /* ---------- the game frame ---------- */
  function loadGame(cur) {
    loaded = { loadSeq: cur.loadSeq, id: cur.id };
    appliedSeq = -1; roundsDone = 0; lastCounted = -1; loadedAt = Date.now();
    var hold = ((S.display && S.display.transitionSeconds) || 4) * 1000;
    coverUntil = Date.now() + hold;
    coverText.textContent = (cur.emoji || "🎮") + " " + cur.name;
    cover.hidden = false;
    frame.hidden = true;
    frame.onload = function () {
      frame.hidden = false;
      setTimeout(function () { if (Date.now() >= coverUntil - 50) cover.hidden = true; }, Math.max(300, coverUntil - Date.now()));
    };
    frame.src = cur.path + (cur.path.indexOf("?") < 0 ? "?" : "&") + "nobadge&autopilot=1";
    clearInterval(applyTimer);
    var tries = 0;
    applyTimer = setInterval(function () { tries++; if (tryApply(cur) || tries > 60) clearInterval(applyTimer); }, 800);
  }
  function ps() { try { return frame.contentWindow && frame.contentWindow.PlatformSync; } catch (e) { return null; } }
  function tryApply(cur) {
    var p = ps();
    if (!p || !p.ready || !p.ready()) return false;
    var gs = p.gameState && p.gameState();
    if (!cur.family) { appliedSeq = cur.applySeq; return true; } // these games run with the settings saved inside them
    var plat = S.platform || {};
    // in Live mode wait until the game itself is linked to the shared connection (platform-sync does that), at most ~12 s
    if (plat.mode === "live" && !(gs && gs.game && gs.game.mode === "live") && Date.now() - loadedAt < 12000) return false;
    p.act("reset_total_leaderboard", {});               // the session leaderboard starts from zero
    p.act("apply_settings", cur.preset || { autoContinue: true }); // same message as the game's own Settings screen (starts a fresh round)
    appliedSeq = cur.applySeq;
    return true;
  }

  /* ---------- reporting back ---------- */
  function report() {
    if (!S || !S.current || loaded.loadSeq !== S.current.loadSeq) return;
    var p = ps(), gs = p && p.gameState ? p.gameState() : null, g = gs && gs.game;
    var status = g && g.status ? String(g.status) : "";
    var rn = g && Number(g.roundNumber) || 0;
    if (S.current.family && g) {
      if (status && status !== "live" && status !== "idle" && rn !== lastCounted && Date.now() - loadedAt > 4000) { lastCounted = rn; roundsDone += 1; }
    }
    var lb = gs && gs.totalLeaderboard ? gs.totalLeaderboard : [];
    fetch("/api/autopilot/report", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
      game: S.current.id, loadSeq: S.current.loadSeq, applied: appliedSeq, status: status, roundNumber: rn, roundsDone: roundsDone,
      leaderboard: lb.slice(0, 10).map(function (x) { return { username: x.username, score: x.score, avatarUrl: x.avatarUrl || null }; })
    }) }).then(function (r) { return r.json(); }).then(function (j) { if (j && j.serverNow) skew = j.serverNow - Date.now(); }).catch(function () {});
  }
  setInterval(report, 2000);

  /* ---------- screens ---------- */
  function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); }
  function showOv(on) { ov.hidden = !on; }
  function tipLine() {
    var tips = (S.display && S.display.tips) || [];
    if (!tips.length) return "";
    var every = ((S.display && S.display.tipSeconds) || 8) * 1000;
    if (Date.now() - lastTipAt > every) { lastTipAt = Date.now(); tipIdx = (tipIdx + 1) % tips.length; }
    return tips[tipIdx % tips.length];
  }
  /* viewer notes of a game (update 112): other names, inspired by, and the host's note. where = "vote" | "splash" (each has its own on/off switch) */
  function notesBlock(o, where) {
    var d = S.display || {}, box = el("div", "gnotes");
    var showAka = d.showAka !== false, showNote = where === "vote" ? d.showVoteNotes !== false : d.showNotesOnSplash !== false;
    if (showAka && o.aka && o.aka.length) box.appendChild(el("div", "aka", "Also known as: " + o.aka.join(" · ")));
    if (showAka && o.inspiredBy) box.appendChild(el("div", "aka", "💡 " + o.inspiredBy));
    if (showNote && o.note) box.appendChild(el("div", "nt", "📝 " + o.note));
    return box.childNodes.length ? box : null;
  }
  function drawVote() {
    var v = S.vote, d = S.display;
    clear(card);
    card.appendChild(el("h1", "", (v.preview ? "🧪 PRACTICE · " : "") + (d.voteTitle || "Vote for the next game!")));
    if (v.revotes) card.appendChild(el("p", "sub", "Tie! Second vote between the leaders"));
    card.appendChild(el("div", "how", S.voteInfo.hint));
    var total = v.total || 0, max = Math.max.apply(null, v.options.map(function (o) { return o.count || 0; }).concat([1]));
    var box = el("div", "opts" + (v.options.length >= 6 ? " dense" : ""));
    v.options.forEach(function (o) {
      var row = el("div", "opt"), fill = el("div", "fill");
      fill.style.width = o.count == null ? "0" : (total ? Math.round((o.count / Math.max(total, 1)) * 100) : 0) + "%";
      row.appendChild(fill);
      row.appendChild(el("div", "n", S.voteInfo.letters ? String.fromCharCode(64 + o.n) : String(o.n)));
      row.appendChild(el("div", "e", o.emoji));
      var tcell = el("div", "t"); tcell.appendChild(el("div", "nm", o.name));
      var nb = notesBlock(o, "vote"); if (nb) tcell.appendChild(nb);
      row.appendChild(tcell);
      if (o.count != null) { var c = el("div", "c", String(o.count)); c.appendChild(el("small", "", total ? Math.round((o.count / total) * 100) + "%" : "0%")); row.appendChild(c); }
      box.appendChild(row);
    });
    card.appendChild(box);
    var secs = left(v.endsAt), dur = Math.max(1, (v.endsAt - v.startedAt) / 1000);
    var b = el("div", "bar2"), i = el("i"); i.style.width = Math.min(100, (secs / dur) * 100) + "%"; b.appendChild(i); card.appendChild(b);
    card.appendChild(el("div", "meta", "⏱ " + secs + " s left" + (v.total != null ? " · " + v.voters + " voter" + (v.voters === 1 ? "" : "s") : "")));
    tipEl.textContent = tipLine();
  }
  function drawResult() {
    var r = S.result; if (!r) return;
    clear(card);
    card.appendChild(el("h1", "", (r.preview ? "🧪 " : "🏆 ") + r.emoji + " " + r.winnerName));
    card.appendChild(el("p", "sub", r.note ? r.note : r.total + " vote" + (r.total === 1 ? "" : "s") + " from " + r.voters + " viewer" + (r.voters === 1 ? "" : "s")));
    var wn = notesBlock(r, "splash"); if (wn) { wn.classList.add("center"); card.appendChild(wn); }
    var box = el("div", "opts"), tot = Math.max(1, r.total);
    r.counts.forEach(function (o) {
      var row = el("div", "opt" + (o.id === r.winnerId ? " win" : "")), fill = el("div", "fill");
      fill.style.width = Math.round((o.count / tot) * 100) + "%"; row.appendChild(fill);
      row.appendChild(el("div", "n", String(o.n || "•"))); row.appendChild(el("div", "e", o.emoji)); row.appendChild(el("div", "t", o.name)); row.appendChild(el("div", "c", String(o.count)));
      box.appendChild(row);
    });
    card.appendChild(box);
    if (!r.preview) card.appendChild(el("div", "meta", "Starting in " + left(S.phaseEndsAt) + " s…"));
    tipEl.textContent = "";
  }
  function drawSummary() {
    clear(card);
    card.appendChild(el("h1", "", "🏅 Top players"));
    card.appendChild(el("p", "sub", (S.current ? S.current.name + " · " : "") + "session leaderboard"));
    var ul = el("ul", "lb"), medals = ["🥇", "🥈", "🥉"];
    (S.leaderboard || []).slice(0, 5).forEach(function (x, i) {
      var li = el("li"); li.appendChild(el("b", "", medals[i] || String(i + 1)));
      if (x.avatarUrl) { var im = el("img"); im.src = x.avatarUrl; im.alt = ""; im.referrerPolicy = "no-referrer"; li.appendChild(im); }
      li.appendChild(el("div", "", x.username)); li.appendChild(el("span", "", x.score + " pts")); ul.appendChild(li);
    });
    card.appendChild(ul);
    card.appendChild(el("div", "meta", "Voting for the next game in " + left(S.phaseEndsAt) + " s…"));
    tipEl.textContent = "";
  }
  function drawBreak() {
    var n = S.next; if (!n) return;
    clear(card);
    card.appendChild(el("p", "sub", S.display.breakTitle || "Next game"));
    card.appendChild(el("h1", "", n.emoji + " " + n.name));
    var bn = notesBlock(n, "splash"); if (bn) { bn.classList.add("center"); card.appendChild(bn); }
    if (S.display.showHowTo && n.howTo) card.appendChild(el("div", "how", n.howTo));
    card.appendChild(el("div", "big", String(left(S.phaseEndsAt))));
    tipEl.textContent = tipLine();
  }
  function drawStarting() {
    clear(card);
    card.appendChild(el("h1", "", "🤖 Autopilot starting"));
    card.appendChild(el("p", "sub", "The first game begins in"));
    card.appendChild(el("div", "big", String(left(S.phaseEndsAt))));
    tipEl.textContent = "";
  }

  function render() {
    if (!S) return;
    document.body.classList.toggle("light", S.display && S.display.theme === "light");
    document.body.classList.toggle("dark", !(S.display && S.display.theme === "light"));
    if (S.display && S.display.accent) document.documentElement.style.setProperty("--accent", S.display.accent);

    // which game is in the frame
    if (S.current && (S.running || S.current.stopped) && (loaded.loadSeq !== S.current.loadSeq)) loadGame(S.current);
    if (S.current && loaded.loadSeq === S.current.loadSeq && S.current.applySeq !== appliedSeq && S.running && !applyTimerActive()) {
      var cur = S.current; clearInterval(applyTimer); var t = 0; applyTimer = setInterval(function () { t++; if (tryApply(cur) || t > 40) clearInterval(applyTimer); }, 800);
    }
    if (!S.current && !S.running) { frame.hidden = true; cover.hidden = true; }
    if (!cover.hidden && Date.now() >= coverUntil && !frame.hidden) cover.hidden = true;

    var ph = S.running ? S.phase : "idle";
    var overlay = false;
    if (S.paused) { banner.hidden = false; banner.textContent = "⏸ Paused — back in a moment"; } else banner.hidden = true;
    if (ph === "starting") { drawStarting(); overlay = true; }
    else if (ph === "voting" && S.vote) { drawVote(); overlay = true; }
    else if (ph === "result") { drawResult(); overlay = true; }
    else if (ph === "summary") { drawSummary(); overlay = true; }
    else if (ph === "break") { drawBreak(); overlay = true; }
    var sig = ph + "|" + (S.vote ? S.vote.startedAt : "") + "|" + (S.next ? S.next.id : "");
    if (overlay && sig !== lastSig) { card.classList.remove("pop"); void card.offsetWidth; card.classList.add("pop"); }
    lastSig = sig;
    showOv(overlay);

    // small timer chip while a game runs
    var showChip = S.running && (ph === "playing" || ph === "wrapup") && S.current && S.display && S.display.showTimer;
    chip.hidden = !showChip;
    if (showChip) {
      clear(chip);
      chip.className = "chip" + (ph === "wrapup" ? " warn" : "");
      chip.appendChild(el("span", "dot"));
      chip.appendChild(el("span", "", S.current.emoji + " " + S.current.name));
      var rem = left(S.current.sessionEndsAt);
      chip.appendChild(el("i", "", ph === "wrapup" ? "last round…" : "⏱ " + mmss(rem)));
      if (S.display.showUpNext && ph === "playing" && rem <= 60) chip.appendChild(el("i", "", "· vote soon"));
    }
    $("barState").textContent = S.running ? (S.paused ? "paused" : ph) + (S.current ? " · " + S.current.name : "") : "off";
    $("bPause").textContent = S.paused ? "▶ Resume" : "⏸ Pause";
  }
  function applyTimerActive() { return applyTimer != null && appliedSeq !== (S && S.current && S.current.applySeq) && Date.now() - loadedAt < 60000; }

  /* ---------- feed from the server ---------- */
  function onState(st) { S = st; if (st.serverNow) skew = st.serverNow - Date.now(); render(); }
  function connect() {
    var es;
    try { es = new EventSource("/api/autopilot/stream"); } catch (e) { return poll(); }
    es.onmessage = function (e) { try { onState(JSON.parse(e.data)); } catch (x) {} };
    es.onerror = function () { /* the browser reconnects by itself; polling below is the safety net */ };
  }
  function poll() { fetch("/api/autopilot", { cache: "no-store" }).then(function (r) { return r.json(); }).then(function (j) { if (j && j.state) onState(j.state); }).catch(function () {}); }
  connect(); poll(); setInterval(poll, 6000);
  setInterval(render, 500); // countdowns

  /* ---------- host bar (Esc) ---------- */
  function toggleBar(on) { bar.hidden = on === undefined ? !bar.hidden : !on; }
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") toggleBar(); });
  $("bHide").onclick = function () { toggleBar(false); };
  $("bPause").onclick = function () { api(S && S.paused ? "/api/autopilot/resume" : "/api/autopilot/pause"); };
  $("bSkip").onclick = function () { api("/api/autopilot/skip"); };
  $("bStop").onclick = function () { if (window.confirm("Stop the autopilot? The current game stays on screen.")) api("/api/autopilot/stop"); };
})();
