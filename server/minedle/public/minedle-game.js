// minedle-game.js — runs in the browser (host view / display view)
// MINEDLE: a grid of letter-and-number tiles (the number = how many touching tiles hold a letter of the secret word), tiles the
// host taps blue / red, and green / yellow / grey clue colors for every guess (see minedle-server.js).

function setRealViewportHeight() {
  const vh = window.innerHeight * 0.01;
  document.documentElement.style.setProperty("--vh", `${vh}px`);
}
setRealViewportHeight();
window.addEventListener("resize", setRealViewportHeight);
window.addEventListener("resize", () => {
  lastTilesSignature = "";
  if (lastState) renderTiles(lastState.game);
});
window.addEventListener("orientationchange", setRealViewportHeight);
window.addEventListener("orientationchange", () => {
  lastTilesSignature = "";
  if (lastState) renderTiles(lastState.game);
});

const el = {
  brandDot: document.getElementById("brandDot"),
  modeBadge: document.getElementById("modeBadge"),
  lengthBadge: document.getElementById("lengthBadge"),
  hintBtn: document.getElementById("hintBtn"),
  helpBtn: document.getElementById("helpBtn"),
  languageBtn: document.getElementById("languageBtn"),
  languageOverlay: document.getElementById("languageOverlay"),
  closeLanguage: document.getElementById("closeLanguage"),
  applyLanguageBtn: document.getElementById("applyLanguageBtn"),
  languageInfo: document.getElementById("languageInfo"),
  languageWarn: document.getElementById("languageWarn"),
  leaderboardBtn: document.getElementById("leaderboardBtn"),
  settingsBtn: document.getElementById("settingsBtn"),
  fullscreenBtn: document.getElementById("fullscreenBtn"),

  confettiLayer: document.getElementById("confettiLayer"),
  rejectionToast: document.getElementById("rejectionToast"),

  tilesWrap: document.getElementById("tilesWrap"),
  mineSection: document.getElementById("mineSection"),
  mineGrid: document.getElementById("mineGrid"),
  resetMarksBtn: document.getElementById("resetMarksBtn"),
  letterBank: document.getElementById("letterBank"),
  letterBankWrap: document.getElementById("letterBankWrap"),
  bankVisibleToggle: document.getElementById("bankVisibleToggle"),
  resetVisibleToggle: document.getElementById("resetVisibleToggle"),
  mineTools: document.querySelector(".mineTools"),
  hintChips: document.getElementById("hintChips"),
  hintExplainer: document.getElementById("hintExplainer"),
  offlineNote: document.getElementById("offlineNote"),
  resultBanner: document.getElementById("resultBanner"),
  resultText: document.getElementById("resultText"),
  playAgainBtn: document.getElementById("playAgainBtn"),
  autoContinueNote: document.getElementById("autoContinueNote"),
  idleBanner: document.getElementById("idleBanner"),

  controlsHandle: document.getElementById("controlsHandle"),
  controlsBody: document.getElementById("controlsBody"),
  liveControls: document.getElementById("liveControls"),
  testControls: document.getElementById("testControls"),
  offlineControls: document.getElementById("offlineControls"),
  tiktokUsernameBottom: document.getElementById("tiktokUsernameBottom"),
  connectBtnBottom: document.getElementById("connectBtnBottom"),
  setAnswerInputLive: document.getElementById("setAnswerInputLive"),
  setAnswerBtnLive: document.getElementById("setAnswerBtnLive"),
  setAnswerErrorLive: document.getElementById("setAnswerErrorLive"),
  setAnswerInputTest: document.getElementById("setAnswerInputTest"),
  setAnswerBtnTest: document.getElementById("setAnswerBtnTest"),
  setAnswerErrorTest: document.getElementById("setAnswerErrorTest"),
  offlineGuessInput: document.getElementById("offlineGuessInput"),
  offlineGuessBtn: document.getElementById("offlineGuessBtn"),
  offlineError: document.getElementById("offlineError"),
  giveUpBtn: document.getElementById("giveUpBtn"),
  miniStatus: document.getElementById("miniStatus"),

  settingsOverlay: document.getElementById("settingsOverlay"),
  closeSettings: document.getElementById("closeSettings"),
  modeChip: document.getElementById("modeChip"),
  connChip: document.getElementById("connChip"),
  modePickerBtn: document.getElementById("modePickerBtn"),
  modePickerLabel: document.getElementById("modePickerLabel"),
  tiktokUsername: document.getElementById("tiktokUsername"),
  connectBtn: document.getElementById("connectBtn"),
  disconnectBtn: document.getElementById("disconnectBtn"),
  wordLengthSelect: document.getElementById("wordLengthSelect"),
  difficultySelect: document.getElementById("difficultySelect"),
  randomLengthToggle: document.getElementById("randomLengthToggle"),
  fixedLengthRow: document.getElementById("fixedLengthRow"),
  randomLengthRow: document.getElementById("randomLengthRow"),
  randomLengthNote: document.getElementById("randomLengthNote"),
  lengthMinSelect: document.getElementById("lengthMinSelect"),
  lengthMaxSelect: document.getElementById("lengthMaxSelect"),
  autoContinueToggle: document.getElementById("autoContinueToggle"),
  delayInput: document.getElementById("delayInput"),
  leaderboardShowInput: document.getElementById("leaderboardShowInput"),
  rejectionToastShowInput: document.getElementById("rejectionToastShowInput"),
  strictFitToggle: document.getElementById("strictFitToggle"),
  starterWordToggle: document.getElementById("starterWordToggle"),
  applyBtn: document.getElementById("applyBtn"),
  diagToggle: document.getElementById("diagToggle"),
  diagGrid: document.getElementById("diagGrid"),
  resetRoundBtn: document.getElementById("resetRoundBtn"),
  resetTotalBtn: document.getElementById("resetTotalBtn"),

  modePickerOverlay: document.getElementById("modePickerOverlay"),

  leaderboardOverlay: document.getElementById("leaderboardOverlay"),
  closeLeaderboard: document.getElementById("closeLeaderboard"),
  celebrationOverlay: document.getElementById("celebrationOverlay"),
  celebrationBody: document.getElementById("celebrationBody"),
  celebrationDots: document.getElementById("celebrationDots"),
  closeCelebration: document.getElementById("closeCelebration"),
  tabThisRound: document.getElementById("tabThisRound"),
  tabAllTime: document.getElementById("tabAllTime"),
  leaderboardList: document.getElementById("leaderboardList"),
  leaderboardNote: document.getElementById("leaderboardNote"),

  howToOverlay: document.getElementById("howToOverlay"),
  closeHowTo: document.getElementById("closeHowTo"),
  closeHowTo2: document.getElementById("closeHowTo2")
};

