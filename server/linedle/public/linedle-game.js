// linedle-game.js — runs in the browser (host view / display view)
// LINEDLE: N vertical pillars (one per letter), a light-blue wave-line = the secret word (height = letter, A lowest ... Z highest),
// a white wave-line = the latest guess, and green / yellow / grey clue colors for every guess (see linedle-server.js).

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
  waveSection: document.getElementById("waveSection"),
  waveSvg: document.getElementById("waveSvg"),
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
// The wave board. The server sends the secret word's letters as heights (`wave.target`: 0 = A ... 25 = Z, one per pillar).
// The light-blue line is that target; the white line is the newest guess (older guesses stay as faint white trails). Where the
// white line crosses a pillar, a dot shows the clue color of that letter (green / yellow / grey). When the white line sits
// exactly on the blue one the round is won. The page only draws - every number comes from the server.
// ------------------------------------------------------------
const SVG_NS = "http://www.w3.org/2000/svg";
const WAVE_W = 700, WAVE_H = 300, WAVE_TOP = 34, WAVE_BOTTOM = 252, WAVE_PAD_L = 54, WAVE_PAD_R = 22;
const CLUE_CLASS = ["clueGreen", "clueYellow", "clueGrey"];
let lastWaveSignature = "";

// The look of the wave panel (update 92). The defaults below mirror server/shared/linedle-wave-store.js; the server sends the
// host's real choices as `game.waveStyle`. A color of "" = Auto (follows Color shades).
const WAVE_DEFAULTS = {
  bgMode: "gradient", bg1: "#1d3566", bg2: "#0b1530", borderShow: true, borderColor: "#0b1530", radius: 14, maxHeight: 340,
  pillarsShow: true, pillarColor: "#ffffff", pillarOpacity: 9, pillarWidth: 100, pillarOutline: true,
  labelsShow: true, labelColor: "#ffffff", labelSize: 15,
  guideShow: true, guideColor: "#ffffff", guideOpacity: 13, guideThickness: 1, guideStyle: "dotted", guideEvery: "5",
  scaleShow: true, scaleColor: "#ffffff", scaleOpacity: 72, scaleSize: 13, scaleEvery: "5",
  blueColor: "", blueThickness: 6, blueGlow: true, targetDotsShow: true, targetDotSize: 7,
  whiteColor: "", whiteThickness: 3.5, whiteGlow: true, guessDotsShow: true, guessDotSize: 9, dotLettersShow: true,
  trailShow: true, trailCount: 4, trailThickness: 3, trailOpacity: 20
};

function svgEl(name, attrs, parent) {
  const node = document.createElementNS(SVG_NS, name);
  for (const k in attrs) node.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(node);
  return node;
}
function hexToRgba(hex, alpha) {
  const h = String(hex || "#ffffff").replace("#", "");
  const n = parseInt(h.length === 6 ? h : "ffffff", 16);
  return "rgba(" + ((n >> 16) & 255) + "," + ((n >> 8) & 255) + "," + (n & 255) + "," + alpha + ")";
}
function waveX(i, n) {
  return WAVE_PAD_L + ((i + 0.5) * (WAVE_W - WAVE_PAD_L - WAVE_PAD_R)) / n;
}
function waveY(k) {
  return WAVE_BOTTOM - (k / 25) * (WAVE_BOTTOM - WAVE_TOP);
}
// A smooth wave through the points: flat at every pillar, so it crosses each pillar at exactly the letter's height.
function wavePath(values) {
  const n = values.length;
  const pts = values.map((k, i) => [waveX(i, n), waveY(k)]);
  let d = "M " + WAVE_PAD_L + " " + pts[0][1].toFixed(1) + " L " + pts[0][0].toFixed(1) + " " + pts[0][1].toFixed(1);
  for (let i = 1; i < n; i++) {
    const [x0, y0] = pts[i - 1];
    const [x1, y1] = pts[i];
    const mx = (x0 + x1) / 2;
    d += " C " + mx.toFixed(1) + " " + y0.toFixed(1) + " " + mx.toFixed(1) + " " + y1.toFixed(1) + " " + x1.toFixed(1) + " " + y1.toFixed(1);
  }
  d += " L " + (WAVE_W - WAVE_PAD_R) + " " + pts[n - 1][1].toFixed(1);
  return d;
}
function wordWave(word) {
  return String(word).split("").map((ch) => Math.max(0, Math.min(25, ch.charCodeAt(0) - 97)));
}
// which letters get a line / a left-side letter: every letter, every 2nd, every 5th (A F K P U Z), or only A and Z
function tickList(every) {
  if (every === "ends") return [0, 25];
  const step = every === "1" ? 1 : every === "2" ? 2 : 5;
  const list = [];
  for (let k = 0; k <= 25; k += step) list.push(k);
  if (25 - list[list.length - 1] >= 3) list.push(25);
  return list;
}

