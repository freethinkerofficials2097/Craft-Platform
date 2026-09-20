/* ==========================================================================
   ENGAGEMENT — shared, platform-wide Gift / Like / Share alerts.

   Drop this one script tag into any game page:
     <script src="/shared/engagement.js"></script>

   It is entirely self-contained (injects its own <style>, same pattern as
   shared/celebration.js) so no extra CSS file needs to be linked, and it
   never touches game-specific DOM — it only adds its own small, fixed-
   position layer on top of whatever game is on screen, so it can never
   make the actual game board stutter or lag.

   What it does:
     - Connects to the shared "/engagement" Socket.IO namespace (works
       regardless of which game is currently live — the hub is platform-
       wide, one process, one set of counters).
     - QUEUES incoming alerts and shows exactly one at a time for ~3.5s,
       so a burst of simultaneous events (a raid of gifts, a wave of
       shares) never stacks multiple cards on screen at once.
     - Renders a small, collapsible diagnostics panel (bottom-left) with
       running Total Gifts / Total Shares / Total Likes counters.
     - Renders a small, collapsible "Test Event" panel (bottom-right) with
       buttons to fire a fake Gift / Share / Milestone / Room Milestone,
       so animations can be checked without ever going live.
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
        position:fixed; top:14px; left:50%; transform:translateX(-50%);
        z-index:9600; pointer-events:none; display:flex; justify-content:center;
        width:min(94vw, 420px);
      }
      .eng-card{
        display:flex; align-items:center; gap:10px;
        background:var(--theme-card, #1c1c22); color:var(--theme-ink, #fff);
        border:2px solid rgba(255,255,255,.18);
        border-radius:16px; padding:10px 16px 10px 10px;
        box-shadow:0 10px 26px rgba(0,0,0,.35);
        font-family:"Quicksand","Manrope",system-ui,sans-serif;
        font-weight:700; font-size:14px; line-height:1.3;
        max-width:100%;
        opacity:0; transform:translateY(-16px) scale(.92);
        transition:opacity .22s ease, transform .22s cubic-bezier(.34,1.56,.64,1);
        will-change:opacity, transform;
      }
      .eng-card.eng-show{ opacity:1; transform:translateY(0) scale(1); }
      .eng-avatar{
        width:34px; height:34px; border-radius:50%; flex:none; object-fit:cover;
        background:rgba(255,255,255,.12); display:flex; align-items:center; justify-content:center;
        font-size:17px; border:2px solid rgba(255,255,255,.35);
      }
      .eng-text{ word-break:break-word; }

      /* ---- tier: pop (small like milestones, ordinary gifts) ---- */
      .eng-card.eng-pop{ animation: engPop .5s ease; }
      @keyframes engPop{
        0%{ transform:translateY(-16px) scale(.85); }
        55%{ transform:translateY(2px) scale(1.05); }
        100%{ transform:translateY(0) scale(1); }
      }

      /* ---- tier: pop-big (1k-5k like milestones) ---- */
      .eng-card.eng-pop-big{
        border-color:#FFD866; box-shadow:0 10px 30px rgba(255,190,60,.35);
        animation: engPopBig .6s ease;
      }
      @keyframes engPopBig{
        0%{ transform:translateY(-16px) scale(.8); }
        50%{ transform:translateY(4px) scale(1.12); }
        75%{ transform:translateY(-2px) scale(.98); }
        100%{ transform:translateY(0) scale(1); }
      }

      /* ---- tier: glow-gold (shares) ---- */
      .eng-card.eng-glow-gold{
        border-color:#FFC94D;
        animation: engGoldGlow 1.4s ease-in-out infinite;
      }
      @keyframes engGoldGlow{
        0%,100%{ box-shadow:0 10px 26px rgba(0,0,0,.35), 0 0 0 rgba(255,201,77,0); }
        50%{ box-shadow:0 10px 26px rgba(0,0,0,.35), 0 0 22px rgba(255,201,77,.75); }
      }

      /* ---- tier: confetti (big gift / 10k+ milestone / room milestone) ---- */
      .eng-card.eng-confetti{
        border-color:#FF7AD9; box-shadow:0 10px 30px rgba(255,90,220,.4);
        animation: engPopBig .6s ease;
      }
      #eng-confetti-layer{
        position:fixed; inset:0; z-index:9590; pointer-events:none; overflow:hidden;
      }
      .eng-confetti-bit{
        position:absolute; top:-24px; font-size:20px; will-change:transform, opacity;
        animation: engConfettiFall linear forwards;
      }
      @keyframes engConfettiFall{
        0%{ transform:translateY(0) rotate(0deg); opacity:1; }
        100%{ transform:translateY(110vh) rotate(360deg); opacity:0; }
      }

      /* ---- diagnostics panel (bottom-left) ---- */
      #eng-diag-toggle, #eng-test-toggle{
        position:fixed; bottom:14px; z-index:9550;
        width:38px; height:38px; border-radius:50%; border:none; cursor:pointer;
        background:rgba(20,20,26,.72); color:#fff; font-size:16px;
        display:flex; align-items:center; justify-content:center;
        box-shadow:0 4px 14px rgba(0,0,0,.3);
      }
      #eng-diag-toggle{ left:14px; }
      #eng-test-toggle{ right:14px; }
      #eng-diag-panel, #eng-test-panel{
        position:fixed; bottom:60px; z-index:9550;
        background:rgba(18,18,24,.92); color:#fff; border-radius:14px; padding:12px 14px;
        font-family:"Quicksand","Manrope",system-ui,sans-serif; font-size:12.5px;
        min-width:170px; box-shadow:0 10px 26px rgba(0,0,0,.4);
        display:none; backdrop-filter: blur(4px);
      }
      #eng-diag-panel{ left:14px; }
      #eng-test-panel{ right:14px; }
      #eng-diag-panel.eng-open, #eng-test-panel.eng-open{ display:block; }
      .eng-diag-row{ display:flex; justify-content:space-between; gap:14px; padding:3px 0; }
      .eng-diag-row b{ color:#FFD866; font-weight:800; }
      .eng-test-title{ font-weight:800; margin-bottom:8px; opacity:.85; }
      .eng-test-btn{
        display:block; width:100%; text-align:left; margin-bottom:6px;
        background:rgba(255,255,255,.08); color:#fff; border:1px solid rgba(255,255,255,.16);
        border-radius:8px; padding:7px 10px; font-weight:700; font-size:12.5px; cursor:pointer;
      }
      .eng-test-btn:last-child{ margin-bottom:0; }
      .eng-test-btn:active{ transform:scale(.97); }
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

  const diagToggle = document.createElement("button");
  diagToggle.id = "eng-diag-toggle";
  diagToggle.title = "Engagement diagnostics";
  diagToggle.textContent = "📊";
  document.body.appendChild(diagToggle);

  const diagPanel = document.createElement("div");
  diagPanel.id = "eng-diag-panel";
  diagPanel.innerHTML = `
    <div class="eng-diag-row"><span>Total Gifts</span><b id="eng-diag-gifts">0</b></div>
    <div class="eng-diag-row"><span>Total Shares</span><b id="eng-diag-shares">0</b></div>
    <div class="eng-diag-row"><span>Total Likes</span><b id="eng-diag-likes">0</b></div>
  `;
  document.body.appendChild(diagPanel);
  diagToggle.addEventListener("click", () => diagPanel.classList.toggle("eng-open"));

  const testToggle = document.createElement("button");
  testToggle.id = "eng-test-toggle";
  testToggle.title = "Test Event panel (host only)";
  testToggle.textContent = "🧪";
  document.body.appendChild(testToggle);

  const testPanel = document.createElement("div");
  testPanel.id = "eng-test-panel";
  testPanel.innerHTML = `
    <div class="eng-test-title">Test Event (host only)</div>
    <button class="eng-test-btn" data-kind="gift">🎁 Fake Gift</button>
    <button class="eng-test-btn" data-kind="share">🔥 Fake Share</button>
    <button class="eng-test-btn" data-kind="milestone">👍 Fake Milestone</button>
    <button class="eng-test-btn" data-kind="room">🌟 Fake Room Milestone</button>
  `;
  document.body.appendChild(testPanel);
  testToggle.addEventListener("click", () => testPanel.classList.toggle("eng-open"));

  // ------------------------------------------------------------- socket --
  let socket = null;
  try {
    if (window.io) socket = window.io("/engagement");
  } catch (e) {
    console.error("[engagement] could not open socket:", e);
  }

  function fmt(n) {
    return (n || 0).toLocaleString();
  }

  if (socket) {
    socket.on("engagement:state", (state) => {
      if (!state || !state.counters) return;
      document.getElementById("eng-diag-gifts").textContent = fmt(state.counters.totalGifts);
      document.getElementById("eng-diag-shares").textContent = fmt(state.counters.totalShares);
      document.getElementById("eng-diag-likes").textContent = fmt(state.counters.totalLikes);
    });

    socket.on("engagement:alert", (alert) => enqueueAlert(alert));

    testPanel.querySelectorAll(".eng-test-btn").forEach((btn) => {
      btn.addEventListener("click", () => socket.emit("engagement:test", { kind: btn.dataset.kind }));
    });
  }

  // --------------------------------------------------------- alert queue --
  const CARD_VISIBLE_MS = 3600;
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

  function renderCard(alert) {
    const card = document.createElement("div");
    card.className = "eng-card eng-" + (alert.tier || "pop");

    const avatarHtml = alert.avatarUrl
      ? `<img class="eng-avatar" src="${escapeHtml(alert.avatarUrl)}" onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'eng-avatar',textContent:'👤'}))" />`
      : `<div class="eng-avatar">${alert.type === "gift" ? "🎁" : alert.type === "share" ? "🔥" : "👍"}</div>`;

    card.innerHTML = `${avatarHtml}<div class="eng-text">${escapeHtml(alert.message || "")}</div>`;
    alertLayer.appendChild(card);

    if (alert.tier === "confetti") burstConfetti();

    requestAnimationFrame(() => requestAnimationFrame(() => card.classList.add("eng-show")));

    setTimeout(() => {
      card.classList.remove("eng-show");
      setTimeout(() => {
        card.remove();
        showing = false;
        processQueue();
      }, CARD_TRANSITION_MS);
    }, CARD_VISIBLE_MS);
  }

  // A lightweight, CSS-driven confetti burst — plain positioned <div>s
  // animated purely with a CSS keyframe (no per-frame JS), so it stays
  // smooth even while a game's own board is animating at the same time.
  const CONFETTI_EMOJI = ["🎉", "✨", "🎊", "💥", "🌟"];
  function burstConfetti() {
    const count = 22;
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

  window.Engagement = { enqueueAlert };
})();