const MODE_LABELS = {
  live: { title: "Live", desc: "Counts for the chat leaderboard" },
  test: { title: "Test", desc: "Practice — scores not saved" },
  offline: { title: "Offline", desc: "Host plays solo" }
};

// ------------------------------------------------------------
// Fullscreen toggle (cross-browser, with graceful no-op fallback
// on browsers - notably iOS Safari - that don't support it)
// ------------------------------------------------------------
function isFullscreen() {
  return Boolean(
    document.fullscreenElement || document.webkitFullscreenElement ||
    document.mozFullScreenElement || document.msFullscreenElement
  );
}
function requestFS() {
  const root = document.documentElement;
  const fn = root.requestFullscreen || root.webkitRequestFullscreen || root.mozRequestFullScreen || root.msRequestFullscreen;
  if (!fn) return;
  try {
    const p = fn.call(root);
    if (p && p.catch) p.catch(() => {});
  } catch (e) { /* ignore - not supported here */ }
}
function exitFS() {
  const fn = document.exitFullscreen || document.webkitExitFullscreen || document.mozCancelFullScreen || document.msExitFullscreen;
  if (!fn) return;
  try {
    const p = fn.call(document);
    if (p && p.catch) p.catch(() => {});
  } catch (e) { /* ignore */ }
}
el.fullscreenBtn.addEventListener("click", () => {
  if (isFullscreen()) exitFS();
  else requestFS();
});
["fullscreenchange", "webkitfullscreenchange", "mozfullscreenchange", "MSFullscreenChange"].forEach((evt) => {
  document.addEventListener(evt, () => {
    const fs = isFullscreen();
    el.fullscreenBtn.classList.toggle("active", fs);
    el.fullscreenBtn.setAttribute("aria-label", fs ? "Exit fullscreen" : "Enter fullscreen");
    setRealViewportHeight();
    lastTilesSignature = "";
    if (lastState) renderTiles(lastState.game);
  });
});

// ------------------------------------------------------------
// The sweep grid. The server sends the grid of the round (`grid`: size, letters, nums), the host's marks
// (`marks`: letter -> 1 blue / 2 red, `bank`: the blue letters in marking order; filled in automatically by the server when the round ends).
// A tap on any tile asks the server to cycle that LETTER: none -> blue -> red -> none, so every tile with the same letter
// changes together on every connected screen. The page itself never colors anything on its own.
// ------------------------------------------------------------
let lastMineSignature = "";

function mineMetrics(n) {
  const secW = el.mineSection.clientWidth || (el.tilesWrap && el.tilesWrap.clientWidth) || 320;
  const avail = Math.max(120, secW - 24);
  const gap = n <= 5 ? 6 : n <= 8 ? 5 : 3;
  const maxTile = n <= 5 ? 60 : n <= 8 ? 46 : 38;
  const size = Math.max(18, Math.min(maxTile, Math.floor((avail - gap * (n - 1)) / n)));
  return { size, gap, letterFont: Math.max(9, Math.round(size * 0.42)), numFont: Math.max(8, Math.round(size * 0.3)) };
}

function renderMine(g) {
  const show = g.status !== "idle" && g.grid && g.grid.size > 0;
  if (el.mineSection.hidden === show) el.mineSection.hidden = !show;
  if (!show) { lastMineSignature = ""; return; }

  const marks = g.marks || {};
  const bank = g.bank || [];
  const locked = g.status !== "live";
  const width = el.mineSection.clientWidth;
  const signature = [g.roundNumber, g.grid.size, locked ? 1 : 0, width, JSON.stringify(marks), g.showResetBtn === false ? 0 : 1, g.showBank === false ? 0 : 1, bank.join("")].join("|");
  if (signature === lastMineSignature) return;
  lastMineSignature = signature;

  const n = g.grid.size;
  const m = mineMetrics(n);
  el.mineGrid.style.gridTemplateColumns = "repeat(" + n + ", " + m.size + "px)";
  el.mineGrid.style.gap = m.gap + "px";
  el.mineGrid.innerHTML = "";
  for (let i = 0; i < g.grid.letters.length; i++) {
    const letter = g.grid.letters[i];
    const tile = document.createElement("button");
    tile.type = "button";
    tile.className = "mineTile" + (marks[letter] === 1 ? " mark1" : marks[letter] === 2 ? " mark2" : "") + (locked ? " locked" : "");
    tile.dataset.letter = letter;
    tile.style.width = m.size + "px";
    tile.style.height = m.size + "px";
    tile.style.borderRadius = Math.max(5, Math.round(m.size * 0.2)) + "px";
    tile.setAttribute("aria-label", letter.toUpperCase() + ", number " + g.grid.nums[i] + (marks[letter] === 1 ? ", marked blue" : marks[letter] === 2 ? ", marked red" : ""));
    const l = document.createElement("span");
    l.className = "mnL";
    l.style.fontSize = m.letterFont + "px";
    l.textContent = letter;
    const num = document.createElement("span");
    num.className = "mnN";
    num.style.fontSize = m.numFont + "px";
    num.textContent = String(g.grid.nums[i]);
    tile.appendChild(l);
    tile.appendChild(num);
    el.mineGrid.appendChild(tile);
  }

  el.resetMarksBtn.disabled = locked;
  el.mineTools.hidden = g.showResetBtn === false;

  // Letter bank: every blue letter, in the order it was marked (own color; the host can hide it)
  el.letterBankWrap.hidden = g.showBank === false;
  el.letterBank.innerHTML = "";
  if (bank.length === 0) {
    const empty = document.createElement("span");
    empty.className = "bankEmpty";
    empty.textContent = "Mark letters to build your letter bank…";
    el.letterBank.appendChild(empty);
  } else {
    const secW = el.mineSection.clientWidth || 320;
    const bs = Math.max(22, Math.min(36, Math.floor((secW - 40) / Math.max(8, Math.min(bank.length, 14)) - 4)));
    bank.forEach((letter) => {
      const b = document.createElement("span");
      b.className = "bankLetter";
      b.style.width = bs + "px";
      b.style.height = Math.round(bs * 1.08) + "px";
      b.style.fontSize = Math.round(bs * 0.56) + "px";
      b.textContent = letter;
      el.letterBank.appendChild(b);
    });
  }
}