// Paints the panel box itself (background, border, corners, height) from the host's look.
function applyPanelStyle(st) {
  const box = el.waveSection;
  box.style.background = st.bgMode === "transparent" ? "transparent" : st.bgMode === "solid" ? st.bg1 : "radial-gradient(120% 120% at 50% 0%, " + st.bg1 + " 0%, " + st.bg2 + " 100%)";
  box.style.border = st.borderShow ? "1px solid " + st.borderColor : "1px solid transparent";
  box.style.borderRadius = st.radius + "px";
  el.waveSvg.style.maxHeight = st.maxHeight + "px";
}

function renderWave(g) {
  const show = g.status !== "idle" && g.wave && g.wave.target && g.wave.target.length > 0;
  if (el.waveSection.hidden === show) el.waveSection.hidden = !show;
  if (!show) { lastWaveSignature = ""; return; }

  const st = Object.assign({}, WAVE_DEFAULTS, g.waveStyle || {});
  const target = g.wave.target;
  const n = target.length;
  const ended = g.status !== "live";
  const trail = (g.guesses || []).slice(-5); // the newest guess is the white line, the guesses before it are faint trails
  const newest = trail.length ? trail[trail.length - 1] : null;
  const won = g.status === "won";
  const signature = [g.roundNumber, g.status, g.guessesMade, target.join(","), trail.map((t) => t.word + ":" + (t.clue || []).join("")).join("/"), JSON.stringify(st)].join("|");
  if (signature === lastWaveSignature) return;
  const parts = lastWaveSignature ? lastWaveSignature.split("|") : [];
  lastWaveSignature = signature;
  const animateNew = parts[0] === String(g.roundNumber) && Number(g.guessesMade) > Number(parts[2] || 0) && parts[5] === JSON.stringify(st);

  applyPanelStyle(st);
  const blue = st.blueColor || "var(--ln-wave, #8FD3FF)";
  const white = st.whiteColor || "var(--ln-guess, #FFFFFF)";

  const svg = el.waveSvg;
  while (svg.firstChild) svg.removeChild(svg.firstChild);
  svg.setAttribute("viewBox", "0 0 " + WAVE_W + " " + WAVE_H);
  svg.setAttribute("aria-label", n + " pillars: the light blue wave is the secret word, the white wave is the latest guess");

  // horizontal guide lines (one per chosen letter height) and the A..Z letters on the left side - each can be hidden on its own
  const guideTicks = st.guideShow ? tickList(st.guideEvery) : [];
  const scaleTicks = st.scaleShow ? tickList(st.scaleEvery) : [];
  const dash = st.guideStyle === "solid" ? "none" : st.guideStyle === "dashed" ? "8 6" : st.guideThickness + " " + (st.guideThickness + 5);
  const guides = svgEl("g", { class: "waveGuides" }, svg);
  guideTicks.forEach((k) => {
    const y = waveY(k);
    svgEl("line", { x1: WAVE_PAD_L - 8, x2: WAVE_W - WAVE_PAD_R, y1: y, y2: y, stroke: hexToRgba(st.guideColor, st.guideOpacity / 100), "stroke-width": st.guideThickness, "stroke-dasharray": dash, "stroke-linecap": "round" }, guides);
  });
  scaleTicks.forEach((k) => {
    const t = svgEl("text", { x: WAVE_PAD_L - 16, y: waveY(k) + st.scaleSize * 0.36, "text-anchor": "end", fill: hexToRgba(st.scaleColor, st.scaleOpacity / 100), style: "font:700 " + st.scaleSize + "px var(--font-display, sans-serif)" }, guides);
    t.textContent = String.fromCharCode(65 + k);
  });

  // the pillars (and their number / letter labels underneath)
  const slot = (WAVE_W - WAVE_PAD_L - WAVE_PAD_R) / n;
  // update 99: pillar width 5% - 600% of the normal width (never wider than its own slot, so neighbours never overlap)
  const pillarW = Math.max(1, Math.min(slot * 0.96, Math.round(Math.max(8, Math.min(22, slot * 0.34)) * st.pillarWidth / 100 * 10) / 10));
  const pillars = svgEl("g", { class: "wavePillars" }, svg);
  for (let i = 0; i < n; i++) {
    const x = waveX(i, n);
    if (st.pillarsShow) {
      svgEl("rect", { x: x - pillarW / 2, y: WAVE_TOP - 14, width: pillarW, height: WAVE_BOTTOM - WAVE_TOP + 28, rx: pillarW / 2, fill: hexToRgba(st.pillarColor, st.pillarOpacity / 100), stroke: st.pillarOutline ? hexToRgba(st.pillarColor, 0.22) : "none", "stroke-width": 1.2 }, pillars);
    }
    if (st.labelsShow) {
      const label = svgEl("text", { x: x, y: WAVE_BOTTOM + 38, "text-anchor": "middle", fill: ended ? blue : hexToRgba(st.labelColor, 0.55), style: "font:" + (ended ? 800 : 700) + " " + Math.round(st.labelSize * (ended ? 1.3 : 1)) + "px var(--font-display, sans-serif)" }, pillars);
      label.textContent = ended ? String.fromCharCode(65 + target[i]) : String(i + 1);
    }
  }

  // older guesses: faint white trails
  if (st.trailShow && st.trailCount > 0) {
    trail.slice(0, -1).slice(-st.trailCount).forEach((t) => {
      svgEl("path", { d: wavePath(wordWave(t.word)), fill: "none", stroke: hexToRgba(st.whiteColor || "#ffffff", st.trailOpacity / 100), "stroke-width": st.trailThickness, "stroke-dasharray": "2 7", "stroke-linecap": "round" }, svg);
    });
  }

  // the light-blue wave = the secret word
  const tPath = svgEl("path", { d: wavePath(target), fill: "none", stroke: blue, "stroke-width": st.blueThickness, "stroke-linecap": "round", "stroke-linejoin": "round" }, svg);
  if (st.blueGlow) tPath.style.filter = won ? "drop-shadow(0 0 10px rgba(143,255,190,.9))" : "drop-shadow(0 0 6px " + (st.blueColor ? st.blueColor : "rgba(143,211,255,.75)") + ")";
  if (st.targetDotsShow) {
    const tdots = svgEl("g", { class: "waveTargetDots" }, svg);
    for (let i = 0; i < n; i++) svgEl("circle", { cx: waveX(i, n), cy: waveY(target[i]), r: st.targetDotSize, fill: blue, stroke: st.bg2, "stroke-width": 2 }, tdots);
  }

  // the white wave = the newest guess, with a clue-colored dot on every pillar
  if (newest) {
    const vals = wordWave(newest.word);
    const path = svgEl("path", { d: wavePath(vals), fill: "none", stroke: white, "stroke-width": st.whiteThickness, "stroke-linecap": "round", "stroke-linejoin": "round", pathLength: "1", class: animateNew ? "waveGuess waveDraw" : "waveGuess" }, svg);
    path.style.stroke = white; path.style.strokeWidth = String(st.whiteThickness);
    if (st.whiteGlow) path.style.filter = "drop-shadow(0 0 4px " + (st.whiteColor ? st.whiteColor : "rgba(255,255,255,.7)") + ")";
    if (animateNew) path.style.strokeDasharray = "1";
    if (st.guessDotsShow) {
      const gdots = svgEl("g", { class: "waveGuessDots" }, svg);
      for (let i = 0; i < n; i++) {
        const c = (newest.clue || [])[i];
        const dot = svgEl("circle", { cx: waveX(i, n), cy: waveY(vals[i]), r: st.guessDotSize, stroke: st.bg2, "stroke-width": 2, class: "waveGuessDot " + (CLUE_CLASS[c] || "clueGrey") + (animateNew ? " waveDotIn" : "") }, gdots);
        if (animateNew) dot.style.animationDelay = (0.15 + i * 0.07) + "s";
        if (st.dotLettersShow) {
          const letter = svgEl("text", { x: waveX(i, n), y: waveY(vals[i]) + st.guessDotSize * 0.42, "text-anchor": "middle", class: "waveDotLetter", style: "font:800 " + Math.max(7, Math.round(st.guessDotSize * 1.2)) + "px var(--font-display, sans-serif)" }, gdots);
          letter.textContent = newest.word[i].toUpperCase();
        }
      }
    }
  }
}

