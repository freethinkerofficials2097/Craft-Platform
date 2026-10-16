// betweendle-game.js — runs in the browser (host view / display view)
// BETWEENDLE: every guess shows its alphabetical distance from the secret word and moves the lower / upper bound (see betweendle-server.js).

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
  hintChips: document.getElementById("hintChips"),
  hintExplainer: document.getElementById("hintExplainer"),
  offlineNote: document.getElementById("offlineNote"),
  resultBanner: document.getElementById("resultBanner"),
  playAgainBtn: document.getElementById("playAgainBtn"),
  autoContinueNote: document.getElementById("autoContinueNote"),
  idleBanner: document.getElementById("idleBanner"),
  bdBoard: document.getElementById("bdBoard"),
  boardStatus: document.getElementById("boardStatus"),
  legendSection: document.getElementById("legendSection"),
  legendTitle: document.getElementById("legendTitle"),
  legendList: document.getElementById("legendList"),
  legendNote: document.getElementById("legendNote"),
  legendShowToggle: document.getElementById("legendShowToggle"),

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
// Card design (update 83): the look of the three boxes - lower bound, hidden word, upper bound.
// The host picks one of seven designs and tunes colors / font / size / corners / border / shadow / spacing in
// Settings -> Card design. The choice lives on the server (data/betweendle-settings.json) so every connected screen
// shows the same look; this code paints it onto #bdBoard (CSS in betweendle-style.css reads the attributes + variables).
// BETWEENDLE has no keyboard: the old A-Z letter tiles were removed in this update.
// ------------------------------------------------------------
const CARD_DEFAULTS = {
  style: "stitched", font: "default",
  cardColor: "", secretColor: "", textColor: "", accentColor: "",
  textScale: 100, radius: 18, borderWidth: 3, shadow: 2, gap: 14,
  labels: false, distance: true, animate: true,
  // update 84: the panel (white box) behind the three boxes
  panel: true, panelColor: "", panelBorderColor: "", panelOpacity: 100, panelBorderWidth: 1, panelRadius: 22, panelPadding: 14, panelShadow: 2
};
// name / one-line hint / recommended corners, border and shadow for each design
// faceFromCard: the "Card color" is the face of the box (so the text color is picked to stay readable on it)
const CARD_STYLES = [
  { id: "stitched", name: "Stitched", hint: "Knitted patch with a dashed seam", radius: 18, borderWidth: 3, shadow: 2, faceFromCard: true, whiteMix: 0 },
  { id: "flat", name: "Flat", hint: "Clean solid card, thin border", radius: 10, borderWidth: 2, shadow: 1, faceFromCard: true, whiteMix: 0 },
  { id: "glass", name: "Glass", hint: "Frosted, see-through card", radius: 22, borderWidth: 1, shadow: 2, faceFromCard: true, whiteMix: 0.45 },
  { id: "neon", name: "Neon", hint: "Dark card, glowing outline", radius: 14, borderWidth: 2, shadow: 2, faceFromCard: false, whiteMix: 0 },
  { id: "ticket", name: "Ticket", hint: "Punched notches, perforation", radius: 10, borderWidth: 2, shadow: 1, faceFromCard: true, whiteMix: 0 },
  { id: "sticker", name: "Sticker", hint: "Bold outline, hard shadow", radius: 14, borderWidth: 3, shadow: 2, faceFromCard: true, whiteMix: 0 },
  { id: "soft", name: "Soft", hint: "Raised clay, pressed hidden box", radius: 22, borderWidth: 0, shadow: 2, faceFromCard: true, whiteMix: 0 },
  // update 84: seven more designs
  { id: "gradient", name: "Gradient", hint: "Vivid two-color fade, white text", radius: 16, borderWidth: 0, shadow: 2, faceFromCard: true, whiteMix: 0 },
  { id: "outline", name: "Outline", hint: "See-through with a thick line", radius: 14, borderWidth: 3, shadow: 0, faceFromCard: false, whiteMix: 0 },
  { id: "notebook", name: "Notebook", hint: "Ruled paper, sticky-note hidden box", radius: 6, borderWidth: 1, shadow: 1, faceFromCard: true, whiteMix: 0 },
  { id: "chalk", name: "Chalkboard", hint: "Green board in a wooden frame", radius: 8, borderWidth: 5, shadow: 2, faceFromCard: true, whiteMix: 0 },
  { id: "arcade", name: "Arcade", hint: "Pixel corners, glowing screen", radius: 0, borderWidth: 4, shadow: 2, faceFromCard: false, whiteMix: 0 },
  { id: "wood", name: "Wood", hint: "Wooden plank with grain", radius: 10, borderWidth: 3, shadow: 2, faceFromCard: true, whiteMix: 0 },
  { id: "metal", name: "Metal", hint: "Brushed gold, silver hidden box", radius: 14, borderWidth: 2, shadow: 2, faceFromCard: true, whiteMix: 0 }
];
const CARD_FONTS = [
  { id: "default", name: "Standard", css: "" },
  { id: "rounded", name: "Rounded", css: "'Quicksand', 'Space Grotesk', sans-serif" },
  { id: "grotesk", name: "Modern", css: "'Space Grotesk', 'Inter', system-ui, sans-serif" },
  { id: "mono", name: "Typewriter", css: "ui-monospace, 'SFMono-Regular', Menlo, Consolas, monospace" },
  { id: "script", name: "Script", css: "'Pacifico', cursive" }
];
const CARD_PRESET_COLORS = ["#F4E9CF", "#FFFFFF", "#BFE3FF", "#CDEFC8", "#FFD3E4", "#E4D4FF", "#FFE08A", "#FF9E8F", "#3A4256", "#15151C"];
const CARD_COLOR_FIELDS = [
  { key: "cardColor", label: "Card color", hint: "Lower and upper boxes. Auto follows the theme and Color shades -> Card.", fallback: "#E2D6B8" },
  { key: "secretColor", label: "Hidden-word card color", hint: "The middle box. Auto = a lighter version of the card color. It turns green when found.", fallback: "#F0E8D4" },
  { key: "textColor", label: "Text color", hint: "Words and distances. Auto picks a readable color.", fallback: "#3A2D20" },
  { key: "accentColor", label: "Border / accent color", hint: "Outline, seam, glow and caption color. Auto follows the theme.", fallback: "#6B4423" }
];
const CARD_SLIDERS = [
  { key: "textScale", label: "Text size", min: 70, max: 140, step: 5, unit: "%" },
  { key: "radius", label: "Corner roundness", min: 0, max: 32, step: 1, unit: "px" },
  { key: "borderWidth", label: "Border thickness", min: 0, max: 8, step: 1, unit: "px" },
  { key: "shadow", label: "Shadow / glow depth", min: 0, max: 3, step: 1, unit: "" },
  { key: "gap", label: "Space between the boxes", min: 6, max: 30, step: 1, unit: "px" }
];
const CARD_TOGGLES = [
  { key: "labels", label: "Show captions (LOWER BOUND / HIDDEN WORD / UPPER BOUND)" },
  { key: "distance", label: "Show the distance number" },
  { key: "animate", label: "Pop-in animation when the board changes" }
];
// the panel behind the three boxes (the "white box")
const PANEL_TOGGLES = [{ key: "panel", label: "Show the panel behind the game" }];
const PANEL_COLOR_FIELDS = [
  { key: "panelColor", label: "Panel color", hint: "Auto follows the theme.", fallback: "#FFF8E8" },
  { key: "panelBorderColor", label: "Panel border color", hint: "Auto follows the theme.", fallback: "#D9BE93" }
];
const PANEL_SLIDERS = [
  { key: "panelOpacity", label: "Panel opacity", min: 0, max: 100, step: 5, unit: "%" },
  { key: "panelBorderWidth", label: "Panel border thickness", min: 0, max: 8, step: 1, unit: "px" },
  { key: "panelRadius", label: "Panel corner roundness", min: 0, max: 48, step: 1, unit: "px" },
  { key: "panelPadding", label: "Space inside the panel", min: 0, max: 32, step: 1, unit: "px" },
  { key: "panelShadow", label: "Panel shadow depth", min: 0, max: 3, step: 1, unit: "" }
];
const ALL_COLOR_FIELDS = CARD_COLOR_FIELDS.concat(PANEL_COLOR_FIELDS);
const ALL_SLIDERS = CARD_SLIDERS.concat(PANEL_SLIDERS);
const ALL_TOGGLES = CARD_TOGGLES.concat(PANEL_TOGGLES);
const PANEL_DEFAULTS = { panel: true, panelColor: "", panelBorderColor: "", panelOpacity: 100, panelBorderWidth: 1, panelRadius: 22, panelPadding: 14, panelShadow: 2 };
const roundCardEl = document.getElementById("roundCard");
const cardPicker = document.getElementById("cardDesignPicker");
let curCard = { ...CARD_DEFAULTS };
let lastCardSig = "";
let cardUi = null; // references into the picker DOM, filled by buildCardPicker()