el.mineGrid.addEventListener("click", (e) => {
  const tile = e.target.closest && e.target.closest(".mineTile");
  if (!tile || !lastState || lastState.game.status !== "live") return;
  send("tap_letter", { letter: tile.dataset.letter });
});
el.resetMarksBtn.addEventListener("click", () => {
  if (lastState && lastState.game.status === "live") send("reset_marks", {});
});
// re-measure the grid whenever its section changes width (window resize, rotation, fullscreen)
if (typeof ResizeObserver !== "undefined") {
  new ResizeObserver(() => { if (lastState) renderMine(lastState.game); }).observe(el.mineSection);
}
window.addEventListener("resize", () => { if (lastState) renderMine(lastState.game); });

for (let n = 4; n <= 20; n++) {
  const opt = document.createElement("option");
  opt.value = String(n);
  opt.textContent = n + " letters";
  if (n === 5) opt.selected = true;
  el.wordLengthSelect.appendChild(opt);
}
for (let n = 4; n <= 20; n++) {
  const optMin = document.createElement("option");
  optMin.value = String(n);
  optMin.textContent = String(n);
  if (n === 4) optMin.selected = true;
  el.lengthMinSelect.appendChild(optMin);

  const optMax = document.createElement("option");
  optMax.value = String(n);
  optMax.textContent = String(n);
  if (n === 8) optMax.selected = true;
  el.lengthMaxSelect.appendChild(optMax);
}

function updateLengthModeUI() {
  const isRandom = el.randomLengthToggle.checked;
  el.fixedLengthRow.hidden = isRandom;
  el.randomLengthRow.hidden = !isRandom;
  el.randomLengthNote.hidden = !isRandom;
}
el.randomLengthToggle.addEventListener("change", updateLengthModeUI);
// Keep "from" <= "to" so the range is never inverted.
el.lengthMinSelect.addEventListener("change", () => {
  if (Number(el.lengthMinSelect.value) > Number(el.lengthMaxSelect.value)) {
    el.lengthMaxSelect.value = el.lengthMinSelect.value;
  }
});
el.lengthMaxSelect.addEventListener("change", () => {
  if (Number(el.lengthMaxSelect.value) < Number(el.lengthMinSelect.value)) {
    el.lengthMinSelect.value = el.lengthMaxSelect.value;
  }
});

let stagedMode = "test";

function syncStagedSettingsFromState(g) {
  stagedMode = g.mode;
  el.wordLengthSelect.value = String(g.wordLength);
  el.difficultySelect.value = g.difficulty;
  el.randomLengthToggle.checked = g.lengthMode === "random";
  el.lengthMinSelect.value = String(g.lengthMin || 4);
  el.lengthMaxSelect.value = String(g.lengthMax || 8);
  updateLengthModeUI();
  el.autoContinueToggle.checked = g.autoContinue;
  el.delayInput.value = g.autoContinueDelaySeconds;
  el.leaderboardShowInput.value = g.leaderboardShowSeconds;
  el.rejectionToastShowInput.value = g.rejectionToastSeconds;
  el.strictFitToggle.checked = g.strictFit === true; // Strict fit is OFF in MINEDLE unless the host switched it on
  if (el.bankVisibleToggle) el.bankVisibleToggle.checked = g.showBank !== false;
  if (el.resetVisibleToggle) el.resetVisibleToggle.checked = g.showResetBtn !== false;
  if (el.starterWordToggle) el.starterWordToggle.checked = g.starterWord === true; // OFF unless the host switched it on
  updateModePickerLabel();
}

function updateModePickerLabel() {
  const info = MODE_LABELS[stagedMode];
  el.modePickerLabel.textContent = info.title + " — " + info.desc;
  document.querySelectorAll(".pickerOption").forEach((btn) => {
    btn.classList.toggle("selected", btn.dataset.mode === stagedMode);
  });
}

el.controlsHandle.addEventListener("click", () => {
  const expanded = el.controlsHandle.getAttribute("aria-expanded") === "true";
  el.controlsHandle.setAttribute("aria-expanded", String(!expanded));
  el.controlsBody.classList.toggle("collapsed", expanded);
});

el.diagToggle.addEventListener("click", () => {
  const showing = el.diagToggle.getAttribute("aria-expanded") === "true";
  el.diagToggle.setAttribute("aria-expanded", String(!showing));
  el.diagToggle.textContent = showing ? "show" : "hide";
  el.diagGrid.style.display = showing ? "none" : "grid";
});

function openDrawer(overlay) { overlay.hidden = false; }
function closeDrawer(overlay) { overlay.hidden = true; }

el.settingsBtn.addEventListener("click", () => {
  if (lastState) syncStagedSettingsFromState(lastState.game);
  openDrawer(el.settingsOverlay);
});
el.closeSettings.addEventListener("click", () => closeDrawer(el.settingsOverlay));
el.settingsOverlay.addEventListener("click", (e) => { if (e.target === el.settingsOverlay) closeDrawer(el.settingsOverlay); });

el.leaderboardBtn.addEventListener("click", () => { openDrawer(el.leaderboardOverlay); renderLeaderboardTab(); });
el.closeLeaderboard.addEventListener("click", () => closeDrawer(el.leaderboardOverlay));
el.leaderboardOverlay.addEventListener("click", (e) => { if (e.target === el.leaderboardOverlay) closeDrawer(el.leaderboardOverlay); });

el.helpBtn.addEventListener("click", () => { el.howToOverlay.hidden = false; });