// ---- Settings -> "Wave panel look" (update 92). Built from this list so every control sends one tiny patch to the server;
// the server saves it and every connected screen repaints at once.
const WAVE_CONTROLS = [
  { h: "Panel box", rows: [
    { k: "bgMode", l: "Background", t: "select", o: [["gradient", "Gradient (2 colors)"], ["solid", "One solid color"], ["transparent", "Transparent"]] },
    { k: "bg1", l: "Background color 1", t: "color" }, { k: "bg2", l: "Background color 2 (gradient end, dot outlines)", t: "color" },
    { k: "borderShow", l: "Show the panel border", t: "switch" }, { k: "borderColor", l: "Border color", t: "color" },
    { k: "radius", l: "Corner roundness", t: "range", min: 0, max: 40, step: 1, u: "px" },
    { k: "maxHeight", l: "Panel height (max)", t: "range", min: 160, max: 700, step: 10, u: "px" } ] },
  { h: "Pillars", rows: [
    { k: "pillarsShow", l: "Show the pillars", t: "switch" }, { k: "pillarColor", l: "Pillar color", t: "color" },
    { k: "pillarOpacity", l: "Pillar strength", t: "range", min: 0, max: 80, step: 1, u: "%" },
    { k: "pillarWidth", l: "Pillar width", t: "range", min: 5, max: 600, step: 5, u: "%" },
    { k: "pillarOutline", l: "Pillar outline", t: "switch" },
    { k: "labelsShow", l: "Show the numbers / letters under the pillars", t: "switch" }, { k: "labelColor", l: "Number color", t: "color" },
    { k: "labelSize", l: "Number size", t: "range", min: 8, max: 32, step: 1, u: "px" } ] },
  { h: "Horizontal letter lines", rows: [
    { k: "guideShow", l: "Show the horizontal lines", t: "switch" }, { k: "guideColor", l: "Line color", t: "color" },
    { k: "guideOpacity", l: "Line strength", t: "range", min: 2, max: 100, step: 1, u: "%" },
    { k: "guideThickness", l: "Line thickness", t: "range", min: 0.25, max: 12, step: 0.25, u: "px" },
    { k: "guideStyle", l: "Line style", t: "select", o: [["dotted", "Dotted"], ["dashed", "Dashed"], ["solid", "Solid"]] },
    { k: "guideEvery", l: "Which letters get a line", t: "select", o: [["5", "A F K P U Z"], ["2", "Every 2nd letter"], ["1", "Every letter A-Z"], ["ends", "Only A and Z"]] } ] },
  { h: "Letters on the left side", rows: [
    { k: "scaleShow", l: "Show the letters on the left", t: "switch" }, { k: "scaleColor", l: "Letter color", t: "color" },
    { k: "scaleOpacity", l: "Letter strength", t: "range", min: 10, max: 100, step: 1, u: "%" },
    { k: "scaleSize", l: "Letter size", t: "range", min: 8, max: 30, step: 1, u: "px" },
    { k: "scaleEvery", l: "Which letters are shown", t: "select", o: [["5", "A F K P U Z"], ["2", "Every 2nd letter"], ["1", "Every letter A-Z"], ["ends", "Only A and Z"]] } ] },
  { h: "Light-blue wave (the secret word)", rows: [
    { k: "blueColor", l: "Color", t: "color", auto: true },
    { k: "blueThickness", l: "Line thickness", t: "range", min: 0.5, max: 40, step: 0.5, u: "px" },
    { k: "blueGlow", l: "Glow", t: "switch" }, { k: "targetDotsShow", l: "Show the dots on the pillars", t: "switch" },
    { k: "targetDotSize", l: "Dot size", t: "range", min: 2, max: 40, step: 1, u: "px" } ] },
  { h: "White wave (the guess)", rows: [
    { k: "whiteColor", l: "Color", t: "color", auto: true },
    { k: "whiteThickness", l: "Line thickness", t: "range", min: 0.5, max: 40, step: 0.5, u: "px" },
    { k: "whiteGlow", l: "Glow", t: "switch" }, { k: "guessDotsShow", l: "Show the green / yellow / grey dots", t: "switch" },
    { k: "guessDotSize", l: "Dot size", t: "range", min: 2, max: 44, step: 1, u: "px" },
    { k: "dotLettersShow", l: "Show the letter inside each dot", t: "switch" },
    { k: "trailShow", l: "Show earlier guesses as faint trails", t: "switch" },
    { k: "trailCount", l: "How many trails", t: "range", min: 0, max: 4, step: 1, u: "" },
    { k: "trailThickness", l: "Trail thickness", t: "range", min: 0.5, max: 24, step: 0.5, u: "px" },
    { k: "trailOpacity", l: "Trail strength", t: "range", min: 5, max: 80, step: 1, u: "%" } ] }
];
const WAVE_PRESETS = [
  ["Night blue (standard)", {}],
  ["Clean light", { bgMode: "solid", bg1: "#f4f7fb", bg2: "#ffffff", borderColor: "#c9d3e3", pillarColor: "#1b2a4a", pillarOpacity: 8, guideColor: "#1b2a4a", scaleColor: "#1b2a4a", labelColor: "#1b2a4a", blueColor: "#3aa0e8", whiteColor: "#1b2a4a", blueGlow: false, whiteGlow: false }],
  ["Neon", { bgMode: "solid", bg1: "#07040f", bg2: "#07040f", borderColor: "#ff2ec4", pillarColor: "#ff2ec4", pillarOpacity: 12, guideColor: "#7a5cff", scaleColor: "#7a5cff", blueColor: "#00e5ff", whiteColor: "#fff700", blueThickness: 7, whiteThickness: 4 }],
  ["Chalkboard", { bgMode: "solid", bg1: "#24362c", bg2: "#24362c", borderColor: "#8a6b3d", pillarColor: "#f2f0e6", pillarOpacity: 10, guideColor: "#f2f0e6", guideStyle: "dashed", scaleColor: "#f2f0e6", blueColor: "#8fd3ff", whiteColor: "#f7f3d9", blueGlow: false, whiteGlow: false }],
  ["Minimal (no lines or letters)", { guideShow: false, scaleShow: false, pillarOutline: false }]
];