function cardHexToRgb(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || ""));
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
// readable text color for a given face color (optionally as seen after mixing some white into it)
function cardInkFor(hex, whiteMix) {
  const rgb = cardHexToRgb(hex);
  if (!rgb) return "";
  const w = whiteMix || 0;
  const c = rgb.map((v) => v * (1 - w) + 255 * w).map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  const lum = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  return lum > 0.42 ? "#1f1a14" : "#ffffff";
}
function cardStyleMeta(id) { return CARD_STYLES.find((s) => s.id === id) || CARD_STYLES[0]; }

function cardSetVar(target, name, val) {
  if (val === "" || val === null || val === undefined) target.style.removeProperty(name); else target.style.setProperty(name, String(val));
}
// Writes the panel (the box behind the whole game) onto an element: the real .round-card or the preview in Settings.
function paintPanel(target, d) {
  if (!target) return;
  target.setAttribute("data-panel", d.panel ? "on" : "off");
  target.setAttribute("data-panel-color", d.panelColor ? "custom" : "auto");
  target.setAttribute("data-panel-sh", String(d.panelShadow));
  cardSetVar(target, "--bdp-color", d.panelColor);
  cardSetVar(target, "--bdp-op", d.panelOpacity + "%");
  cardSetVar(target, "--bdp-border", d.panelBorderColor);
  cardSetVar(target, "--bdp-bw", d.panelBorderWidth + "px");
  cardSetVar(target, "--bdp-radius", d.panelRadius + "px");
  cardSetVar(target, "--bdp-pad", d.panelPadding + "px");
}
function paintAll(d) { paintCardDesign(el.bdBoard, d); paintPanel(roundCardEl, d); }