// ------------------------------------------------------------
// Languages popup (update 64) - 3 tick boxes -> one of the 7 word-language modes
// ------------------------------------------------------------
const LANG_BOXES = [
  { part: "en", box: document.getElementById("langEn") },
  { part: "id", box: document.getElementById("langId") },
  { part: "ms", box: document.getElementById("langMs") }
];
function langPartsOfMode(mode) {
  const m = String(mode || "en");
  return m === "all" ? ["en", "id", "ms"] : m.split("-");
}
function langModeFromParts(parts) {
  const has = (p) => parts.includes(p);
  const n = parts.length;
  if (n === 3) return "all";
  if (n === 1) return parts[0];
  if (has("en") && has("id")) return "en-id";
  if (has("en") && has("ms")) return "en-ms";
  return "ms-id";
}
function pickedLangParts() { return LANG_BOXES.filter((b) => b.box && b.box.checked).map((b) => b.part); }
function syncLanguageBoxes(g) {
  if (!g || !g.wordLanguage) return;
  const parts = langPartsOfMode(g.wordLanguage);
  LANG_BOXES.forEach((b) => { if (b.box) b.box.checked = parts.includes(b.part); });
  if (el.languageWarn) el.languageWarn.hidden = true;
  const info = g.wordLanguageInfo;
  if (el.languageInfo) {
    el.languageInfo.textContent = info
      ? "Now playing: " + info.label + " — " + info.secretWords.toLocaleString() + " secret words, up to " + info.maxLength + " letters."
      : "";
  }
  if (el.languageBtn) el.languageBtn.title = "Languages: " + (info ? info.short : g.wordLanguage);
}
function openLanguagePopup() {
  if (lastState && lastState.game) syncLanguageBoxes(lastState.game);
  el.languageOverlay.hidden = false;
}
el.languageBtn.addEventListener("click", openLanguagePopup);
el.closeLanguage.addEventListener("click", () => { el.languageOverlay.hidden = true; });
el.languageOverlay.addEventListener("click", (e) => { if (e.target === el.languageOverlay) el.languageOverlay.hidden = true; });
LANG_BOXES.forEach((b) => { if (b.box) b.box.addEventListener("change", () => { el.languageWarn.hidden = pickedLangParts().length > 0; }); });
el.applyLanguageBtn.addEventListener("click", () => {
  const parts = pickedLangParts();
  if (!parts.length) { el.languageWarn.hidden = false; return; }
  send("set_word_language", { mode: langModeFromParts(parts) });
  el.languageOverlay.hidden = true;
});
el.closeHowTo.addEventListener("click", () => { el.howToOverlay.hidden = true; });
el.closeHowTo2.addEventListener("click", () => { el.howToOverlay.hidden = true; });
el.howToOverlay.addEventListener("click", (e) => { if (e.target === el.howToOverlay) el.howToOverlay.hidden = true; });

el.modePickerBtn.addEventListener("click", () => { el.modePickerOverlay.hidden = false; });
el.modePickerOverlay.addEventListener("click", (e) => { if (e.target === el.modePickerOverlay) el.modePickerOverlay.hidden = true; });
document.querySelectorAll(".pickerOption").forEach((btn) => {
  btn.addEventListener("click", () => {
    stagedMode = btn.dataset.mode;
    updateModePickerLabel();
    updateConnectButtons();
    el.modePickerOverlay.hidden = true;
  });
});

let activeLeaderboardTab = "round";
el.tabThisRound.addEventListener("click", () => { activeLeaderboardTab = "round"; renderLeaderboardTab(); });
el.tabAllTime.addEventListener("click", () => { activeLeaderboardTab = "total"; renderLeaderboardTab(); });

let socket = null;
let lastState = null;

// MINEDLE talks to the server over its own Socket.IO namespace "/minedle"
// (Socket.IO reconnects automatically, so no manual retry loop is needed).
function connectSocket() {
  socket = io("/minedle");

  socket.on("connect", () => setMiniStatus("Connected to game server."));
  socket.on("disconnect", () => setMiniStatus("Reconnecting to game server…"));
  socket.on("connect_error", () => setMiniStatus("Reconnecting to game server…"));

  socket.on("state", (payload) => {
    try { render(payload); } catch (err) { console.error("Couldn't render server state:", err); }
  });
  socket.on("offline_guess_result", (payload) => handleOfflineGuessResult(payload));
  socket.on("set_secret_word_result", (payload) => handleSetAnswerResult(payload));
}
connectSocket();

function send(type, payload) {
  if (socket && socket.connected) {
    socket.emit("action", { type: type, payload: payload });
  } else {
    setMiniStatus("Not connected to the game server yet — try again in a moment.");
  }
}
function setMiniStatus(text) { el.miniStatus.textContent = text; }

function doConnect(usernameInput) {
  const username = usernameInput.value.trim();
  if (!username) { setMiniStatus("Type a TikTok username first."); return; }
  // If Live was only just picked in the Mode dropdown (not saved yet), switch the
  // game to Live right now so Connect works immediately - no "Save/Apply, reopen
  // Settings, then connect" detour. Messages on one socket arrive in order, so the
  // server is already in Live mode by the time it sees the connect request.
  const serverIsLive = lastState && lastState.game && lastState.game.mode === "live";
  if (!serverIsLive && stagedMode === "live") {
    send("apply_settings", { mode: "live" });
  }
  send("connect_tiktok", { username: username });
}
el.connectBtn.addEventListener("click", () => doConnect(el.tiktokUsername));
el.connectBtnBottom.addEventListener("click", () => doConnect(el.tiktokUsernameBottom));
el.disconnectBtn.addEventListener("click", () => send("disconnect_tiktok", {}));

el.applyBtn.addEventListener("click", () => {
  send("apply_settings", {
    mode: stagedMode,
    wordLength: Number(el.wordLengthSelect.value),
    difficulty: el.difficultySelect.value,
    lengthMode: el.randomLengthToggle.checked ? "random" : "fixed",
    lengthMin: Number(el.lengthMinSelect.value),
    lengthMax: Number(el.lengthMaxSelect.value),
    autoContinue: el.autoContinueToggle.checked,
    autoContinueDelaySeconds: Number(el.delayInput.value) || 3
  });
  closeDrawer(el.settingsOverlay);
});

// Leaderboard-show duration applies immediately, without restarting
// the round (unlike the rest of Settings, which is bundled behind
// the "Apply & start new round" button above).
el.leaderboardShowInput.addEventListener("change", () => {
  send("set_leaderboard_show_seconds", { seconds: Number(el.leaderboardShowInput.value) || 3 });
});

// Same immediate-apply pattern for how long a rejection message stays
// on screen - no need to restart the round for this one either.
el.rejectionToastShowInput.addEventListener("change", () => {
  send("set_rejection_toast_seconds", { seconds: Number(el.rejectionToastShowInput.value) || 4 });
});

// Strict fit applies immediately, without restarting the round.
el.strictFitToggle.addEventListener("change", () => {
  send("set_strict_fit", { on: el.strictFitToggle.checked });
});

// Starter word: OFF by default in MINEDLE, remembered by the server, used from the next round.
if (el.starterWordToggle) el.starterWordToggle.addEventListener("change", () => {
  send("set_starter_word", { on: el.starterWordToggle.checked });
});

if (el.bankVisibleToggle) el.bankVisibleToggle.addEventListener("change", () => {
  send("set_bank_visible", { on: el.bankVisibleToggle.checked });
});
if (el.resetVisibleToggle) el.resetVisibleToggle.addEventListener("change", () => {
  send("set_reset_visible", { on: el.resetVisibleToggle.checked });
});

