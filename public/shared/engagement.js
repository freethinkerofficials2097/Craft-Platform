/* ==========================================================================
   ENGAGEMENT — shared, platform-wide Gift / Like / Share alerts.

   Drop this one script tag into any game page:
     <script src="/shared/engagement.js"></script>

   Entirely self-contained (injects its own <style>, same pattern as
   shared/celebration.js) so no extra CSS file needs linking, and it never
   touches game-specific DOM — only its own small, fixed-position layer on
   top of whatever game is on screen, so it can never make the actual game
   board stutter or lag (CSS transforms/opacity only, no per-frame JS).

   Card layout (clean, three rows, never cramped):
     Row 1 — avatar + username
     Row 2 — what happened
     Row 3 — a short, warm appreciation line
     Row 4 (optional) — a small stat pill (coin total, milestone total)
   ...next to a glossy, gently-rotating "3D badge" whose icon + color theme
   echoes the actual gift (rose, galaxy, lion, etc.) without reproducing
   any of TikTok's own copyrighted artwork — every badge here is original,
   pure-CSS gradient/shadow work.
   HOST TOOLS (statistics + fake-alert tester) no longer float over the game.
   They live inside each game's own Settings panel: put
     <div data-engagement-tools></div>
   anywhere in a settings panel and this script fills it in automatically.
   ========================================================================== */