function buildWaveSettings() {
  const body = document.getElementById("waveStyleBody");
  if (!body || body.dataset.built) return;
  body.dataset.built = "1";
  const cur = () => Object.assign({}, WAVE_DEFAULTS, (lastState && lastState.game && lastState.game.waveStyle) || {});
  const sendPatch = (patch) => send("set_wave_style", patch);
  const pre = document.createElement("div");
  pre.className = "waveStylePresets";
  WAVE_PRESETS.forEach(([name, patch]) => {
    const b = document.createElement("button");
    b.type = "button"; b.className = "btn btnGhost waveStyleBtn"; b.textContent = name;
    b.addEventListener("click", () => { send("reset_wave_style", {}); if (Object.keys(patch).length) sendPatch(patch); });
    pre.appendChild(b);
  });
  body.appendChild(pre);
  WAVE_CONTROLS.forEach((grp) => {
    const box = document.createElement("div"); box.className = "waveStyleGroup";
    const h = document.createElement("h5"); h.textContent = grp.h; box.appendChild(h);
    grp.rows.forEach((r) => {
      const row = document.createElement("label"); row.className = "waveStyleRow"; row.dataset.key = r.k;
      const lab = document.createElement("span"); lab.className = "waveStyleLabel"; lab.textContent = r.l; row.appendChild(lab);
      let input;
      if (r.t === "switch") {
        input = document.createElement("input"); input.type = "checkbox";
        input.addEventListener("change", () => sendPatch({ [r.k]: input.checked }));
      } else if (r.t === "color") {
        input = document.createElement("input"); input.type = "color";
        input.addEventListener("input", () => sendPatch({ [r.k]: input.value }));
        if (r.auto) {
          const au = document.createElement("button"); au.type = "button"; au.className = "waveStyleAuto"; au.textContent = "Auto"; au.title = "Follow Color shades";
          au.addEventListener("click", (e) => { e.preventDefault(); sendPatch({ [r.k]: "" }); });
          row.appendChild(au);
        }
      } else if (r.t === "range") {
        input = document.createElement("input"); input.type = "range"; input.min = r.min; input.max = r.max; input.step = r.step;
        const val = document.createElement("span"); val.className = "waveStyleVal"; row.appendChild(val);
        input.addEventListener("input", () => { val.textContent = input.value + r.u; });
        input.addEventListener("change", () => sendPatch({ [r.k]: Number(input.value) }));
      } else {
        input = document.createElement("select");
        r.o.forEach(([v, t]) => { const o = document.createElement("option"); o.value = v; o.textContent = t; input.appendChild(o); });
        input.addEventListener("change", () => sendPatch({ [r.k]: input.value }));
      }
      input.className = "waveStyleInput"; row.appendChild(input);
      box.appendChild(row);
    });
    body.appendChild(box);
  });
  const reset = document.createElement("button");
  reset.type = "button"; reset.className = "btn btnGhost"; reset.textContent = "Reset the wave panel look";
  reset.addEventListener("click", () => send("reset_wave_style", {}));
  body.appendChild(reset);
  body.syncFrom = () => {
    const st = cur();
    body.querySelectorAll(".waveStyleRow").forEach((row) => {
      const k = row.dataset.key, r = WAVE_CONTROLS.flatMap((g) => g.rows).find((x) => x.k === k), input = row.querySelector(".waveStyleInput");
      if (!r || !input || document.activeElement === input) return;
      if (r.t === "switch") input.checked = !!st[k];
      else if (r.t === "color") { input.value = st[k] || (k === "blueColor" ? "#8fd3ff" : "#ffffff"); row.classList.toggle("isAuto", !st[k]); }
      else { input.value = st[k]; const v = row.querySelector(".waveStyleVal"); if (v) v.textContent = st[k] + r.u; }
    });
  };
  body.syncFrom();
}
function syncWaveSettings() {
  buildWaveSettings();
  const body = document.getElementById("waveStyleBody");
  if (body && body.syncFrom) body.syncFrom();
}
// the board scales with its box (viewBox), so no measuring is needed on resize.

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
  el.strictFitToggle.checked = g.strictFit === true; // Strict fit is OFF in LINEDLE unless the host switched it on
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
// 🌊 shortcut: opens Settings straight on the "Wave panel look" card (Look & sound)
const waveLookBtn = document.getElementById("waveLookBtn");
if (waveLookBtn) waveLookBtn.addEventListener("click", () => {
  el.settingsBtn.click();
  setTimeout(() => {
    if (window.CraftSettings && window.CraftSettings.goTo) window.CraftSettings.goTo("look");
    const card = document.getElementById("waveStyleSection");
    if (card && card.scrollIntoView) card.scrollIntoView({ block: "start" });
  }, 60);
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

// LINEDLE talks to the server over its own Socket.IO namespace "/linedle"
// (Socket.IO reconnects automatically, so no manual retry loop is needed).
function connectSocket() {
  socket = io("/linedle");

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

// Starter word: OFF by default in LINEDLE, remembered by the server, used from the next round.
if (el.starterWordToggle) el.starterWordToggle.addEventListener("change", () => {
  send("set_starter_word", { on: el.starterWordToggle.checked });
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
  renderWave(state.game);
  syncWaveSettings();
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
// (No keyboard in LINEDLE - the wave board replaces it.)
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

  // LINEDLE has no count badges or number columns - the whole row is just the avatar and the colored letters.
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
  const tileHeightGuess = tileSizeByWidth; // LINEDLE tiles are square
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
      tile.className = "tile filled ln" + code;
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