el.playAgainBtn.addEventListener("click", () => send("play_again", {}));
el.giveUpBtn.addEventListener("click", () => send("give_up", {}));
CraftHints.attach({ button: el.hintBtn, chips: el.hintChips, explainer: el.hintExplainer, send: (type) => send("use_hint", { type }), sendConfig: (patch) => send("set_hint_config", patch) });

el.resetRoundBtn.addEventListener("click", () => send("reset_round_leaderboard", {}));
el.resetTotalBtn.addEventListener("click", () => send("reset_total_leaderboard", {}));

let pendingSetAnswerSource = null;
function submitSetAnswer(source, inputEl) {
  const word = inputEl.value.trim();
  if (!word) return;
  pendingSetAnswerSource = source;
  send("set_secret_word", { word: word });
}
el.setAnswerBtnLive.addEventListener("click", () => submitSetAnswer("live", el.setAnswerInputLive));
el.setAnswerInputLive.addEventListener("keydown", (e) => { if (e.key === "Enter") submitSetAnswer("live", el.setAnswerInputLive); });
el.setAnswerBtnTest.addEventListener("click", () => submitSetAnswer("test", el.setAnswerInputTest));
el.setAnswerInputTest.addEventListener("keydown", (e) => { if (e.key === "Enter") submitSetAnswer("test", el.setAnswerInputTest); });

function handleSetAnswerResult(result) {
  const errorEl = pendingSetAnswerSource === "test" ? el.setAnswerErrorTest : el.setAnswerErrorLive;
  const inputEl = pendingSetAnswerSource === "test" ? el.setAnswerInputTest : el.setAnswerInputLive;
  if (result.ok) {
    errorEl.textContent = "";
    inputEl.value = "";
  } else {
    errorEl.textContent = result.error || "Couldn't set that word.";
  }
}

function submitOfflineGuess() {
  const word = el.offlineGuessInput.value.trim();
  if (!word) return;
  send("submit_offline_guess", { word: word });
}
el.offlineGuessBtn.addEventListener("click", submitOfflineGuess);
el.offlineGuessInput.addEventListener("keydown", (e) => { if (e.key === "Enter") submitOfflineGuess(); });

function handleOfflineGuessResult(result) {
  if (result.ok) {
    el.offlineError.textContent = "";
    el.offlineGuessInput.value = "";
  } else {
    el.offlineError.textContent = result.error || "That guess didn't work.";
  }
}

// ------------------------------------------------------------
// Rejection toast - brief but readable, auto-dismissing.
// This is a floating overlay (see .rejectionToast in style.css) so it
// never affects document flow - showing/hiding it never pushes the
// guessed-words section up or down. Its on-screen duration is
// host-configurable (Settings → "Show rejection message for").
// ------------------------------------------------------------
let lastShownRejectionAt = 0;
let rejectionHideTimer = null;
function maybeShowRejection(g) {
  if (!g.lastRejection || g.lastRejection.at <= lastShownRejectionAt) return;
  lastShownRejectionAt = g.lastRejection.at;

  const seconds = g.rejectionToastSeconds || 4;

  el.rejectionToast.textContent = "✗ " + g.lastRejection.word.toUpperCase() + " — " + g.lastRejection.reason;
  el.rejectionToast.hidden = false;
  el.rejectionToast.style.animation = "none";
  void el.rejectionToast.offsetWidth;
  el.rejectionToast.style.animation = "toast-flash " + seconds + "s ease forwards";

  clearTimeout(rejectionHideTimer);
  rejectionHideTimer = setTimeout(() => { el.rejectionToast.hidden = true; }, seconds * 1000);
}

// ------------------------------------------------------------
// Win celebration: confetti + winner callout + auto-popup leaderboard
// ------------------------------------------------------------
const CONFETTI_COLORS = ["#F5A3D0", "#A9D6FB", "#ffffff", "#ffb100", "#7c5cff"];
function spawnConfetti() {
  const count = 70;
  for (let i = 0; i < count; i++) {
    const piece = document.createElement("div");
    piece.className = "confettiPiece";
    piece.style.left = Math.random() * 100 + "vw";
    piece.style.background = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];
    const duration = 1.6 + Math.random() * 1.3;
    piece.style.animationDuration = duration + "s";
    piece.style.animationDelay = (Math.random() * 0.3) + "s";
    el.confettiLayer.appendChild(piece);
    setTimeout(() => piece.remove(), (duration + 0.6) * 1000);
  }
}

let celebrationTimer = null;
let celebrationStage = 0;
const CELEBRATION_STAGES = ["winner", "round", "total"];

function renderCelebBoard(list) {
  if (!list || list.length === 0) {
    return '<li class="empty">No scores yet</li>';
  }
  return list
    .map((row, i) =>
      '<li><span class="rank">#' + (i + 1) + '</span>' + avatarChipHtml(row.username, row.avatarUrl, 22) + '<span class="lbName">' + escapeHtml(row.username) + '</span><span class="lbScore">' + row.score + "</span></li>"
    )
    .join("");
}

function showCelebrationStage(stageIndex, g) {
  const stage = CELEBRATION_STAGES[stageIndex];
  el.celebrationDots.querySelectorAll(".celebDot").forEach((dot) => {
    dot.classList.toggle("active", Number(dot.dataset.stage) === stageIndex);
  });

  if (stage === "winner") {
    const info = g.lastWinInfo;
    const winnerName = (info && info.username) || "Someone";
    const winnerAvatar = info && info.avatarUrl;
    const word = ((info && info.word) || "").toUpperCase();
    const pointsLine = info && typeof info.points === "number" ? '<div class="celebPoints">+' + info.points + " points</div>" : "";
    el.celebrationBody.innerHTML =
      '<div class="celebLabel">🎉 Winner</div>' +
      '<div class="celebWinnerRow">' + avatarChipHtml(winnerName, winnerAvatar, 34) + '<span>' + escapeHtml(winnerName) + "</span></div>" +
      '<div class="celebAnswerRow">' + escapeHtml(word) + "</div>" +
      pointsLine;
  } else if (stage === "round") {
    el.celebrationBody.innerHTML =
      '<div class="celebBoardTitle">🏆 Top scorers this round</div>' +
      '<ul class="celebBoardList">' + renderCelebBoard(lastState ? lastState.roundLeaderboard : []) + "</ul>";
  } else {
    el.celebrationBody.innerHTML =
      '<div class="celebBoardTitle">👑 All-time top scorers</div>' +
      '<ul class="celebBoardList">' + renderCelebBoard(lastState ? lastState.totalLeaderboard : []) + "</ul>";
  }
}

function hideCelebration() {
  clearTimeout(celebrationTimer);
  el.celebrationOverlay.hidden = true;
}