// Writes the look onto an element (the real board, the live preview, or a design thumbnail).
// opts.onlyLook = true -> only design + colors + font (thumbnails keep their own small size, border and shadow).
function paintCardDesign(target, d, opts) {
  if (!target) return;
  const onlyLook = Boolean(opts && opts.onlyLook);
  const meta = cardStyleMeta(d.style);
  const setVar = (name, val) => { if (val === "" || val === null || val === undefined) target.style.removeProperty(name); else target.style.setProperty(name, String(val)); };
  target.setAttribute("data-card-style", meta.id);
  target.setAttribute("data-font", d.font);
  setVar("--bdc-card", d.cardColor);
  setVar("--bdc-secret", d.secretColor);
  setVar("--bdc-accent", d.accentColor);
  const font = CARD_FONTS.find((f) => f.id === d.font);
  setVar("--bdc-font", font ? font.css : "");
  // readable text: the host's own text color wins; otherwise follow a custom face color
  let ink = "", inkSecret = "";
  if (d.textColor) {
    ink = inkSecret = d.textColor;
  } else if (meta.faceFromCard) {
    if (d.cardColor) ink = cardInkFor(d.cardColor, meta.whiteMix);
    if (d.secretColor) inkSecret = cardInkFor(d.secretColor, meta.whiteMix ? 0.4 : 0);
    else if (d.cardColor) inkSecret = cardInkFor(d.cardColor, Math.max(0.55, meta.whiteMix));
  }
  setVar("--bdc-ink", ink);
  setVar("--bdc-ink-secret", inkSecret);
  // light text means a dark box: brighter locked letters and no white text-shadow (see the data-ink rules in the CSS)
  const isLightInk = (c) => c === "#ffffff" || (/^#[0-9a-f]{6}$/i.test(c) && cardInkFor(c, 0) === "#1f1a14");
  if (ink && isLightInk(ink)) target.setAttribute("data-ink", "light"); else target.removeAttribute("data-ink");
  if (inkSecret && isLightInk(inkSecret)) target.setAttribute("data-ink-secret", "light"); else target.removeAttribute("data-ink-secret");
  if (onlyLook) return;
  target.setAttribute("data-labels", d.labels ? "on" : "off");
  target.setAttribute("data-distance", d.distance ? "on" : "off");
  target.setAttribute("data-animate", d.animate ? "on" : "off");
  setVar("--bdc-scale", (d.textScale / 100).toFixed(2));
  setVar("--bdc-radius", d.radius + "px");
  setVar("--bdc-bw", d.borderWidth + "px");
  setVar("--bdc-sh", d.shadow);
  setVar("--bdc-gap", d.gap + "px");
}

function cardNorm(d) {
  const out = { ...CARD_DEFAULTS };
  if (d && typeof d === "object") for (const k of Object.keys(CARD_DEFAULTS)) if (d[k] !== undefined && d[k] !== null) out[k] = d[k];
  if (!CARD_STYLES.some((s) => s.id === out.style)) out.style = "stitched";
  if (!CARD_FONTS.some((f) => f.id === out.font)) out.font = "default";
  return out;
}

// Called with every server state: paints the board (only when something changed) and refreshes the picker.
function applyCardDesign(raw) {
  const d = cardNorm(raw);
  const sig = JSON.stringify(d);
  if (sig === lastCardSig) return;
  lastCardSig = sig;
  curCard = d;
  paintAll(d);
  syncCardPicker(d);
  if (typeof fitBoardWords === "function") requestAnimationFrame(() => fitBoardWords()); // size / font / captions can change how long a word is
}

// One change from the host: shown at once on this screen, saved and sent to every screen by the server.
let cardSendTimer = null; let cardPending = {};
function changeCard(patch) {
  curCard = cardNorm({ ...curCard, ...patch });
  lastCardSig = JSON.stringify(curCard);
  paintAll(curCard);
  syncCardPicker(curCard);
  if (typeof fitBoardWords === "function") requestAnimationFrame(() => fitBoardWords());
  cardPending = { ...cardPending, ...patch };
  clearTimeout(cardSendTimer);
  cardSendTimer = setTimeout(() => { const p = cardPending; cardPending = {}; send("set_card_design", p); }, 90);
}

function cardEl(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
}
// a small static box for the preview and the design thumbnails
function previewRow(kind, word, prefix, distance) {
  const row = cardEl("div", "bdRow bd-" + kind);
  row.appendChild(cardEl("span", "bdTag", kind === "lower" ? "Lower bound" : kind === "upper" ? "Upper bound" : "Hidden word"));
  if (kind === "secret") {
    const q = cardEl("span", "bdWord bdQuestion");
    q.appendChild(cardEl("span", "bdPrefix", prefix));
    q.appendChild(document.createTextNode("?"));
    row.appendChild(q);
  } else {
    appendPrefixedWord(row, word, prefix, "");
    row.appendChild(cardEl("span", "bdDistance", String(distance)));
  }
  return row;
}

function buildCardPicker() {
  if (!cardPicker) return;
  cardUi = { styleBtns: {}, thumbs: {}, swatches: {}, colorInputs: {}, ranges: {}, rangeVals: {}, fontBtns: {}, toggles: {} };
  cardPicker.innerHTML = "";
  const root = cardEl("div", "cdPicker");

  // live preview (works even while no round is running)
  root.appendChild(cardEl("div", "cdGroupTitle", "Preview"));
  const panelPrev = cardEl("div", "cdPreviewPanel bdPanelTarget");
  const prev = cardEl("div", "cdPreview bdBoard");
  const wrap = cardEl("div", "tilesWrap");
  wrap.appendChild(previewRow("lower", "inform", "in", 120));
  wrap.appendChild(previewRow("secret", "", "in", 0));
  wrap.appendChild(previewRow("upper", "inside", "in", 37));
  prev.appendChild(wrap);
  panelPrev.appendChild(prev);
  root.appendChild(panelPrev);
  cardUi.preview = prev;
  cardUi.previewPanel = panelPrev;

  // designs
  root.appendChild(cardEl("div", "cdGroupTitle", "Design"));
  const grid = cardEl("div", "cdStyles");
  CARD_STYLES.forEach((s) => {
    const btn = cardEl("button", "cdStyleBtn");
    btn.type = "button";
    btn.setAttribute("aria-label", s.name + " design");
    const thumb = cardEl("div", "bdBoard");
    const tw = cardEl("div", "tilesWrap");
    tw.appendChild(previewRow("lower", "inform", "in", 120));
    thumb.appendChild(tw);
    btn.appendChild(thumb);
    btn.appendChild(cardEl("span", "cdStyleName", s.name));
    btn.appendChild(cardEl("span", "cdStyleHint", s.hint));
    btn.addEventListener("click", () => changeCard({ style: s.id, radius: s.radius, borderWidth: s.borderWidth, shadow: s.shadow }));
    grid.appendChild(btn);
    cardUi.styleBtns[s.id] = btn;
    cardUi.thumbs[s.id] = thumb;
  });
  root.appendChild(grid);

  // colors
  root.appendChild(cardEl("div", "cdGroupTitle", "Colors"));
  const addColorField = (f) => {
    const field = cardEl("div", "cdField");
    const lab = cardEl("div", "cdLabel", f.label);
    field.appendChild(lab);
    const row = cardEl("div", "cdColors");
    const auto = cardEl("button", "cdSwatch auto");
    auto.type = "button"; auto.title = "Automatic"; auto.setAttribute("aria-label", f.label + ": automatic");
    auto.addEventListener("click", () => changeCard({ [f.key]: "" }));
    row.appendChild(auto);
    const sw = [{ hex: "", el: auto }];
    CARD_PRESET_COLORS.forEach((hex) => {
      const b = cardEl("button", "cdSwatch");
      b.type = "button"; b.style.background = hex; b.title = hex; b.setAttribute("aria-label", f.label + " " + hex);
      b.addEventListener("click", () => changeCard({ [f.key]: hex.toLowerCase() }));
      row.appendChild(b);
      sw.push({ hex: hex.toLowerCase(), el: b });
    });
    const input = cardEl("input", "cdColorInput");
    input.type = "color"; input.value = f.fallback.toLowerCase(); input.title = "Pick any color"; input.setAttribute("aria-label", f.label + " custom color");
    input.addEventListener("input", () => changeCard({ [f.key]: input.value.toLowerCase() }));
    row.appendChild(input);
    field.appendChild(row);
    field.appendChild(cardEl("p", "sectionNote", f.hint));
    root.appendChild(field);
    cardUi.swatches[f.key] = sw;
    cardUi.colorInputs[f.key] = input;
  };
  CARD_COLOR_FIELDS.forEach(addColorField);

  // font
  root.appendChild(cardEl("div", "cdGroupTitle", "Font"));
  const fonts = cardEl("div", "cdFonts");
  CARD_FONTS.forEach((f) => {
    const b = cardEl("button", "cdChip", f.name);
    b.type = "button";
    if (f.css) b.style.fontFamily = f.css;
    b.addEventListener("click", () => changeCard({ font: f.id }));
    fonts.appendChild(b);
    cardUi.fontBtns[f.id] = b;
  });
  root.appendChild(fonts);

  // size, corners, border, shadow, spacing
  root.appendChild(cardEl("div", "cdGroupTitle", "Shape & size"));
  const addSlider = (s) => {
    const field = cardEl("div", "cdField");
    const lab = cardEl("div", "cdLabel", s.label);
    const val = cardEl("span", "cdVal");
    lab.appendChild(val);
    field.appendChild(lab);
    const r = cardEl("input", "cdRange");
    r.type = "range"; r.min = s.min; r.max = s.max; r.step = s.step;
    r.setAttribute("aria-label", s.label);
    r.addEventListener("input", () => changeCard({ [s.key]: Number(r.value) }));
    field.appendChild(r);
    root.appendChild(field);
    cardUi.ranges[s.key] = r;
    cardUi.rangeVals[s.key] = val;
  };
  CARD_SLIDERS.forEach(addSlider);

  // switches
  root.appendChild(cardEl("div", "cdGroupTitle", "Extras"));
  const tg = cardEl("div", "cdToggles");
  const addToggle = (t) => {
    const label = cardEl("label", "switchRow");
    const cb = cardEl("input"); cb.type = "checkbox";
    const track = cardEl("span", "switchTrack"); track.appendChild(cardEl("span", "switchThumb"));
    label.appendChild(cb); label.appendChild(track); label.appendChild(cardEl("span", "switchLabel", t.label));
    cb.addEventListener("change", () => changeCard({ [t.key]: cb.checked }));
    tg.appendChild(label);
    cardUi.toggles[t.key] = cb;
  };
  CARD_TOGGLES.forEach(addToggle);
  root.appendChild(tg);

  // the panel behind the game (update 84)
  root.appendChild(cardEl("div", "cdGroupTitle", "Panel behind the game"));
  root.appendChild(cardEl("p", "sectionNote", "The box that surrounds the three cards (and the legend). Turn it off for a clean look, or restyle it."));
  const tgPanel = cardEl("div", "cdToggles");
  PANEL_TOGGLES.forEach((t) => {
    const label = cardEl("label", "switchRow");
    const cb = cardEl("input"); cb.type = "checkbox";
    const track = cardEl("span", "switchTrack"); track.appendChild(cardEl("span", "switchThumb"));
    label.appendChild(cb); label.appendChild(track); label.appendChild(cardEl("span", "switchLabel", t.label));
    cb.addEventListener("change", () => changeCard({ [t.key]: cb.checked }));
    tgPanel.appendChild(label);
    cardUi.toggles[t.key] = cb;
  });
  root.appendChild(tgPanel);
  PANEL_COLOR_FIELDS.forEach(addColorField);
  PANEL_SLIDERS.forEach(addSlider);
  const panelReset = cardEl("button", "btn btnGhost", "Reset panel");
  panelReset.type = "button";
  panelReset.addEventListener("click", () => changeCard({ ...PANEL_DEFAULTS }));
  root.appendChild(panelReset);

  // resets
  const actions = cardEl("div", "cdActions");
  const shapeBtn = cardEl("button", "btn btnGhost", "Reset shape of this design");
  shapeBtn.type = "button";
  shapeBtn.addEventListener("click", () => { const m = cardStyleMeta(curCard.style); changeCard({ radius: m.radius, borderWidth: m.borderWidth, shadow: m.shadow, textScale: 100, gap: 14 }); });
  const allBtn = cardEl("button", "btn btnDanger", "Reset everything");
  allBtn.type = "button";
  allBtn.style.marginBottom = "0";
  allBtn.addEventListener("click", () => {
    clearTimeout(cardSendTimer); cardPending = {};
    curCard = { ...CARD_DEFAULTS }; lastCardSig = JSON.stringify(curCard);
    paintAll(curCard); syncCardPicker(curCard);
    if (typeof fitBoardWords === "function") requestAnimationFrame(() => fitBoardWords());
    send("reset_card_design", {});
  });
  actions.appendChild(shapeBtn); actions.appendChild(allBtn);
  root.appendChild(actions);

  cardPicker.appendChild(root);
  syncCardPicker(curCard);
}

function syncCardPicker(d) {
  if (!cardUi) return;
  paintCardDesign(cardUi.preview, d);
  paintPanel(cardUi.previewPanel, d);
  CARD_STYLES.forEach((s) => {
    cardUi.styleBtns[s.id].classList.toggle("selected", s.id === d.style);
    cardUi.styleBtns[s.id].setAttribute("aria-pressed", String(s.id === d.style));
    // each thumbnail shows its own design in the host's current colors and font
    paintCardDesign(cardUi.thumbs[s.id], { ...d, style: s.id }, { onlyLook: true });
  });
  ALL_COLOR_FIELDS.forEach((f) => {
    const cur = String(d[f.key] || "").toLowerCase();
    let anySwatch = false;
    cardUi.swatches[f.key].forEach((sw) => { const on = sw.hex === cur; sw.el.classList.toggle("selected", on); if (on && cur) anySwatch = true; });
    const input = cardUi.colorInputs[f.key];
    if (document.activeElement !== input) input.value = cur || f.fallback.toLowerCase();
    input.style.outline = cur && !anySwatch ? "3px solid var(--gold)" : "";
  });
  CARD_FONTS.forEach((f) => cardUi.fontBtns[f.id].classList.toggle("selected", f.id === d.font));
  ALL_SLIDERS.forEach((s) => {
    const r = cardUi.ranges[s.key];
    if (document.activeElement !== r) r.value = String(d[s.key]);
    cardUi.rangeVals[s.key].textContent = d[s.key] + s.unit;
  });
  ALL_TOGGLES.forEach((t) => { cardUi.toggles[t.key].checked = Boolean(d[t.key]); });
}
buildCardPicker();

// The letters every word of the search window starts with. Both bounds must be real guesses (not the opening AAA / ZZZ).
// Every word between two words that share a start also shares it, so the secret word starts with it as well.
function lockedPrefix(g) {
  if (!g.lower || !g.upper) return "";
  const a = g.lower.word, b = g.upper.word;
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  return a.slice(0, i);
}
function appendPrefixedWord(parent, word, prefix, extraClass) {
  const w = document.createElement("span");
  w.className = "bdWord" + (extraClass ? " " + extraClass : "");
  if (prefix && word.startsWith(prefix)) {
    const pre = document.createElement("span");
    pre.className = "bdPrefix";
    pre.textContent = prefix;
    w.appendChild(pre);
    w.appendChild(document.createTextNode(word.slice(prefix.length)));
  } else {
    w.textContent = word;
  }
  parent.appendChild(w);
  return w;
}

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
  if (n === 12) optMax.selected = true;
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
  el.lengthMaxSelect.value = String(g.lengthMax || 12);
  updateLengthModeUI();
  el.autoContinueToggle.checked = g.autoContinue;
  el.delayInput.value = g.autoContinueDelaySeconds;
  el.leaderboardShowInput.value = g.leaderboardShowSeconds;
  el.rejectionToastShowInput.value = g.rejectionToastSeconds;
  if (el.starterWordToggle) el.starterWordToggle.checked = g.starterWord !== false; // ON unless the host switched it off
  if (el.legendShowToggle) el.legendShowToggle.checked = g.legendShow !== false;
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

// BETWEENDLE talks to the server over its own Socket.IO namespace "/betweendle"
// (Socket.IO reconnects automatically, so no manual retry loop is needed).
function connectSocket() {
  socket = io("/betweendle");

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

// Starter word: ON by default, remembered by the server, used from the next round.
if (el.starterWordToggle) el.starterWordToggle.addEventListener("change", () => {
  send("set_starter_word", { on: el.starterWordToggle.checked });
});

// Legend choices apply immediately on every connected screen; the server remembers them.
if (el.legendShowToggle) el.legendShowToggle.addEventListener("change", () => {
  send("set_legend_show", { on: el.legendShowToggle.checked });
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
  statusMsg = g.lastRejection.reason; statusUntil = Date.now() + seconds * 1000;
  renderBoardStatus(g);

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
    const pointsLine = info && typeof info.points === "number" ? '<div class="celebPoints">+' + info.points + (info.points === 1 ? " point" : " points") + "</div>" : "";
    // update 84: crown instead of the party popper, and the winner's real TikTok picture as a big perfect circle
    el.celebrationBody.innerHTML =
      '<div class="celebCrown" aria-hidden="true">👑</div>' +
      '<div class="celebLabel">Winner</div>' +
      '<div class="celebAvatarWrap">' + avatarChipHtml(winnerName, winnerAvatar, 92) + "</div>" +
      '<div class="celebWinnerName">' + escapeHtml(winnerName) + "</div>" +
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
  renderLegend(state.game);
  applyCardDesign(state.game.cardDesign); // update 83: design / colors / font of the three boxes
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
  el.lengthBadge.textContent = g.status === "idle" ? "— letters" : g.wordLength + "-letter word";
}

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

// One row of the board: [avatar] WORD ........ distance.  kind = "lower" | "upper" | "secret"
function buildBoardRow(kind, entry, g) {
  const row = document.createElement("div");
  row.className = "bdRow bd-" + kind;
  const tag = document.createElement("span"); // small caption (shown only when the host turns captions on in Settings -> Card design)
  tag.className = "bdTag";
  tag.textContent = kind === "lower" ? "Lower bound" : kind === "upper" ? "Upper bound" : "Hidden word";
  row.appendChild(tag);
  const prefix = lockedPrefix(g);

  if (kind === "secret") {
    const found = g.status === "won" || g.status === "lost";
    if (g.status === "won") row.classList.add("found");
    if (found && g.secretWord) {
      appendPrefixedWord(row, g.secretWord, "", "");
      row.title = g.status === "won" ? "Found! Distance 0" : "The secret word";
    } else {
      // the locked prefix followed by "?" (just "?" while nothing is locked yet)
      const q = document.createElement("span");
      q.className = "bdWord bdQuestion";
      if (prefix) {
        const pre = document.createElement("span");
        pre.className = "bdPrefix";
        pre.textContent = prefix;
        q.appendChild(pre);
        q.appendChild(document.createTextNode("?"));
      } else {
        q.textContent = "?";
      }
      row.appendChild(q);
      row.title = prefix ? 'The hidden word starts with "' + prefix.toUpperCase() + '"' : "The hidden secret word";
    }
    return row;
  }

  if (entry) {
    row.appendChild(buildAvatarNode(entry.caller, entry.avatarUrl, 26, 13, "guessAvatar bdAvatar"));
    appendPrefixedWord(row, entry.word, prefix, "");
    const d = document.createElement("span");
    d.className = "bdDistance";
    d.textContent = String(entry.distance);
    d.title = "Distance " + entry.distance + " - " + (entry.distance - 1) + " word" + (entry.distance - 1 === 1 ? "" : "s") + " between this word and the secret word";
    row.appendChild(d);
    row.title = (kind === "lower" ? "Lower bound" : "Upper bound") + ": " + entry.word.toUpperCase();
  } else {
    // still the opening bound (AAA / ZZZ): no guess has moved it yet, so it has no distance
    row.classList.add("start");
    const w = document.createElement("span");
    w.className = "bdWord";
    w.textContent = kind === "lower" ? g.startLower : g.startUpper;
    row.appendChild(w);
    row.title = (kind === "lower" ? "Lower bound" : "Upper bound") + " (opening limit)";
  }
  return row;
}

let lastBoardSignature = "";
function renderTiles(g) {
  // (name kept from the other word games) draws the board: lower bound, ? row, upper bound.
  const idle = g.status === "idle";
  el.bdBoard.hidden = idle;
  if (idle) { lastBoardSignature = ""; return; }

  const lo = g.lower, up = g.upper;
  const signature = [
    g.roundNumber, g.status, g.guessesMade,
    lo ? lo.word + lo.distance + (lo.avatarUrl || "") : "-",
    up ? up.word + up.distance + (up.avatarUrl || "") : "-",
    g.secretWord || ""
  ].join("|");
  renderBoardStatus(g);
  if (signature === lastBoardSignature) return;
  lastBoardSignature = signature;

  el.tilesWrap.innerHTML = "";
  el.tilesWrap.appendChild(buildBoardRow("lower", lo, g));
  el.tilesWrap.appendChild(buildBoardRow("secret", null, g));
  el.tilesWrap.appendChild(buildBoardRow("upper", up, g));
  fitBoardWords();
}

// update 79: every word on the board is shown with ALL its letters (no more "INTERN..." cut-offs). The type is shrunk step by
// step until the word fits on one line; only an extremely long word on a very narrow screen wraps onto a second line.
function fitBoardWords() {
  if (!el.tilesWrap) return;
  const MIN_FS = 14;
  el.tilesWrap.querySelectorAll(".bdWord").forEach((w) => {
    w.classList.remove("bdWrap");
    w.style.removeProperty("--bd-fs");
    if (!w.clientWidth) return; // board hidden right now
    let size = parseFloat(getComputedStyle(w).fontSize) || 24;
    let guard = 0;
    while (w.scrollWidth > w.clientWidth + 0.5 && size > MIN_FS && guard++ < 60) {
      size -= 0.5;
      w.style.setProperty("--bd-fs", size + "px");
    }
    if (w.scrollWidth > w.clientWidth + 0.5) w.classList.add("bdWrap");
  });
}
let fitResizeTimer = null;
window.addEventListener("resize", () => { clearTimeout(fitResizeTimer); fitResizeTimer = setTimeout(fitBoardWords, 80); });
window.addEventListener("orientationchange", () => { setTimeout(fitBoardWords, 250); });
if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => fitBoardWords()).catch(() => {});

// The status line under the three boxes: win / round-over text, or the latest "outside the range" message.
let statusMsg = ""; let statusUntil = 0; let boardStatusTimer = null;
function renderBoardStatus(g) {
  clearTimeout(boardStatusTimer);
  if (g.status === "won" || g.status === "lost") { el.boardStatus.textContent = ""; return; } // update 84: no "You win!" / answer line under the boxes
  const left = statusUntil - Date.now();
  if (statusMsg && left > 0) {
    el.boardStatus.textContent = statusMsg;
    boardStatusTimer = setTimeout(() => { el.boardStatus.textContent = ""; }, left);
  } else {
    el.boardStatus.textContent = "";
  }
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

  // update 84: no celebration / winner name / secret word text here any more - just the (centered) Play again button + countdown
  el.resultBanner.className = g.status === "won" ? "resultBanner win" : "resultBanner lost";

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
// Legend: explains every part of the board. It sits under the floating message window and above the guess board
// (see betweendle-index.html) and can be hidden by the host in Settings.
// ------------------------------------------------------------
const LEGEND_ITEMS = [
  { chip: "dot", mark: "IN", name: "Green letters", text: "the start shared by the lower and upper word. The secret word starts with it too; the middle box shows it followed by ?." },
  { chip: "msg", mark: "!", name: "Outside range", text: "a guess not between the lower and upper bound is skipped, and a short message pops up in the floating window." }
];
let lastLegendRound = -1;
let lastLegendSignature = "";

function renderLegend(g) {
  return; // update 70: the legend is now built (and fully customizable) by /shared/legend.js
  const lg = g.legend || {};
  const visible = g.status !== "idle" && lg.show !== false;
  el.legendSection.hidden = !visible;
  if (!visible) { lastLegendSignature = ""; return; }

  const signature = g.roundNumber + "|" + g.status;
  if (signature === lastLegendSignature) return;
  lastLegendSignature = signature;

  el.legendTitle.textContent = "Legend";
  el.legendList.innerHTML = LEGEND_ITEMS.map((it) =>
    '<li class="bdLegendItem"><span class="bdChip bdChip-' + it.chip + '">' + escapeHtml(it.mark) + '</span><span class="bdLegendText"><b>' +
    escapeHtml(it.name) + "</b> — " + escapeHtml(it.text) + "</span></li>"
  ).join("");
  el.legendNote.textContent = "";

  if (g.roundNumber !== lastLegendRound) {
    lastLegendRound = g.roundNumber;
    el.legendSection.classList.remove("shuffled");
    void el.legendSection.offsetWidth;
    el.legendSection.classList.add("shuffled");
  }
}

function escapeHtml(str) {
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