(function () {
  if (window.Engagement) return; // don't double-init if the tag is ever included twice

  // -------------------------------------------------------------- styles --
  const STYLE_ID = "engagement-style";
  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      #eng-alert-layer{
        position:fixed; top:calc(14px + var(--live-safe-top, 0px)); left:50%; transform:translateX(-50%);
        z-index:9600; pointer-events:none; display:flex; justify-content:center;
        width:min(94vw, 440px); perspective:700px;
      }
      .eng-card{
        display:flex; align-items:center; gap:14px;
        background:linear-gradient(180deg, rgba(28,28,34,.97), rgba(20,20,25,.97));
        color:#fff;
        border:1px solid rgba(255,255,255,.14);
        border-radius:18px; padding:12px 18px 12px 12px;
        box-shadow:0 14px 32px rgba(0,0,0,.4);
        font-family:"Quicksand","Manrope",system-ui,sans-serif;
        max-width:100%; width:100%;
        opacity:0; transform:translateY(-16px) scale(.92);
        transition:opacity .22s ease, transform .22s cubic-bezier(.34,1.56,.64,1);
        will-change:opacity, transform;
      }
      .eng-card.eng-show{ opacity:1; transform:translateY(0) scale(1); }

      /* ---- the 3D gift badge ---- */
      .eng-badge-wrap{ position:relative; flex:none; width:56px; height:56px; }
      .eng-badge{
        position:absolute; inset:0; border-radius:50%;
        display:flex; align-items:center; justify-content:center; font-size:26px;
        background:
          radial-gradient(circle at 32% 28%, rgba(255,255,255,.85), rgba(255,255,255,0) 42%),
          linear-gradient(145deg, var(--eng-from, #ffd76a), var(--eng-to, #e0245e));
        box-shadow:
          inset 0 -7px 10px rgba(0,0,0,.28),
          inset 0 5px 7px rgba(255,255,255,.4),
          0 6px 16px rgba(0,0,0,.4);
        animation: engBadgeSway 3.4s ease-in-out infinite;
        transform-style:preserve-3d;
      }
      @keyframes engBadgeSway{
        0%,100%{ transform:rotateY(0deg) rotateX(6deg) scale(1); }
        50%{ transform:rotateY(20deg) rotateX(-4deg) scale(1.04); }
      }
      /* spinning glossy ring, confetti-tier only */
      .eng-card.eng-confetti .eng-badge-wrap::before{
        content:""; position:absolute; inset:-5px; border-radius:50%;
        background:conic-gradient(from 0deg, transparent 0%, rgba(255,255,255,.85) 12%, transparent 30%);
        animation: engRingSpin 1.4s linear infinite;
      }
      @keyframes engRingSpin{ to{ transform:rotate(360deg); } }
      .eng-card.eng-confetti .eng-badge{ box-shadow: inset 0 -7px 10px rgba(0,0,0,.28), inset 0 5px 7px rgba(255,255,255,.4), 0 0 20px var(--eng-to, #e0245e), 0 6px 16px rgba(0,0,0,.4); }

      /* ---- text rows ---- */
      .eng-body{ min-width:0; flex:1; display:flex; flex-direction:column; gap:3px; }
      .eng-row-main{ display:flex; align-items:center; gap:7px; min-width:0; }
      .eng-mini-avatar{
        width:20px; height:20px; border-radius:50%; flex:none; object-fit:cover;
        border:1.5px solid rgba(255,255,255,.5); background:rgba(255,255,255,.15);
        display:flex; align-items:center; justify-content:center; font-size:11px;
      }
      .eng-username{ font-weight:800; font-size:14px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:78%; }
      .eng-action{ font-weight:600; font-size:13.5px; color:#EDEDF2; line-height:1.3; }
      .eng-wish{ font-size:12px; font-style:italic; color:#C9C9D4; line-height:1.3; }
      .eng-stat-row{ margin-top:1px; }
      .eng-stat-pill{
        display:inline-block; font-size:10.5px; font-weight:800; letter-spacing:.02em;
        padding:2px 9px; border-radius:999px; color:#1a1a1f;
        background:linear-gradient(120deg, #ffe9a8, #ffd76a);
      }

      /* ---- tier accents on the card border/shadow ---- */
      .eng-card.eng-pop{ animation: engPop .5s ease; border-color:rgba(255,255,255,.14); }
      @keyframes engPop{
        0%{ transform:translateY(-16px) scale(.85); }
        55%{ transform:translateY(2px) scale(1.05); }
        100%{ transform:translateY(0) scale(1); }
      }
      .eng-card.eng-pop-big{ border-color:#FFD866; box-shadow:0 14px 34px rgba(255,190,60,.32); animation: engPopBig .6s ease; }
      @keyframes engPopBig{
        0%{ transform:translateY(-16px) scale(.8); }
        50%{ transform:translateY(4px) scale(1.12); }
        75%{ transform:translateY(-2px) scale(.98); }
        100%{ transform:translateY(0) scale(1); }
      }
      .eng-card.eng-glow-gold{ border-color:#FFC94D; animation: engGoldGlow 1.4s ease-in-out infinite; }
      @keyframes engGoldGlow{
        0%,100%{ box-shadow:0 14px 32px rgba(0,0,0,.4), 0 0 0 rgba(255,201,77,0); }
        50%{ box-shadow:0 14px 32px rgba(0,0,0,.4), 0 0 20px rgba(255,201,77,.7); }
      }
      .eng-card.eng-confetti{ border-color:#FF7AD9; box-shadow:0 14px 34px rgba(255,90,220,.38); animation: engPopBig .6s ease; }

      /* ---- confetti burst (pseudo-3D tumble via combined rotate axes) ---- */
      #eng-confetti-layer{ position:fixed; inset:0; z-index:9590; pointer-events:none; overflow:hidden; perspective:500px; }
      .eng-confetti-bit{
        position:absolute; top:-24px; font-size:20px; will-change:transform, opacity;
        animation: engConfettiFall linear forwards;
      }
      @keyframes engConfettiFall{
        0%{ transform:translateY(0) rotateX(0deg) rotateY(0deg); opacity:1; }
        100%{ transform:translateY(110vh) rotateX(540deg) rotateY(360deg); opacity:0; }
      }

      /* ---- recorded gift animations (UPDATE 22) ---- */
      #eng-gift-layer{
        position:fixed; inset:0; z-index:9595; pointer-events:none;
        display:flex; align-items:center; justify-content:center; overflow:hidden;
      }
      .eng-gift-video{
        height:min(100%, 900px); width:auto; max-width:100%; object-fit:contain;
        opacity:0; transition:opacity .15s ease; background:transparent;
      }
      .eng-gift-video.eng-show{ opacity:1; }
      /* Fallback (Safari / Firefox): the original MP4 has a near-black backdrop, so "screen"
         blending makes that backdrop vanish and keeps the glowing art. */
      .eng-gift-video.eng-blend{ mix-blend-mode:screen; }

      /* ---- host tools (statistics + test alerts), rendered inside each
              game's Settings panel via <div data-engagement-tools> ---- */
      .eng-tools{
        display:flex; flex-direction:column; gap:12px;
        font-family:"Quicksand","Manrope",system-ui,sans-serif;
        color:var(--theme-ink,#5b4636); text-align:left;
      }
      .eng-tools-block{
        background:var(--theme-surface-2,#f2e4c8);
        border:1px solid var(--theme-line,#d9be93);
        border-radius:12px; padding:10px 12px;
      }
      .eng-tools-title{ font-weight:800; font-size:13px; margin-bottom:6px; color:var(--theme-deep,#6b4423); }
      .eng-tools-note{ font-size:11.5px; line-height:1.4; opacity:.8; margin:0 0 8px; font-weight:500; }
      .eng-tools-row{ display:flex; justify-content:space-between; gap:14px; padding:3px 0; font-size:13px; font-weight:600; }
      .eng-tools-row b{ font-weight:800; color:var(--theme-deep,#6b4423); }
      .eng-tools-grid{ display:grid; grid-template-columns:1fr 1fr; gap:8px; }
      .eng-tools-btn{
        text-align:center; cursor:pointer; font-family:inherit;
        background:var(--theme-card,#fffbf2); color:var(--theme-deep,#6b4423);
        border:2px solid var(--theme-line,#d9be93); border-radius:10px;
        padding:9px 8px; font-weight:700; font-size:12.5px; line-height:1.2;
        width:auto; box-shadow:0 2px 0 rgba(0,0,0,.08);
      }
      .eng-tools-btn:active{ transform:scale(.97); }
    `;
    document.head.appendChild(style);
  }

  // --------------------------------------------------------------- DOM ----
  const alertLayer = document.createElement("div");
  alertLayer.id = "eng-alert-layer";
  document.body.appendChild(alertLayer);

  const confettiLayer = document.createElement("div");
  confettiLayer.id = "eng-confetti-layer";
  document.body.appendChild(confettiLayer);

  const giftLayer = document.createElement("div");
  giftLayer.id = "eng-gift-layer";
  document.body.appendChild(giftLayer);

  // ------------------------------------------------ recorded gift animations --
  // Each entry: id = file name in /shared/gifts/ (id.webm + id.mp4), match = test against the gift's name.
  // To add a new gift: drop id.webm (+ id.mp4) into public/shared/gifts/ and add one line here.
  const GIFT_VIDEO_BASE = "/shared/gifts/";
  const GIFT_VIDEOS = [
    { id: "love-you-so-much",   label: "Love You So Much",   match: /love\s*you\s*so\s*much/i },
    { id: "ice-cream-cone",     label: "Ice Cream Cone",     match: /ice\s*-?\s*cream/i },
    { id: "pop",                label: "Pop",                match: /^pop$/i },
    { id: "tiktok",             label: "TikTok",             match: /^tik\s*-?\s*tok$/i },
    { id: "gg",                 label: "GG",                 match: /^gg$/i },
    { id: "rose",               label: "Rose",               match: /^rose$/i },
    { id: "rosa",               label: "Rosa",               match: /^rosa$/i },
    { id: "football",           label: "Football",           match: /foot\s*ball/i },
    { id: "heart-me",           label: "Heart Me",           match: /heart\s*me/i },
    { id: "heart-puff",         label: "Heart Puff",         match: /heart\s*puff/i },
    { id: "donut",              label: "Donut",              match: /do(ugh)?\s*nut/i },
    { id: "perfume",            label: "Perfume",            match: /perfume/i },
    { id: "gold-boxing-gloves", label: "Gold Boxing Gloves", match: /boxing\s*glove/i },
    { id: "finger-heart",       label: "Finger Heart",       match: /finger\s*-?\s*heart/i },
  ];

  function matchGiftVideo(giftName) {
    const name = String(giftName || "").trim().replace(/^sent\s+(an?\s+)?/i, "").replace(/[!.\s]+$/g, "");
    if (!name) return null;
    return GIFT_VIDEOS.find((g) => g.match.test(name)) || null;
  }

  // Transparent WebM (VP9 alpha) only on Chromium-based browsers (Chrome, Edge, Android WebView,
  // TikTok Live Studio / OBS browser source). Everything else gets the MP4 + "screen" blend fallback.
  const UA = navigator.userAgent || "";
  const USE_ALPHA_WEBM = /(Chrome|Chromium|CriOS|Edg)\//.test(UA) && !/iPhone|iPad|iPod/.test(UA);

  const SOUND_KEY = "eng_gift_sound";
  const VOLUME_KEY = "eng_gift_volume";
  function loadPref(key, fallback) {
    try {
      const v = localStorage.getItem(key);
      return v === null ? fallback : v;
    } catch (e) { return fallback; }
  }
  function savePref(key, value) {
    try { localStorage.setItem(key, String(value)); } catch (e) { /* storage blocked - fine */ }
  }
  let giftSoundOn = loadPref(SOUND_KEY, "on") !== "off";
  let giftVolume = Math.min(1, Math.max(0, Number(loadPref(VOLUME_KEY, "0.8")) || 0.8));

  const MAX_GIFT_VIDEO_MS = 9000; // safety net: never let a stuck video block the queue

  function playGiftVideo(entry, onDone) {
    let finished = false;
    const video = document.createElement("video");
    const finish = () => {
      if (finished) return;
      finished = true;
      video.classList.remove("eng-show");
      setTimeout(() => {
        try { video.pause(); } catch (e) {}
        video.removeAttribute("src");
        try { video.load(); } catch (e) {}
        video.remove();
      }, 180);
      onDone();
    };

    video.className = "eng-gift-video" + (USE_ALPHA_WEBM ? "" : " eng-blend");
    video.playsInline = true;
    video.setAttribute("playsinline", "");
    video.preload = "auto";
    video.volume = giftVolume;
    video.muted = !giftSoundOn;
    video.src = GIFT_VIDEO_BASE + entry.id + (USE_ALPHA_WEBM ? ".webm" : ".mp4");
    video.addEventListener("ended", finish);
    video.addEventListener("error", finish);
    giftLayer.appendChild(video);

    const start = () => {
      const p = video.play();
      if (p && typeof p.catch === "function") {
        p.catch(() => {
          // Browser refused to start with sound (no tap on the page yet) - retry silently.
          if (!video.muted) {
            video.muted = true;
            const q = video.play();
            if (q && typeof q.catch === "function") q.catch(finish);
          } else {
            finish();
          }
        });
      }
      video.classList.add("eng-show");
    };
    start();
    setTimeout(finish, MAX_GIFT_VIDEO_MS);
  }

  // Warm the browser cache a few seconds after the page loads so the very first gift doesn't stutter.
  function preloadGiftVideos() {
    let i = 0;
    const next = () => {
      if (i >= GIFT_VIDEOS.length) return;
      const g = GIFT_VIDEOS[i++];
      fetch(GIFT_VIDEO_BASE + g.id + (USE_ALPHA_WEBM ? ".webm" : ".mp4"))
        .catch(() => {})
        .finally(() => setTimeout(next, 250));
    };
    next();
  }
  window.addEventListener("load", () => setTimeout(preloadGiftVideos, 4000));

  // ------------------------------------------------- host tools (in Settings) --
  let socket = null;
  try {
    if (window.io) socket = window.io("/engagement");
  } catch (e) {
    console.error("[engagement] could not open socket:", e);
  }

  function fmt(n) {
    return (n || 0).toLocaleString();
  }

  let lastCounters = null;
  function paintStats() {
    if (!lastCounters) return;
    const map = {
      gifts: lastCounters.totalGifts,
      coins: lastCounters.totalCoins,
      shares: lastCounters.totalShares,
      likes: lastCounters.totalLikes,
    };
    document.querySelectorAll("[data-eng-stat]").forEach((el) => {
      el.textContent = fmt(map[el.getAttribute("data-eng-stat")]);
    });
  }

  /** Fills a container with the statistics readout + fake-alert test buttons. */
  function mountTools(container) {
    if (!container || container.getAttribute("data-eng-mounted")) return;
    container.setAttribute("data-eng-mounted", "1");
    container.innerHTML = `
      <div class="eng-tools">
        <div class="eng-tools-block">
          <div class="eng-tools-title">📊 Live statistics</div>
          <p class="eng-tools-note">Running totals since the server started.</p>
          <div class="eng-tools-row"><span>Total Gifts</span><b data-eng-stat="gifts">0</b></div>
          <div class="eng-tools-row"><span>Total Coins</span><b data-eng-stat="coins">0</b></div>
          <div class="eng-tools-row"><span>Total Shares</span><b data-eng-stat="shares">0</b></div>
          <div class="eng-tools-row"><span>Total Likes</span><b data-eng-stat="likes">0</b></div>
        </div>
        <div class="eng-tools-block">
          <div class="eng-tools-title">🎬 Gift animations</div>
          <p class="eng-tools-note">Recorded animations play over the game when a matching gift arrives. If the browser blocks sound, tap the game once.</p>
          <label class="eng-tools-row" style="align-items:center;"><span>Play gift sounds</span><input type="checkbox" data-eng-sound ${giftSoundOn ? "checked" : ""} /></label>
          <label class="eng-tools-row" style="align-items:center;"><span>Volume</span><input type="range" min="0" max="100" value="${Math.round(giftVolume * 100)}" data-eng-volume style="width:55%;" /></label>
          <div class="eng-tools-grid" style="margin-top:8px;">
            <select data-eng-gift-pick class="eng-tools-btn" style="grid-column:1 / -1;">${GIFT_VIDEOS.map((g) => `<option value="${g.id}">${g.label}</option>`).join("")}</select>
            <button type="button" class="eng-tools-btn" data-eng-gift-play style="grid-column:1 / -1;">▶ Preview this gift animation</button>
          </div>
        </div>
        <div class="eng-tools-block">
          <div class="eng-tools-title">🧪 Test alerts (host only)</div>
          <p class="eng-tools-note">Fires a fake alert on screen so you can check how it looks without going live.</p>
          <div class="eng-tools-grid">
            <button type="button" class="eng-tools-btn" data-kind="gift">🎁 Fake Gift</button>
            <button type="button" class="eng-tools-btn" data-kind="share">🔥 Fake Share</button>
            <button type="button" class="eng-tools-btn" data-kind="milestone">👍 Fake Milestone</button>
            <button type="button" class="eng-tools-btn" data-kind="room">🌟 Fake Room Milestone</button>
          </div>
        </div>
      </div>
    `;
    container.querySelectorAll(".eng-tools-btn[data-kind]").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (socket) socket.emit("engagement:test", { kind: btn.dataset.kind });
      });
    });
    const soundBox = container.querySelector("[data-eng-sound]");
    if (soundBox) soundBox.addEventListener("change", () => { giftSoundOn = soundBox.checked; savePref(SOUND_KEY, giftSoundOn ? "on" : "off"); });
    const volSlider = container.querySelector("[data-eng-volume]");
    if (volSlider) volSlider.addEventListener("input", () => { giftVolume = Math.min(1, Math.max(0, Number(volSlider.value) / 100)); savePref(VOLUME_KEY, giftVolume); });
    const playBtn = container.querySelector("[data-eng-gift-play]");
    const pick = container.querySelector("[data-eng-gift-pick]");
    if (playBtn && pick) {
      playBtn.addEventListener("click", () => {
        const g = GIFT_VIDEOS.find((x) => x.id === pick.value);
        if (!g) return;
        enqueueAlert({
          type: "gift", tier: "pop", giftName: g.label, username: "preview",
          message: "@preview sent a " + g.label + "!", appreciation: "Gift animation preview", icon: "🎁",
        });
      });
    }
    paintStats();
  }

  function mountAll() {
    document.querySelectorAll("[data-engagement-tools]").forEach(mountTools);
  }
  mountAll();
  document.addEventListener("DOMContentLoaded", mountAll);

  if (socket) {
    socket.on("engagement:state", (state) => {
      if (!state || !state.counters) return;
      lastCounters = state.counters;
      paintStats();
    });
    socket.on("engagement:alert", (alert) => enqueueAlert(alert));
  }

  // --------------------------------------------------------- alert queue --
  const CARD_VISIBLE_MS = 4000;
  const CARD_TRANSITION_MS = 240;
  let queue = [];
  let showing = false;

  function enqueueAlert(alert) {
    if (!alert) return;
    queue.push(alert);
    if (queue.length > 25) queue = queue.slice(-25); // hard cap so a runaway burst can't grow forever
    processQueue();
  }

  function processQueue() {
    if (showing || queue.length === 0) return;
    showing = true;
    const alert = queue.shift();
    renderCard(alert);
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  const DEFAULT_ICON = { gift: "🎁", share: "🔥", like_milestone: "👍", room_like_milestone: "🌟", room_share_milestone: "🌟" };

  function renderCard(alert) {
    const card = document.createElement("div");
    card.className = "eng-card eng-" + (alert.tier || "pop");
    card.style.setProperty("--eng-from", alert.gradientFrom || "#ffd76a");
    card.style.setProperty("--eng-to", alert.gradientTo || "#e0245e");

    const icon = alert.icon || DEFAULT_ICON[alert.type] || "🎉";
    const isRoomAlert = alert.type === "room_like_milestone" || alert.type === "room_share_milestone";

    const avatarHtml = alert.avatarUrl
      ? `<img class="eng-mini-avatar" src="${escapeHtml(alert.avatarUrl)}" onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'eng-mini-avatar',textContent:'👤'}))" />`
      : `<div class="eng-mini-avatar">👤</div>`;

    const statHtml = alert.stat
      ? `<div class="eng-stat-row"><span class="eng-stat-pill">${escapeHtml(alert.stat)}</span></div>`
      : "";

    const actionText = (alert.message || "").replace(/^@[^\s]+\s*/, "");

    const bodyHtml = isRoomAlert
      ? `
        <div class="eng-action" style="font-size:14.5px;font-weight:800;">${escapeHtml(alert.message || "")}</div>
        <div class="eng-wish">${escapeHtml(alert.appreciation || "")}</div>
        ${statHtml}
      `
      : `
        <div class="eng-row-main">${avatarHtml}<span class="eng-username">@${escapeHtml(alert.username || "viewer")}</span></div>
        <div class="eng-action">${escapeHtml(actionText)}</div>
        <div class="eng-wish">${escapeHtml(alert.appreciation || "")}</div>
        ${statHtml}
      `;

    card.innerHTML = `
      <div class="eng-badge-wrap"><div class="eng-badge">${icon}</div></div>
      <div class="eng-body">${bodyHtml}</div>
    `;

    alertLayer.appendChild(card);

    if (alert.tier === "confetti") burstConfetti();

    requestAnimationFrame(() => requestAnimationFrame(() => card.classList.add("eng-show")));

    // A recorded animation exists for this gift -> play it along with the card. If a big backlog of
    // gifts is waiting, skip the video (card only, shorter) so the screen never falls far behind.
    const giftVideo = alert.type === "gift" ? matchGiftVideo(alert.giftName) : null;
    const backlog = queue.length > 5;
    const playVideo = !!giftVideo && !backlog;

    let cardTimerDone = false;
    let videoDone = !playVideo;
    const tryClose = () => {
      if (!(cardTimerDone && videoDone)) return;
      card.classList.remove("eng-show");
      setTimeout(() => {
        card.remove();
        showing = false;
        processQueue();
      }, CARD_TRANSITION_MS);
    };

    if (playVideo) playGiftVideo(giftVideo, () => { videoDone = true; tryClose(); });
    setTimeout(() => { cardTimerDone = true; tryClose(); }, backlog ? 2200 : CARD_VISIBLE_MS);
  }

  // A lightweight, CSS-driven confetti burst — plain positioned <div>s
  // animated purely with a CSS keyframe (no per-frame JS), so it stays
  // smooth even while a game's own board is animating at the same time.
  const CONFETTI_EMOJI = ["🎉", "✨", "🎊", "💥", "🌟", "💛"];
  function burstConfetti() {
    const count = 24;
    for (let i = 0; i < count; i++) {
      const bit = document.createElement("div");
      bit.className = "eng-confetti-bit";
      bit.textContent = CONFETTI_EMOJI[Math.floor(Math.random() * CONFETTI_EMOJI.length)];
      bit.style.left = Math.random() * 100 + "vw";
      const duration = 1.6 + Math.random() * 1.2;
      bit.style.animationDuration = duration + "s";
      bit.style.animationDelay = Math.random() * 0.4 + "s";
      confettiLayer.appendChild(bit);
      setTimeout(() => bit.remove(), (duration + 0.5) * 1000);
    }
  }

  window.Engagement = { enqueueAlert, mountTools, GIFT_VIDEOS, matchGiftVideo };
})();