function advanceCelebration(g) {
  celebrationStage += 1;
  if (celebrationStage >= CELEBRATION_STAGES.length) {
    hideCelebration();
    return;
  }
  showCelebrationStage(celebrationStage, g);
  const seconds = g.leaderboardShowSeconds || 3;
  celebrationTimer = setTimeout(() => advanceCelebration(g), seconds * 1000);
}

function triggerWinCelebration(g) {
  spawnConfetti();
  celebrationStage = 0;
  el.celebrationOverlay.hidden = false;
  showCelebrationStage(0, g);
  const seconds = g.leaderboardShowSeconds || 3;
  clearTimeout(celebrationTimer);
  celebrationTimer = setTimeout(() => advanceCelebration(g), seconds * 1000);
}

el.closeCelebration.addEventListener("click", hideCelebration);
el.celebrationOverlay.addEventListener("click", (e) => { if (e.target === el.celebrationOverlay) hideCelebration(); });

let wasWon = false;
function detectWinTransition(g) {
  const isWon = g.status === "won";
  if (isWon && !wasWon) triggerWinCelebration(g);
  wasWon = isWon;
}

// ------------------------------------------------------------
// Rendering
// ------------------------------------------------------------
const CONNECTION_LABELS = {
  idle: "Idle", connecting: "Connecting…", retrying: "Retrying…",
  live: "LIVE", test_mode: "Simulating (Test Mode)", error: "Connection issue", disconnected: "Disconnected"
};

let lastTilesSignature = "";

function render(state) {
  lastState = state;
  if (window.ScoreTicker) window.ScoreTicker.update(state); // update 47: scrolling top-scorers ticker
  if (window.WordLanguage) window.WordLanguage.update(state.game, (mode) => send("set_word_language", { mode })); // update 48: word language
  if (el.languageOverlay && el.languageOverlay.hidden) syncLanguageBoxes(state.game); // update 64: languages popup mirrors the server (not while it is open, so ticks are not overwritten)
  detectWinTransition(state.game);
  renderHeader(state);
  renderModeUI(state.game);
  renderLengthBadge(state.game);
  renderMine(state.game);
  renderTiles(state.game);
  renderHintChips(state.game);
  renderModeNotes(state.game);
  renderBanners(state.game);
  maybeShowRejection(state.game);
  renderSettingsChips(state);
  renderDiagnostics(state.diagnostics);
  if (!el.leaderboardOverlay.hidden) renderLeaderboardTab();
}

function renderHeader(state) {
  const connStatus = state.diagnostics.connectionStatus || "idle";
  el.brandDot.className = "brandDot " + (state.game.mode === "test" ? "test_mode" : connStatus);
  el.modeBadge.textContent = state.game.mode.toUpperCase();
  el.modeBadge.className = "modeBadge " + state.game.mode;
  el.hintBtn.disabled = state.game.status !== "live";
}

function renderModeUI(g) {
  el.liveControls.hidden = g.mode !== "live";
  el.testControls.hidden = g.mode !== "test";
  el.offlineControls.hidden = g.mode !== "offline";
}

function renderLengthBadge(g) {
  el.lengthBadge.textContent = g.status === "idle" ? "— letters" : g.wordLength + " letters";
  if (window.LengthPanel) LengthPanel.update(g); // update 90: the shared word length panel
}

// Tile sizing combines two constraints so guesses always sit on one
// line AND every guess made this round is visible without scrolling:
//   - width:  sized as if the word were at least 17 letters long, so
//             sizing stays visually consistent across rounds instead
//             of ballooning for short words
//   - height: shrinks further if there are enough guess rows that
//             they wouldn't otherwise all fit in the visible area
// (No keyboard in MINEDLE - the grid replaces it.)
function computeAvailableTilesHeight() {
  const viewportH = window.innerHeight;
  const top = el.tilesWrap.getBoundingClientRect().top;
  const reserveBelow = 230; // banners, footer controls, safety margin
  return Math.max(80, viewportH - top - reserveBelow);
}

// Sizes a tile row so it always fits on one line, using the "as if
// at least 17 letters" doubled baseline, clamped by whatever the
// actual word length needs.
function widthConstrainedTileSize(usableWidth, wordLength, hGap) {
  const baselineLength = 17;
  let baselineSize = Math.floor((usableWidth - hGap * (baselineLength - 1)) / baselineLength);
  baselineSize = Math.max(8, baselineSize) * 2;
  baselineSize = Math.min(90, baselineSize);

  let actualFitSize = Math.floor((usableWidth - hGap * (wordLength - 1)) / wordLength);
  actualFitSize = Math.max(8, actualFitSize);

  return Math.min(baselineSize, actualFitSize);
}

function computeTileMetrics(wordLength, rowCount) {
  // update 39: tile size is sized for the word only (never for how many guesses there are - extra rows scroll),
  // and with "Auto-resize tiles" switched off a word longer than 15 letters keeps the 15-letter size and scrolls sideways.
  wordLength = window.TileFit ? window.TileFit.fitLength(wordLength) : wordLength;
  const containerWidth = el.tilesWrap.clientWidth || 320;
  const hGap = 4;
  const avatarGap = 8;

  // MINEDLE has no count badges or number columns - the whole row is just the avatar and the colored letters.
  const badgeColumns = 0;
  const extraBadgeGaps = 6; // small safety margin so a 20-letter row never touches the right edge

  // Pass 1: rough avatar-size estimate to bootstrap a tile size.
  let avatarReserve = 40;
  let tileSizeByWidth = widthConstrainedTileSize(
    Math.max(100, containerWidth - avatarReserve - extraBadgeGaps),
    wordLength + badgeColumns,
    hGap
  );

  // Pass 2: the avatar scales off the tile HEIGHT (see the final
  // formula below) - now that pass 1 gives a rough tile size, redo the
  // fit once more with a much closer avatar-size estimate.
  const tileHeightGuess = tileSizeByWidth; // MINEDLE tiles are square
  avatarReserve = Math.max(14, Math.round(tileHeightGuess * 0.82)) + avatarGap;
  tileSizeByWidth = widthConstrainedTileSize(
    Math.max(100, containerWidth - avatarReserve - extraBadgeGaps),
    wordLength + badgeColumns,
    hGap
  );

  const availableHeight = computeAvailableTilesHeight();
  const vGap = 8;
  const rows = 1; // update 39: was Math.max(1, rowCount) - more guesses used to shrink every tile
  const rowHeightBudget = Math.floor((availableHeight - vGap * (rows - 1)) / rows);
  let tileSizeByHeight = Math.floor(rowHeightBudget);
  tileSizeByHeight = Math.max(8, Math.min(90, tileSizeByHeight));

  const tileSize = Math.max(8, Math.min(tileSizeByWidth, tileSizeByHeight));
  const tileHeight = tileSize;
  const fontSize = Math.max(7, Math.round(tileSize * 0.5));

  const avatarSize = Math.max(14, Math.round(tileHeight * 0.82));
  const avatarFontSize = Math.max(7, Math.round(avatarSize * 0.46));

  return { tileSize, tileHeight, fontSize, gap: hGap, avatarSize, avatarFontSize };
}

// ------------------------------------------------------------
// Per-guesser avatar - a deterministic "colored circle + initial"
// generated from the username (TikTok chat events don't reliably give
// us a hotlinkable profile-photo URL here, so this is a stable stand-in
// that's always the same color/letter for the same person every time).
// ------------------------------------------------------------
const AVATAR_PALETTE = [
  "#e0699c", "#4fa0c4", "#6faa5c", "#e0a934", "#9c6fd1",
  "#e0724a", "#3aa6a6", "#c4577a", "#5c8ae0", "#8aa63a"
];
function hashString(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
}
function avatarColorFor(username) {
  return AVATAR_PALETTE[hashString(username || "?") % AVATAR_PALETTE.length];
}
function avatarInitial(username) {
  const clean = String(username || "").trim();
  return clean ? Array.from(clean)[0].toUpperCase() : "?"; // Array.from keeps emoji (the 🎲 starter label) intact
}

// Builds an actual DOM avatar node (used inside the guess grid, where
// rows are built as real elements, not innerHTML strings). Shows the
// viewer's real TikTok profile picture when we have one; if the image
// URL is missing, blocked, or fails to load, it falls back to the
// deterministic colored-initial circle instead of leaving a blank hole.
function buildAvatarNode(username, avatarUrl, sizePx, fontPx, className) {
  const wrap = document.createElement("div");
  wrap.className = className || "guessAvatar";
  wrap.style.width = sizePx + "px";
  wrap.style.height = sizePx + "px";
  wrap.title = username || "Unknown viewer";

  function showFallback() {
    wrap.innerHTML = "";
    wrap.style.background = avatarColorFor(username);
    wrap.style.fontSize = fontPx + "px";
    wrap.textContent = avatarInitial(username);
  }

  if (avatarUrl) {
    const img = document.createElement("img");
    img.className = "avatarImg";
    img.alt = "";
    img.referrerPolicy = "no-referrer";
    img.onerror = showFallback;
    img.src = avatarUrl;
    wrap.appendChild(img);
  } else {
    showFallback();
  }
  return wrap;
}

// Same idea as buildAvatarNode, but returns an HTML string for spots
// that build their markup with innerHTML (leaderboard rows, the win
// celebration banner) rather than individual DOM nodes.
function avatarChipHtml(username, avatarUrl, sizePx) {
  sizePx = sizePx || 22;
  const initial = escapeHtml(avatarInitial(username));
  const color = avatarColorFor(username);
  const title = escapeHtml(username || "Unknown viewer");
  if (avatarUrl) {
    return (
      '<span class="lbAvatar" style="width:' + sizePx + "px;height:" + sizePx + 'px;" title="' + title + '">' +
      '<img class="avatarImg" alt="" referrerpolicy="no-referrer" src="' + escapeHtml(avatarUrl) + '" ' +
      "onerror=\"this.parentElement.classList.add('lbAvatarFallback');this.parentElement.style.background='" + color + "';this.replaceWith('" + initial + "')\" />" +
      "</span>"
    );
  }
  return (
    '<span class="lbAvatar lbAvatarFallback" style="width:' + sizePx + "px;height:" + sizePx + "px;background:" + color + ';" title="' + title + '">' +
    initial +
    "</span>"
  );
}

function buildGuessBlock(guess, wordLength, metrics) {
  const block = document.createElement("div");
  block.className = "guessBlock";

  if (guess) {
    const avatar = buildAvatarNode(guess.caller, guess.avatarUrl, metrics.avatarSize, metrics.avatarFontSize, "guessAvatar");
    block.appendChild(avatar);
  } else {
    // Keeps the "current" (still-typing) row's tiles aligned under the
    // guessed rows above/below it, instead of shifting left with no
    // avatar column reserved.
    const spacer = document.createElement("div");
    spacer.className = "guessAvatarSpacer";
    spacer.style.width = metrics.avatarSize + "px";
    spacer.style.height = metrics.avatarSize + "px";
    block.appendChild(spacer);
  }

  const rowEl = document.createElement("div");
  rowEl.className = "tileRow";
  rowEl.style.gap = metrics.gap + "px";
  // Every letter is its own tile (never joined to its neighbours): a uniform rounded square in green or grey.
  for (let c = 0; c < wordLength; c++) {
    const tile = document.createElement("div");
    tile.style.width = metrics.tileSize + "px";
    tile.style.height = metrics.tileHeight + "px";
    tile.style.fontSize = metrics.fontSize + "px";
    if (guess) {
      const code = guess.clue[c]; // 0 green / 1 yellow / 2 grey
      tile.className = "tile filled mn" + code;
      tile.textContent = guess.word[c];
      tile.title = colorTitle(code);
    } else {
      tile.className = "tile current";
    }
    rowEl.appendChild(tile);
  }
  block.appendChild(rowEl);

  return block;
}

function renderTiles(g) {
  // The starter word's picture (the live host's TikTok avatar) can arrive after the round has
  // started, so it is part of the cache key.
  const starterRow = g.guesses.find((x) => x.isStarter);
  const starterAvatar = (starterRow && starterRow.avatarUrl) || "";
  const signature = starterAvatar + "|" + g.status + "|" + g.wordLength + "|" + g.guessesMade + "|" + g.roundNumber;
  if (signature === lastTilesSignature) return;
  lastTilesSignature = signature;

  el.tilesWrap.innerHTML = "";
  if (g.status === "idle") return;

  const rowCount = g.guesses.length + (g.status === "live" ? 1 : 0);
  const metrics = computeTileMetrics(g.wordLength, rowCount);

  if (g.status === "live") {
    el.tilesWrap.appendChild(buildGuessBlock(null, g.wordLength, metrics));
  }
  const reversed = g.guesses.slice().reverse();
  reversed.forEach((guess) => {
    el.tilesWrap.appendChild(buildGuessBlock(guess, g.wordLength, metrics));
  });
}

function renderHintChips(g) {
  // update 58: the shared hint system draws the chips, the 3-type menu and the Hints settings (public/shared/hints.js)
  if (window.CraftHints) CraftHints.render(g);
}

function renderModeNotes(g) {
  el.offlineNote.hidden = !(g.status === "live" && g.mode === "offline");
}

function renderBanners(g) {
  el.idleBanner.hidden = g.status !== "idle";
  el.resultBanner.hidden = g.status !== "won" && g.status !== "lost";

  if (g.status === "won") {
    const lastGuess = g.guesses[g.guesses.length - 1];
    const word = (g.lastWinInfo && g.lastWinInfo.word) || (lastGuess && lastGuess.word) || "";
    el.resultBanner.className = "resultBanner win";
    if (g.lastWinInfo && g.lastWinInfo.username) {
      const pointsPart = typeof g.lastWinInfo.points === "number" ? " — +" + g.lastWinInfo.points + " points" : "";
      el.resultText.textContent = "🎉 " + g.lastWinInfo.username + ' solved it! "' + word.toUpperCase() + '"' + pointsPart;
    } else {
      el.resultText.textContent = '🎉 Solved it! The word was "' + word.toUpperCase() + '".';
    }
  } else if (g.status === "lost") {
    el.resultBanner.className = "resultBanner lost";
    el.resultText.textContent = '⏱ Round ended. The word was "' + ((g.secretWord || "").toUpperCase()) + '".';
  }

  if ((g.status === "won" || g.status === "lost") && g.autoContinue) {
    el.autoContinueNote.hidden = false;
    el.autoContinueNote.textContent = "Auto-continuing in " + g.autoContinueSecondsLeft + "s…";
  } else {
    el.autoContinueNote.hidden = true;
  }
}

function renderSettingsChips(state) {
  const g = state.game;
  const modeInfo = MODE_LABELS[g.mode];
  el.modeChip.textContent = "Mode: " + modeInfo.title + " — " + modeInfo.desc;
  el.modeChip.className = "statusChip " + (g.mode === "live" ? "good" : "");

  const connStatus = state.diagnostics.connectionStatus;
  el.connChip.textContent = "TikTok: " + (CONNECTION_LABELS[connStatus] || connStatus);
  el.connChip.className = "statusChip " + (connStatus === "live" ? "good" : connStatus === "error" ? "bad" : "");

  updateConnectButtons();
}

// The drawer's Connect button is usable as soon as "Live" is chosen in the Mode
// dropdown (even before Apply/Save); the bottom-bar one only exists in Live mode.
function updateConnectButtons() {
  const serverIsLive = !!(lastState && lastState.game && lastState.game.mode === "live");
  el.connectBtn.disabled = !(serverIsLive || stagedMode === "live");
  el.connectBtnBottom.disabled = !serverIsLive;
}

function renderDiagnostics(diag) {
  const dictLabel = diag.dictionaryLoading
    ? "Loading…"
    : diag.dictionaryWordCount.toLocaleString() + " words (" + (diag.dictionarySource === "full" ? "full list" : "fallback list") + ")";
  const dictTone = diag.dictionaryLoading ? "warn" : diag.dictionarySource === "full" ? "good" : "bad";

  const rows = [
    ["Raw events received", diag.rawEventCount, "good"],
    ["Last received", diag.lastReceivedUser ? diag.lastReceivedUser + ": " + (diag.lastReceivedText || "(empty)") : "—", null],
    ["Connection status", CONNECTION_LABELS[diag.connectionStatus] || diag.connectionStatus, statusTone(diag.connectionStatus)],
    ["Signing key set up?", diag.signKeyConfigured ? "Yes" : "No — see setup guide", diag.signKeyConfigured ? "good" : "bad"],
    ["Word dictionary", dictLabel, dictTone],
    ["Retry attempts", diag.retryAttempt + " / " + diag.maxRetries, diag.retryAttempt > 0 ? "warn" : null],
    ["Last message", diag.lastErrorMessage || "—", diag.lastErrorMessage ? "bad" : null]
  ];

  el.diagGrid.innerHTML = rows
    .map(([key, val, tone]) =>
      '<div class="diagRow"><span class="diagKey">' + escapeHtml(key) + '</span><span class="diagVal ' + (tone || "") + '">' + escapeHtml(String(val)) + "</span></div>"
    )
    .join("");
}

function statusTone(status) {
  if (status === "live" || status === "test_mode") return "good";
  if (status === "error" || status === "disconnected") return "bad";
  if (status === "connecting" || status === "retrying") return "warn";
  return null;
}

function renderLeaderboardTab() {
  el.tabThisRound.classList.toggle("active", activeLeaderboardTab === "round");
  el.tabAllTime.classList.toggle("active", activeLeaderboardTab === "total");
  if (!lastState) return;

  const g = lastState.game;
  const list = activeLeaderboardTab === "round" ? lastState.roundLeaderboard : lastState.totalLeaderboard;

  if (g.mode === "test") {
    el.leaderboardList.innerHTML = "";
    el.leaderboardNote.hidden = false;
    el.leaderboardNote.textContent = "Test Mode scores aren't saved to the leaderboard.";
    return;
  }
  if (g.mode === "offline") {
    el.leaderboardList.innerHTML = "";
    el.leaderboardNote.hidden = false;
    el.leaderboardNote.textContent = "Offline mode is solo — there's no chat leaderboard here.";
    return;
  }

  el.leaderboardNote.hidden = true;
  if (!list || list.length === 0) {
    el.leaderboardList.innerHTML = '<li class="empty">No scores yet — guesses made in Live mode will show up here.</li>';
    return;
  }
  el.leaderboardList.innerHTML = list
    .map((row, i) =>
      '<li><span class="rank">#' + (i + 1) + '</span>' + avatarChipHtml(row.username, row.avatarUrl, 22) + '<span class="lbName">' + escapeHtml(row.username) + '</span><span class="lbScore">' + row.score + "</span></li>"
    )
    .join("");
}

// ------------------------------------------------------------
// Clue colors: 0 = green (right letter, right spot) / 1 = yellow (in the word, wrong spot) / 2 = grey (not in the word).
// (The legend itself - tiles, marks, numbers, colors, score - is built and customizable through /shared/legend.js.)
// ------------------------------------------------------------
const COLOR_LABELS = ["Green", "Yellow", "Grey"];
const MEANING_LONG = [
  "The letter is correct and in the right position",
  "The letter is in the word but in the wrong position",
  "The letter is not in the word"
];
function colorTitle(code) {
  return COLOR_LABELS[code] + ": " + MEANING_LONG[code];
}

function escapeHtml(str) {
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
