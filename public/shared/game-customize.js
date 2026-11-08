/* ==========================================================================
   GAME CUSTOMIZE (update 131) - "🧩 Customize" section of every game's Settings.
   Every visible part of a game (title banner, top-bar buttons, score ribbon, message window, legend, keyboard, the
   game's own panels, guess board, host bar ...) can be shown / hidden and made Small / Normal / Large.
   Choices are kept on this device (per game), apply instantly and can be reset any time.
   Rescue: open the game with  ?gcreset=1  to wipe the layout of that game.
   The ⚙️ Settings button can never be hidden, so Settings is always reachable.

   UPDATE 135 - "🔲 Tiles & shapes": inside the same Customize section every game also gets a card for each kind of tile it has
   (guess tiles, keyboard keys, count boxes, grid cells, pills ...). Per tile kind: size, shape, proportions, spacing, border,
   depth / shadow, letter size, letter style and the pop animation - with a live preview. Games without letter tiles get the
   equivalent (Contexto guess bars, Flagle flag frame, Travle trail chips, Findle grid cells, ...).
   ========================================================================== */
(function () {
  "use strict";
  if (window.GameCustomize) return;
  var VERSION = 1;
  var SIZE_ZOOM = { s: 0.85, m: 1, l: 1.15 };

  function gameId() {
    var g = (document.body && document.body.getAttribute("data-game")) || "";
    if (!g) g = (location.pathname.split("/").filter(Boolean)[0] || "").toLowerCase();
    g = g.toLowerCase();
    if (g.indexOf("findle") === 0) g = "findle";   // update 135: /findle-public/findle-host.html and the display page
    return g;
  }
  var GAME = gameId();

  /* ------------------------------------------------------------------ catalog
     c(id, group, icon, label, description, selector, options)   options: size:true | locked:true | always:true | tags:[...] */
  function c(id, group, icon, label, desc, sel, o) { o = o || {}; return { id: id, group: group, icon: icon, label: label, desc: desc, sel: sel, size: !!o.size, tags: o.tags || [], always: !!o.always, defHide: !!o.defHide }; }

  var GROUPS = {
    title:   { icon: "🎀", title: "Title banner",            help: "The big game name at the top of the screen." },
    ribbon:  { icon: "🔘", title: "Top ribbon buttons",       help: "The row of round buttons under the title. Tap a switch to hide a button you never use." },
    info:    { icon: "📰", title: "Score ribbon & messages",  help: "The scrolling top-10 ribbon and the floating window that tells the audience why a guess was not accepted." },
    legend:  { icon: "🎨", title: "Legend (what the colours mean)", help: "The small guide that explains the colours and symbols." },
    keyboard:{ icon: "⌨️", title: "Keyboard",                 help: "The on-screen keyboard that shows which letters were used." },
    parts:   { icon: "🧩", title: "Game parts",                help: "Parts that only this game has." },
    board:   { icon: "📋", title: "Guess board & banners",    help: "The list of guesses and the helper texts around it." },
    host:    { icon: "🎛️", title: "Host controls bar",        help: "The bar at the bottom with the TikTok connection, secret word and Give up button." }
  };

  var RIBBON_FAMILY = [
    c("btnHome", "ribbon", "🏠", "Home button", "Go back to the game list.", "#homeBtn"),
    c("btnMode", "ribbon", "🔴", "Mode badge", "Shows TEST, LIVE or OFFLINE.", "#modeBadge"),
    c("btnLength", "ribbon", "📏", "Word length badge", "Shows how many letters this round has.", "#lengthBadge"),
    c("btnHint", "ribbon", "💡", "Hint button", "Gives the audience a hint.", "#hintBtn"),
    c("btnLang", "ribbon", "🌐", "Language button", "Switch the word language.", "#languageBtn"),
    c("btnHelp", "ribbon", "❓", "How-to-play button", "Opens the rules.", "#helpBtn"),
    c("btnLb", "ribbon", "🏆", "Leaderboard button", "Opens the scores.", "#leaderboardBtn"),
    c("btnFull", "ribbon", "⛶", "Full-screen button", "Fills the whole phone screen.", "#fullscreenBtn")
  ];
  var TITLE_FAMILY = [
    c("heroBand", "title", "🎀", "Title banner", "The game name and its short description.", "#heroBand", { size: true }),
    c("heroTagline", "title", "💬", "Description line", "The one-line explanation under the name.", "#heroBand .heroTagline")
  ];
  var INFO_FAMILY = [
    c("ticker", "info", "📰", "Score ribbon", "TOP 10 ribbon with the scrolling scores.", "#scoreTickerBar", { size: true }),
    c("toast", "info", "💬", "Floating message window", "Explains why a guess was rejected. It has its own reserved place, so it never covers the game.", ".toastSlot")
  ];
  var LEGEND = [c("legend", "legend", "🎨", "Legend", "Colour and symbol guide.", "#legendSection, .legendSection", { size: true, always: true })];
  var KEYBOARD = [
    c("keyboard", "keyboard", "⌨️", "Keyboard", "All letters, coloured by what the audience learned.", "#keyboardSection", { size: true }),
    c("keyboardHead", "keyboard", "🔤", "Keyboard heading", "The word “Keyboard” and the Reset colors link.", "#keyboardSection .keyboardHead")
  ];
  var BOARD = [
    c("avatars", "board", "🧑", "Player pictures", "The small round picture / initial in front of each guess.", "#tilesWrap .guessAvatar, #tilesWrap .guessAvatarSpacer", { always: true }),
    c("board", "board", "📋", "Guess rows size", "Make the guesses bigger or smaller.", "#tilesWrap", { size: true, tags: ["core"] }),
    c("hintChips", "board", "🏷️", "Hint chips", "The small hint tags that appear after a hint.", "#hintChips"),
    c("hintExplainer", "board", "📖", "Hint explanation", "The sentence that explains the hint button.", "#hintExplainer"),
    c("offlineNote", "board", "✏️", "Solo-practice note", "“Solo practice – type your guess in the box below.”", "#offlineNote"),
    c("idleBanner", "board", "🚦", "“Open Settings to begin” notice", "The notice shown before a round is started.", "#idleBanner")
  ];
  var HOST = [c("host", "host", "🎛️", "Host controls bar", "TikTok connection, secret word, Give up. Hiding it gives the game more room; Settings still has everything.", "#controls", { size: true })];

  // game specific parts
  var PARTS = {
    boxdle: [
      c("bxClock", "parts", "⏱️", "Clock box", "Timer, words and points.", "#bxClock"),
      c("bxWords", "parts", "📝", "Words counter", "How many words were found.", "#bxWordsChip"),
      c("bxPoints", "parts", "⭐", "Points counter", "Total points of the round.", "#bxPointsChip"),
      c("bxBar", "parts", "📶", "Time bar", "The progress bar under the clock.", "#bxClock .bxBar"),
      c("bxGrid", "parts", "🔠", "Letter grid", "The tiles the audience chains into words.", "#bxGridSection"),
      c("bxBoardHead", "parts", "✅", "“Guessed words” heading", "Title and counters above the word list.", "#tilesWrap .bxBoardHead")
    ],
    citydle: [
      c("cdCols", "parts", "🏙️", "Column titles", "CITY / DIRECTION / DISTANCE heading row.", "#cdColHead"),
      c("boardStatus", "parts", "ℹ️", "Board status line", "Small status text under the board.", "#boardStatus"),
      c("cdColors", "ribbon", "🎨", "City colours button", "Opens the colour guide.", "#cdColorsBtn")
    ],
    towndle: [
      c("cdCols", "parts", "🏘️", "Column titles", "PLACE / DIRECTION / DISTANCE heading row.", "#cdColHead"),
      c("boardStatus", "parts", "ℹ️", "Board status line", "Small status text under the board.", "#boardStatus"),
      c("cdColors", "ribbon", "🎨", "Colours button", "Opens the colour guide.", "#cdColorsBtn")
    ],
    expandle: [
      c("exTimer", "parts", "⏱️", "Round timer", "The clock and its bar.", "#exTimer", { size: true }),
      c("exPrompt", "parts", "🪜", "Prompt line", "Tells the audience what to do next.", "#exPrompt"),
      c("boardStatus", "parts", "ℹ️", "Board status line", "Small status text under the board.", "#boardStatus")
    ],
    fixle: [c("boardStatus", "parts", "ℹ️", "Board status line", "Small status text under the board.", "#boardStatus")],
    codedle: [c("codeSection", "parts", "🔐", "Code row", "The code the audience is cracking.", "#codeSection", { size: true })],
    colorblindle: [c("colorCounts", "parts", "🎨", "Colour counts", "How many letters of each colour.", "#colorCounts", { size: true })],
    comparable: [c("patternWrap", "parts", "↔️", "Symbol pattern", "The < > = clues between the letters.", "#patternWrap", { size: true })],
    linedle: [
      c("waveSection", "parts", "🌊", "Wave panel", "The wave / pillars picture.", "#waveSection", { size: true }),
      c("waveLook", "ribbon", "🌊", "Wave look button", "Change how the wave looks.", "#waveLookBtn")
    ],
    minedle: [
      c("mineSection", "parts", "💣", "Mine grid", "The grid with numbers and marks.", "#mineSection", { size: true }),
      c("letterBank", "parts", "🔡", "Letter bank", "Blue letters collected so far.", "#letterBankWrap"),
      c("resetMarks", "parts", "↩️", "Reset marks button", "Wipes every red / blue mark.", "#resetMarksBtn")
    ],
    numberblindle: [
      c("btnKeyboard", "ribbon", "🔢", "Number keyboard button", "Shows / hides the number keyboard.", "#keyboardBtn"),
      c("hideKeyboard", "keyboard", "🙈", "Hide-keyboard button", "The Hide link in the keyboard heading.", "#hideKeyboardBtn")
    ],
    shapedle: [c("symbolSection", "parts", "🔣", "Symbol row", "The shapes the secret word is made of.", "#symbolSection", { size: true })],
    textle: [
      c("btnModeMenu", "ribbon", "🧭", "Mode menu button", "Choose the text mode.", "#modeMenuBtn"),
      c("btnThemeMenu", "ribbon", "🎨", "Theme menu button", "Choose the text theme.", "#themeMenuBtn")
    ],
    twistle: [
      c("metaRow", "parts", "🌀", "Round chip", "“TWISTLE – waiting to start” and the guess counter.", ".metaRow"),
      c("answerTiles", "parts", "🔤", "Answer tiles", "The revealed answer at the end of a round.", "#answerTiles"),
      c("legendRow", "parts", "🎨", "Tile meaning guide", "What lit and dark symbols mean.", "#legendRow", { size: true })
    ],
    betweendle: [], blindle: [], oracle: [], colordle: [], rangedle: [], shiftle: [], structle: [], wordle: [], forbackle: []
  };

  // games whose screens are built differently get their own complete catalogs
  var SPECIAL = {
    crossdle: [
      c("heroBand", "title", "🎀", "Title banner", "The game name and its short description.", "#heroBand", { size: true }),
      c("heroTagline", "title", "💬", "Description line", "The one-line explanation under the name.", "#heroBand .heroTagline"),
      c("btnHome", "ribbon", "🏠", "Home button", "Back to the game list.", ".app-header #homeBtn"),
      c("btnRound", "ribbon", "🔖", "Round badge", "Round number.", "#roundPill"),
      c("btnLb", "ribbon", "🏆", "Leaderboard button", "Opens the scores.", ".app-header #leaderboardBtn"),
      c("btnFull", "ribbon", "⛶", "Full-screen button", "Fills the whole phone screen.", "#fullscreenBtn"),
      c("btnHelp", "ribbon", "❓", "How-to-play button", "Opens the rules.", "#howToPlayBtn"),
      c("ticker", "info", "📰", "Score ribbon", "TOP 10 ribbon with the scrolling scores.", "#leaderboardTicker", { size: true }),
      c("toast", "info", "💬", "Floating message window", "Explains why a guess was rejected.", ".toast-slot"),
      c("legend", "legend", "🎨", "Legend", "Colour guide.", ".board-legend", { size: true }),
      c("keyboard", "keyboard", "⌨️", "Keyboard", "All letters, coloured by what the audience learned.", ".keyboard-section", { size: true }),
      c("hintChips", "board", "🏷️", "Hint chips", "Hint tags.", "#hintChips"),
      c("hintsRow", "board", "💡", "Hint tiles", "Revealed hint letters.", "#hintsRow, #hintsTiles"),
      c("board", "board", "📋", "Guess rows size", "Make the guesses bigger or smaller.", "#board", { size: true, tags: ["core"] }),
      c("boardEmpty", "board", "🚦", "“Waiting for guesses” box", "The empty-board notice.", "#boardEmpty"),
      c("host", "host", "⚙️", "Settings button", "Opens the settings.", "#hostFab")
    ],
    flagle: [
      c("btnHome", "ribbon", "🏠", "Home button", "Back to the game list.", "#home-btn"),
      c("btnMode", "ribbon", "🔴", "Mode badge", "Shows LIVE / TEST / OFFLINE.", "#mode-badge"),
      c("topTitle", "ribbon", "🏷️", "“FLAGLE live” title", "The small title in the top bar.", ".topbar-title"),
      c("timer", "ribbon", "⏱️", "Round timer", "Seconds left in the round.", "#round-timer"),
      c("btnLb", "ribbon", "🏆", "Leaderboard button", "Opens the scores.", "#leaderboard-btn"),
      c("btnFull", "ribbon", "⛶", "Full-screen button", "Fills the whole phone screen.", "#fullscreenBtn"),
      c("heartbeat", "ribbon", "🎧", "Chat activity counter", "Shows that chat is being heard.", "#heartbeat"),
      c("liveUser", "ribbon", "👤", "@username", "The TikTok account that is connected.", "#live-username"),
      c("ticker", "info", "📰", "Score ribbon", "Scrolling top scores.", ".ticker-wrap", { size: true }),
      c("toast", "info", "💬", "Floating message window", "Shows the result of each guess.", "#toast-layer"),
      c("flag", "parts", "🚩", "Flag picture", "The flag the audience guesses.", ".radar-wrap", { size: true, tags: ["core"] }),
      c("hintStrip", "parts", "🧭", "Hint line", "“Type the country name in chat to guess.”", "#hint-strip"),
      c("debug", "parts", "🛠️", "“Last heard” line", "Shows the last chat message that was received.", "#debug-strip"),
      c("chat", "board", "💬", "Live chat panel", "The audience chat.", ".comment-panel", { size: true }),
      c("likes", "board", "❤️", "Top likes panel", "Who sent the most likes.", ".fans-section:first-child"),
      c("gifts", "board", "🎁", "Top gifters panel", "Who sent the most gifts.", ".fans-section:last-child"),
      c("host", "host", "🎛️", "Host input bar", "Type a guess / chat as host.", "#host-form", { size: true })
    ],
    travle: [
      c("btnHome", "ribbon", "🏠", "Home button", "Back to the game list.", "#homeBtn"),
      c("btnTiktok", "ribbon", "📡", "TikTok badge", "Connection badge.", "#tiktokBadge"),
      c("btnMode", "ribbon", "🔴", "Mode badge", "LIVE / TEST / OFFLINE.", "#modeBadge"),
      c("btnHint", "ribbon", "💡", "Hint button", "Gives a hint.", "#topHintBtn"),
      c("btnFull", "ribbon", "⛶", "Full-screen button", "Fills the whole phone screen.", "#fullscreenBtn"),
      c("btnLegend", "ribbon", "❓", "Help / legend button", "Opens the rules.", "#legendBtn"),
      c("btnLb", "ribbon", "🏆", "Leaderboard button", "Opens the scores.", "#trophyBtn"),
      c("ticker", "info", "📰", "Score ribbon", "Scrolling top scores.", "#tickerBar", { size: true }),
      c("globeBar", "parts", "🎚️", "Globe zoom bar", "Zoom slider and Recenter / Enlarge buttons.", ".globe-toolbar"),
      c("globeHint", "parts", "👆", "Globe instructions", "“Drag to rotate · pinch to zoom…”", ".globe-caption"),
      c("routeMeta", "parts", "🔢", "Guess counter & optimal length", "Guesses made and the shortest possible trail.", ".route-meta"),
      c("routeLines", "parts", "🧭", "Trail lines", "Shortest trail and the trail so far.", ".route-lines"),
      c("hintDisplay", "parts", "💡", "Hint text", "Explains the current hint.", "#hintDisplay"),
      c("feed", "board", "📰", "Live activity", "The feed of guesses.", "#feedCard", { size: true }),
      c("dockMode", "host", "🧪", "Mode banner", "TEST / OFFLINE banner.", "#modeBanner"),
      c("host", "host", "🎛️", "Host controls dock", "Guess box and round buttons.", ".host-dock", { size: true })
    ],
    contexto: [
      c("btnHome", "ribbon", "🏠", "Home button", "Back to the game list.", "#homeBtn"),
      c("statusWord", "ribbon", "🔴", "Status word", "IDLE / LIVE / NOT LIVE.", "#statusWord"),
      c("viewers", "ribbon", "👁️", "Viewer counter", "How many viewers are watching.", "#viewerChip"),
      c("modePip", "ribbon", "🧭", "Mode dot", "Small mode indicator.", "#modePip"),
      c("theme", "ribbon", "🌙", "Theme button", "Light / dark theme.", "#themeToggle"),
      c("btnHint", "ribbon", "💡", "Hint button", "Gives a hint.", "#hintBtn"),
      c("btnDock", "ribbon", "⌨️", "Keyboard button", "Shows / hides the guess box.", "#dockToggle"),
      c("btnLb", "ribbon", "🏆", "Leaderboard button", "Opens the scores.", "#leaderboardToggle"),
      c("btnRound", "ribbon", "🔁", "Round button", "Start / restart a round.", "#roundBtn"),
      c("btnFull", "ribbon", "⛶", "Full-screen button", "Fills the whole phone screen.", "#fsBtn"),
      c("heroTitle", "title", "🎀", "Game title", "“Contexto LIVE” and its description.", "#game > .hero", { size: true }),
      c("heroSub", "title", "💬", "Description line", "The one-line explanation under the title.", "#heroSub"),
      c("stats", "info", "📊", "Guesses / players counter", "Totals under the title.", "#statsRow"),
      c("points", "info", "✨", "“+N points” popup place", "The reserved place for the floating points popup.", "#pointsPopupHost"),
      c("latest", "parts", "🆕", "Latest guess line", "The most recent guess.", ".latest", { size: true }),
      c("board", "board", "📋", "Guess list size", "Make the guesses bigger or smaller.", "#guessList", { size: true, tags: ["core"] }),
      c("boardHead", "board", "🏷️", "“Live guesses” heading", "Title and counter above the list.", "section.board .board-head")
    ]
  };


  // Findle (host + display) - added in update 135 so that every game has the Customize section
  SPECIAL.findle = [
    c("heroBand", "title", "🎀", "Title banner", "The game name and its short description.", "#heroBand", { size: true }),
    c("heroTagline", "title", "💬", "Description line", "The one-line explanation under the name.", "#heroBand .heroTagline"),
    c("btnHome", "ribbon", "🏠", "Home button", "Back to the game list.", "#homeBtn"),
    c("themePick", "ribbon", "🎨", "Colour theme picker", "The small colour menu in the top bar.", ".findle-theme-picker"),
    c("btnLb", "ribbon", "🏆", "Leaderboard button", "Opens the scores.", "#leaderboardBtn"),
    c("btnFull", "ribbon", "⛶", "Full-screen button", "Fills the whole phone screen.", "#fullscreenBtn"),
    c("brand", "ribbon", "🏷️", "“FINDLE” name in the top bar", "The small name at the left of the top bar.", ".topbar .brand"),
    c("status", "ribbon", "📡", "Connection status", "Shows whether TikTok is connected.", ".topbar .pill"),
    c("ticker", "info", "📰", "Score ribbon", "TOP 10 ribbon with the scrolling scores.", "#tickerOuter", { size: true }),
    c("themeRow", "parts", "🧩", "Puzzle theme line", "The title of the current puzzle and its progress dots.", ".theme-row"),
    c("progress", "parts", "🔵", "Progress dots", "One dot per word found.", "#progressDots"),
    c("combo", "parts", "🔥", "Combo badge", "The streak badge.", "#comboBadge"),
    c("grid", "parts", "🔲", "Word grid", "The letter grid the audience searches.", "#gridSquare", { size: true, tags: ["core"] }),
    c("answers", "board", "🏷️", "Found words strip", "The words that were already found.", "#answers", { size: true }),
    c("hintChips", "board", "🏷️", "Hint chips", "The small hint tags that appear after a hint.", "#hintChips"),
    c("host", "host", "🎛️", "Host bar", "Start, hint and the host message box.", "footer.sticky", { size: true })
  ];

  /* ------------------------------------------------------------------ TILES & SHAPES (update 135)
     t(id, icon, label, desc, selector of the tiles, host selector (must exist on the page for the card to show), options)
       options: sizeSel (what gets zoomed, default = tiles) | gapSel (the row / grid that holds the tiles) | textSel (the letters)
                no:[controls this kind of tile cannot use]   keys:true (keyboard: no size / proportions)
       follow:"tiles" (update 142: symbols / numbers / clue boxes that belong to the guess tiles take the SAME size as the guess tiles
                      unless the host gives them a size of their own)                       */
  function t(id, icon, label, desc, sel, host, o) { o = o || {}; return { id: id, icon: icon, label: label, desc: desc, sel: sel, host: host || sel, sizeSel: o.sizeSel || sel, gapSel: o.gapSel || "", textSel: o.textSel || sel, no: o.no || [], keys: !!o.keys, follow: o.follow || "" }; }
  var LETTER_GAMES = ["blindle", "codedle", "colorblindle", "colordle", "comparable", "forbackle", "linedle", "minedle", "numberblindle", "oracle", "rangedle", "shapedle", "shiftle", "structle", "textle", "wordle", "twistle"];
  var COUNT_GAMES = ["blindle", "numberblindle", "oracle", "structle"];
  function tileCatalog() {
    var out = [], G = GAME;
    if (LETTER_GAMES.indexOf(G) >= 0) {
      if (G === "twistle") {
        out.push(t("tiles", "🔠", "Guess tiles", "The letter boxes of every guess.", "#grid .tile", "#grid", { gapSel: "#grid .lets" }));
        out.push(t("syms", "🔣", "Symbol boxes", "The small symbols under the letters.", "#grid .sym", "#grid", { gapSel: "#grid .syms", no: ["letter", "font"], follow: "tiles" }));
      } else if (G === "textle") {
        out.push(t("tiles", "🔠", "Guess tiles", "The letter boxes and text pieces of every guess.", "#tilesWrap .tile, #tilesWrap .seg", "#tilesWrap", { gapSel: "#tilesWrap .tileRow", no: ["shape", "ratio"] }));
      } else {
        out.push(t("tiles", "🔠", "Guess tiles", "The letter boxes of every guess.", "#tilesWrap .tile", "#tilesWrap", { gapSel: "#tilesWrap .tileRow" }));
      }
      if (COUNT_GAMES.indexOf(G) >= 0) out.push(t("counts", "🔢", "Count boxes", "The small number boxes after each guess.", "#tilesWrap .countBadge", "#tilesWrap", { sizeSel: "#tilesWrap .countsCol", gapSel: "#tilesWrap .countsCol", no: ["ratio"], follow: "tiles" }));
      if (G === "comparable") out.push(t("pattern", "↔️", "Symbol circles", "The < > = clues between the letters.", "#patternWrap .patCircle, #tilesWrap .patCircle", "#patternWrap", { sizeSel: "#patternWrap .patCell", gapSel: "#patternWrap .patCells, #tilesWrap .patCells", no: ["ratio"], follow: "tiles" }));
      if (G === "codedle") out.push(t("codecells", "🔐", "Code cells", "The code the audience is cracking.", "#codeSection .codeCell", "#codeSection", { gapSel: "#codeSection .codeCells", follow: "tiles" }));
      if (G === "shapedle") out.push(t("symbols", "🔣", "Symbol cells", "The shapes the secret word is made of.", "#symbolSection .symbolCell", "#symbolSection", { gapSel: "#symbolSection .symbolCells", follow: "tiles" }));
      if (G === "minedle") {
        out.push(t("mine", "💣", "Mine grid tiles", "The grid with numbers and marks.", "#mineGrid .mineTile", "#mineGrid", { sizeSel: "#mineGrid", gapSel: "#mineGrid" }));
        out.push(t("bank", "🔡", "Letter bank", "Blue letters collected so far.", "#letterBank .bankLetter", "#letterBank", { no: ["ratio"] }));
      }
      if (document.querySelector("#keyboardSection")) out.push(t("keys", "⌨️", "Keyboard keys", "The on-screen letters.", "#keyboardSection .key", "#keyboardSection", { gapSel: "#keyboardSection .keyRow", keys: true }));
      return out;
    }
    switch (G) {
      case "boxdle":
        out.push(t("bxtiles", "🔠", "Letter grid tiles", "The tiles the audience chains into words.", "#bxGrid .bxTile", "#bxGrid", { sizeSel: "#bxGrid", gapSel: "#bxGrid" }));
        break;
      case "expandle":
        out.push(t("extiles", "🔠", "Word tiles", "The letters of each word.", "#tilesWrap .exTile", "#tilesWrap", { gapSel: "#tilesWrap .exTiles" }));
        break;
      case "betweendle":
        out.push(t("cards", "🃏", "Word cards", "The cards that show the words.", "#tilesWrap .bdRow", "#tilesWrap", { gapSel: "#tilesWrap", textSel: "#tilesWrap .bdWord", no: ["ratio"] }));
        break;
      case "citydle": case "towndle": case "fixle":
        out.push(t("pills", "💊", "Clue pills", "The colour pills of each guess.", "#tilesWrap .fxPill", "#tilesWrap", { gapSel: "#tilesWrap .fxRow", no: ["ratio"] }));
        break;
      case "crossdle":
        out.push(t("tiles", "🔠", "Guess tiles", "The letter boxes of every guess and its decoy.", "#board .tile", "#board", { gapSel: "#board .tile-set" }));
        out.push(t("hints", "💡", "Hint tiles", "Revealed hint letters.", "#hintsRow .hint-tile, #hintsTiles .hint-tile", "#hintsRow, #hintsTiles", { gapSel: "#hintsRow, #hintsTiles" }));
        out.push(t("keys", "⌨️", "Keyboard keys", "The on-screen letters.", ".keyboard-section .key-tile", ".keyboard-section", { keys: true }));
        break;
      case "findle":
        out.push(t("cells", "🔲", "Grid letter cells", "The letters of the word grid.", "#grid .cell", "#grid", { sizeSel: "#gridSquare", gapSel: "#grid" }));
        out.push(t("answers", "🏷️", "Found-word pills", "The words that were already found.", "#answers > *", "#answers", { gapSel: "#answers", no: ["ratio"] }));
        break;
      case "flagle":
        out.push(t("flag", "🚩", "Flag frame", "The frame around the flag.", ".radar-wrap", ".radar-wrap", { no: ["size", "gap", "letter", "font", "ratio"] }));
        break;
      case "travle":
        out.push(t("chips", "🧳", "Trail chips", "The country chips of the trails.", ".path-chip", ".route-lines", { gapSel: ".route-lines", no: ["ratio"] }));
        break;
      case "contexto":
        out.push(t("rows", "📋", "Guess bars", "Every guess with its closeness bar.", "#guessList .guess-row, #latestRow", "#guessList", { gapSel: "#guessList", no: ["ratio"] }));
        break;
    }
    return out;
  }
  function tileExists(g) { try { return !!document.querySelector(g.host); } catch (e) { return false; } }

  var TCTRL = [
    { key: "size", label: "Size", help: "Make the tiles smaller or bigger.", opts: [["xs", "XS"], ["s", "S"], ["", "M"], ["l", "L"], ["xl", "XL"]] },
    { key: "shape", label: "Shape", help: "The outline of each tile.", opts: null },
    { key: "ratio", label: "Proportions", help: "Tall, square or wide tiles.", opts: [["", "Auto"], ["sq", "Square"], ["tall", "Tall"], ["wide", "Wide"]] },
    { key: "gap", label: "Spacing", help: "Space between the tiles.", opts: [["", "Auto"], ["0", "None"], ["tight", "Tight"], ["roomy", "Roomy"], ["wide", "Wide"]] },
    { key: "border", label: "Border", help: "Thickness of the outline.", opts: [["", "Auto"], ["0", "None"], ["thin", "Thin"], ["med", "Medium"], ["thick", "Thick"]] },
    { key: "depth", label: "Depth & shadow", help: "Flat, soft shadow, 3D edge or glow.", opts: [["", "Auto"], ["flat", "Flat"], ["soft", "Soft"], ["3d", "3D"], ["glow", "Glow"]] },
    { key: "letter", label: "Letter size", help: "The size of the letters inside.", opts: [["xs", "Small"], ["", "Normal"], ["l", "Large"], ["xl", "Huge"]] },
    { key: "font", label: "Letter style", help: "The font of the letters.", opts: "select" },
    { key: "anim", label: "Pop animation", help: "The little pop when a tile appears.", opts: [["", "Auto"], ["off", "Off"]] }
  ];
  var T_ZOOM = { xs: 0.7, s: 0.85, l: 1.2, xl: 1.4 };
  var T_SHAPES = [["", "Original", null, "4px"], ["sq", "Square", "0", "0"], ["soft", "Soft", "6px", "3px"], ["round", "Round", "12px", "9px"], ["pebble", "Pebble", "50% 50% 46% 46% / 58% 58% 42% 42%", "50% 50% 46% 46% / 58% 58% 42% 42%"], ["circle", "Circle", "50%", "50%"], ["leaf", "Leaf", "38% 6% 38% 6%", "38% 6% 38% 6%"], ["pill", "Capsule", "999px", "999px"]];
  var T_RATIO = { sq: "1 / 1", tall: "1 / 1.25", wide: "1.3 / 1" };
  var T_GAP = { "0": "0px", tight: "2px", roomy: "10px", wide: "16px" };
  var T_BORDER = { "0": "0px", thin: "1px", med: "2px", thick: "4px" };
  var T_DEPTH = { flat: "none", soft: "0 3px 8px rgba(0,0,0,.20)", "3d": "0 4px 0 rgba(0,0,0,.25), inset 0 -3px 0 rgba(0,0,0,.14)", glow: "0 0 10px 2px rgba(255,190,60,.65)" };
  var T_LETTER = { xs: 0.8, l: 1.2, xl: 1.45 };
  var T_FONTS = [["", "Original", ""], ["rounded", "Rounded", "'Fredoka','Baloo 2','Nunito',system-ui,sans-serif"], ["serif", "Serif", "Georgia,'Times New Roman',serif"], ["mono", "Typewriter", "ui-monospace,Menlo,Consolas,'Courier New',monospace"], ["hand", "Handwritten", "'Patrick Hand','Comic Sans MS',cursive"], ["block", "Block capitals", "'Bungee','Impact',sans-serif"], ["bold", "Heavy sans", "'Baloo 2','Arial Black',Impact,sans-serif"]];
  var T_FONT_LINK = { hand: "Patrick+Hand", block: "Bungee", rounded: "Fredoka:wght@600", bold: "Baloo+2:wght@800" };
  var T_STYLES = [
    { id: "orig", icon: "↩️", name: "Original", desc: "Remove every tile change.", set: null },
    { id: "cute", icon: "🍡", name: "Cute & round", desc: "Round corners, soft shadow, medium border.", set: { shape: "round", depth: "soft", border: "med" } },
    { id: "sharp", icon: "⬛", name: "Sharp & flat", desc: "Square corners, flat, thin border.", set: { shape: "sq", depth: "flat", border: "thin" } },
    { id: "bubble", icon: "🫧", name: "Bubbles", desc: "Round bubbles with a soft shadow.", set: { shape: "circle", ratio: "sq", depth: "soft" } },
    { id: "chunky", icon: "🧱", name: "Chunky 3D", desc: "Thick border and a 3D edge.", set: { shape: "soft", depth: "3d", border: "thick" } },
    { id: "big", icon: "🔍", name: "Big & bold", desc: "Bigger tiles with big heavy letters.", set: { size: "l", letter: "l", font: "bold" } }
  ];

  function tdecls(o) {      // one tile kind's settings -> plain CSS values (used by the page AND by the live preview)
    var d = {}; o = o || {};
    if (o.size && T_ZOOM[o.size]) d.zoom = T_ZOOM[o.size];
    if (o.shape) for (var i = 0; i < T_SHAPES.length; i++) if (T_SHAPES[i][0] === o.shape && T_SHAPES[i][2]) d.radius = T_SHAPES[i][2];
    if (o.ratio && T_RATIO[o.ratio]) d.ratio = T_RATIO[o.ratio];
    if (o.gap != null && o.gap !== "" && T_GAP[o.gap]) d.gap = T_GAP[o.gap];
    if (o.border != null && o.border !== "" && T_BORDER[o.border]) d.border = T_BORDER[o.border];
    if (o.depth && T_DEPTH[o.depth]) d.depth = T_DEPTH[o.depth];
    if (o.letter && T_LETTER[o.letter]) d.letter = T_LETTER[o.letter];
    if (o.font) for (var j = 0; j < T_FONTS.length; j++) if (T_FONTS[j][0] === o.font && T_FONTS[j][2]) d.font = T_FONTS[j][2];
    if (o.anim === "off") d.anim = true;
    return d;
  }
  function ensureFont(id) {
    var fam = T_FONT_LINK[id]; if (!fam || document.getElementById("gcFont_" + id)) return;
    var l = document.createElement("link"); l.id = "gcFont_" + id; l.rel = "stylesheet";
    l.href = "https://fonts.googleapis.com/css2?family=" + fam + "&display=swap";
    (document.head || document.documentElement).appendChild(l);
  }
  function tileRules() {
    var rules = [];
    if (!st.tiles) return rules;
    tileCatalog().forEach(function (g) {
      var o = st.tiles[g.id];
      // update 142: symbols / numbers / clue boxes that belong to the guess tiles follow the guess tiles' size (S / M / L ...)
      if (g.follow && !(o && o.size) && st.tiles[g.follow] && st.tiles[g.follow].size && T_ZOOM[st.tiles[g.follow].size] && g.no.indexOf("size") < 0)
        rules.push(selList(g.sizeSel).join(",") + "{zoom:" + T_ZOOM[st.tiles[g.follow].size] + " !important}");
      if (!o) return;
      var d = tdecls(o), body = [];
      if (d.zoom && g.no.indexOf("size") < 0) rules.push(selList(g.sizeSel).join(",") + "{zoom:" + d.zoom + " !important}");
      if (d.radius && g.no.indexOf("shape") < 0) body.push("border-radius:" + d.radius + " !important");
      if (d.ratio && g.no.indexOf("ratio") < 0) body.push("height:auto !important;aspect-ratio:" + d.ratio + " !important");
      if (d.border && g.no.indexOf("border") < 0) body.push("border-width:" + d.border + " !important" + (d.border !== "0px" ? ";border-style:solid !important" : ""));
      if (d.depth && g.no.indexOf("depth") < 0) body.push("box-shadow:" + d.depth + " !important");
      if (d.font && g.no.indexOf("font") < 0) { body.push("font-family:" + d.font + " !important"); ensureFont(o.font); }
      if (d.anim && g.no.indexOf("anim") < 0) body.push("animation:none !important");
      if (body.length) rules.push(selList(g.sel).join(",") + "{" + body.join(";") + "}");
      if (d.gap && g.gapSel && g.no.indexOf("gap") < 0) rules.push(selList(g.gapSel).join(",") + "{gap:" + d.gap + " !important}");
    });
    rules.push("html body [data-gcl]{font-size:var(--gcl-px) !important}");
    return rules;
  }

  /* letter size: the games write the font size of every tile themselves (in pixels), so we measure it and write a scaled copy */
  var letterObs = null, letterTimer = null;
  function letterGroups() {
    if (!document.body || !st.tiles) return [];
    return tileCatalog().filter(function (g) { var o = st.tiles[g.id]; return o && o.letter && T_LETTER[o.letter] && g.no.indexOf("letter") < 0 && tileExists(g); });
  }
  function stopLetterObs() { if (letterObs) { try { letterObs.disconnect(); } catch (e) {} letterObs = null; } }
  function runLetters() {
    stopLetterObs();
    var old = document.querySelectorAll("[data-gcl]");
    Array.prototype.forEach.call(old, function (el) { el.removeAttribute("data-gcl"); el.style.removeProperty("--gcl-px"); });
    var want = letterGroups(), work = [];
    want.forEach(function (g) {
      var k = T_LETTER[st.tiles[g.id].letter];
      try { Array.prototype.forEach.call(document.querySelectorAll(g.textSel), function (el) { work.push([el, k, 0]); }); } catch (e) {}
    });
    work.forEach(function (w) { w[2] = parseFloat(getComputedStyle(w[0]).fontSize) || 0; });
    work.forEach(function (w) { if (w[2]) { w[0].style.setProperty("--gcl-px", (w[2] * w[1]).toFixed(2) + "px"); w[0].setAttribute("data-gcl", "1"); } });
    if (!want.length || typeof MutationObserver === "undefined") return;
    letterObs = new MutationObserver(function () { clearTimeout(letterTimer); letterTimer = setTimeout(runLetters, 90); });
    want.forEach(function (g) {
      try { Array.prototype.forEach.call(document.querySelectorAll(g.host), function (h) { letterObs.observe(h, { childList: true, subtree: true, attributes: true, attributeFilter: ["style", "class"] }); }); } catch (e) {}
    });
  }
  function scheduleLetters() { clearTimeout(letterTimer); letterTimer = setTimeout(runLetters, 60); }

  function catalog() {
    if (SPECIAL[GAME]) return SPECIAL[GAME];
    var out = [].concat(TITLE_FAMILY, RIBBON_FAMILY, INFO_FAMILY, LEGEND);
    // ribbon extras sit with the other ribbon buttons
    var extra = PARTS[GAME] || [];
    var keyboardGames = !!document.querySelector("#keyboardSection");
    if (keyboardGames) out = out.concat(KEYBOARD);
    var board = BOARD;
    if (GAME === "twistle") board = BOARD.map(function (it) { return it.id === "board" ? c("board", "board", "📋", "Guess rows size", "Make the guesses bigger or smaller.", "#grid", { size: true, tags: ["core"] }) : it.id === "avatars" ? null : it; }).filter(Boolean);
    if (GAME === "boxdle") board = BOARD.filter(function (it) { return it.id !== "board" && it.id !== "avatars"; });   // BOXDLE fits its own letter grid and word board
    out = out.concat(extra, board, HOST);
    return out;
  }

  /* ------------------------------------------------------------------ presets (by component id) */
  var PRESETS = [
    { id: "all",    icon: "✅", name: "Everything",   desc: "Show every part at normal size.", hide: [], size: {} },
    { id: "clean",  icon: "✨", name: "Clean",        desc: "Hide the explanations (description line, legend, helper texts).", hide: ["heroTagline", "legend", "hintExplainer", "offlineNote", "idleBanner", "heroSub", "globeHint", "debug", "diag", "boardStatus", "dockMode"], size: {} },
    { id: "board",  icon: "🔍", name: "Big board",    desc: "Hide extras to give the guess board the most room.", hide: ["heroTagline", "legend", "hintExplainer", "offlineNote", "idleBanner", "ticker", "heroSub", "globeHint", "debug", "diag", "boardStatus", "dockMode", "keyboardHead", "stats"], size: { board: "l" } },
    { id: "guesses",icon: "🎯", name: "Guesses only", desc: "Only the title, the guesses and the essential buttons.", hide: ["heroTagline", "legend", "hintExplainer", "offlineNote", "idleBanner", "ticker", "keyboard", "heroSub", "globeHint", "debug", "diag", "boardStatus", "dockMode", "hintChips", "btnLang", "btnLength", "btnHelp", "btnHint", "btnFull", "stats", "likes", "gifts", "points"], size: { board: "l" } }
  ];

  /* ------------------------------------------------------------------ storage */
  var KEY = "craft.custom.v" + VERSION + "." + GAME, KEY_ALL = "craft.custom.v" + VERSION + ".__all";
  function blank() { return withDefaults({ hide: {}, size: {}, tiles: {}, fit: true, collapse: false, tdef: false }); }
  function load() {
    try {
      var raw = localStorage.getItem(KEY) || localStorage.getItem(KEY_ALL);
      if (!raw) return withDefaults(blank());
      var j = JSON.parse(raw), b = blank();
      b.hide = j.hide || {}; b.size = j.size || {}; b.tiles = (j.tiles && typeof j.tiles === "object") ? j.tiles : {}; b.fit = j.fit !== false; b.collapse = !!j.collapse; b.tdef = !!j.tdef;
      return withDefaults(b);
    } catch (e) { return withDefaults(blank()); }
  }
  // update 142: every game's guess tiles default to size M; MINEDLE's guess tiles default to size S (applied once - after that the host's own choice wins, also when it goes back to M)
  function withDefaults(b) {
    if (GAME === "minedle" && !b.tdef) {
      b.tdef = true;
      if (!b.tiles) b.tiles = {};
      if (!b.tiles.tiles) b.tiles.tiles = { size: "s" };
      else if (!b.tiles.tiles.size) b.tiles.tiles.size = "s";
    }
    return b;
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} }
  var st = blank();
  if (/[?&]gcreset=1\b/.test(location.search)) { try { localStorage.removeItem(KEY); localStorage.removeItem(KEY_ALL); } catch (e) {} } else st = load();

  /* ------------------------------------------------------------------ apply */
  var styleEl = null;
  var HASFIT = !!document.querySelector('link[href*="fit-screen.css"]');
  function selList(sel) { return sel.split(",").map(function (s) { return "html body " + s.trim(); }); }
  function build() {
    var rules = [], cat = catalog();
    cat.forEach(function (it) {
      if (st.hide[it.id]) rules.push(selList(it.sel).join(",") + "{display:none !important}");
      var z = SIZE_ZOOM[st.size[it.id]];
      if (it.size && z && z !== 1 && !st.hide[it.id]) rules.push(selList(it.sel).join(",") + "{zoom:" + z + " !important}");
    });
    tileRules().forEach(function (r) { rules.push(r); });
    return rules.join("\n");
  }
  function apply() {
    if (!styleEl) { styleEl = document.createElement("style"); styleEl.id = "gcStyle"; (document.head || document.documentElement).appendChild(styleEl); }
    styleEl.textContent = build();
    var fs = window.__fitScreen;
    if (!HASFIT) { /* this game keeps its own fitting */ }
    else if (st.fit === false) { document.documentElement.classList.remove("fs"); document.documentElement.classList.add("gcNoFit"); }
    else { document.documentElement.classList.add("fs"); document.documentElement.classList.remove("gcNoFit"); }
    if (fs && fs.refit) fs.refit();
    scheduleLetters();
    try { window.dispatchEvent(new Event("resize")); } catch (e) {}
  }
  function collapseHost() {
    if (!st.collapse) return;
    var h = document.getElementById("controlsHandle") || document.getElementById("dockToggle");
    if (h && h.getAttribute("aria-expanded") === "true") { try { h.click(); } catch (e) {} }
  }
  apply();
  document.addEventListener("DOMContentLoaded", function () { apply(); setTimeout(collapseHost, 900); });

  /* ------------------------------------------------------------------ UI (cards inside the Settings workspace) */
  function mk(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (ch) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]; }); }
  function exists(it) { try { return it.always || !!document.querySelector(it.sel); } catch (e) { return false; } }

  function section(title, icon, help) {
    var s = mk("section", "drawerSection host-card gcSection");
    s.setAttribute("data-cs-force-cat", "custom"); s.setAttribute("data-cs-icon", icon);
    s.innerHTML = '<h4 class="host-card-title">' + esc(title) + "</h4>" + (help ? '<p class="sectionNote gcHelp">' + esc(help) + "</p>" : "");
    return s;
  }
  function sizeSeg(it) {
    var seg = mk("div", "gcSeg"); seg.setAttribute("role", "group"); seg.setAttribute("aria-label", it.label + " size");
    [["s", "Small"], ["m", "Normal"], ["l", "Large"]].forEach(function (p) {
      var b = mk("button", "gcSegBtn", p[1]); b.type = "button"; b.setAttribute("data-v", p[0]);
      b.addEventListener("click", function () { if (p[0] === "m") delete st.size[it.id]; else st.size[it.id] = p[0]; save(); apply(); refresh(); });
      seg.appendChild(b);
    });
    return seg;
  }
  function row(it) {
    var core = it.tags.indexOf("core") >= 0;
    var wrap = mk("div", "gcItem"); wrap.setAttribute("data-gc-item", it.id);
    var lab = mk("label", "gcRow");
    lab.innerHTML = '<span class="gcIco" aria-hidden="true">' + it.icon + '</span><span class="gcTxt"><b>' + esc(it.label) + "</b><small>" + esc(it.desc) + "</small></span>" +
      (core ? '<span class="gcCore">always on</span>' : '<span class="gcSw"><input type="checkbox" role="switch" data-gc="' + it.id + '"><i></i></span>');
    wrap.appendChild(lab);
    if (!core) {
      var cb = lab.querySelector("input");
      cb.addEventListener("change", function () { if (cb.checked) delete st.hide[it.id]; else st.hide[it.id] = true; save(); apply(); refresh(); });
    }
    if (it.size) { var seg = sizeSeg(it); seg.classList.add("gcSegRow"); wrap.appendChild(seg); }
    return wrap;
  }
  function refresh() {
    var root = document.querySelector(".csMain") || document;
    var cat = catalog();
    cat.forEach(function (it) {
      var cb = root.querySelector('input[data-gc="' + it.id + '"]'); if (cb) cb.checked = !st.hide[it.id];
      var item = root.querySelector('[data-gc-item="' + it.id + '"]');
      if (item) {
        item.classList.toggle("gcOff", !!st.hide[it.id]);
        var seg = item.querySelector(".gcSeg");
        if (seg) { var cur = st.size[it.id] || "m"; Array.prototype.forEach.call(seg.querySelectorAll(".gcSegBtn"), function (b) { b.classList.toggle("on", b.getAttribute("data-v") === cur); b.disabled = !!st.hide[it.id]; }); }
      }
    });
    var fit = root.querySelector('input[data-gc-global="fit"]'); if (fit) fit.checked = st.fit !== false;
    var col = root.querySelector('input[data-gc-global="collapse"]'); if (col) col.checked = !!st.collapse;
    Array.prototype.forEach.call(root.querySelectorAll(".gcPreset"), function (b) { b.classList.toggle("on", presetMatches(b.getAttribute("data-preset"))); });
    refreshTiles(root);
    var n = Object.keys(st.hide).length; Array.prototype.forEach.call(root.querySelectorAll(".gcCount"), function (e) { e.textContent = n ? n + " hidden" : "nothing hidden"; });
  }
  function presetMatches(id) {
    var p = PRESETS.filter(function (x) { return x.id === id; })[0]; if (!p) return false;
    var cat = catalog().filter(function (it) { return exists(it); }), ids = cat.map(function (i) { return i.id; });
    var want = p.hide.filter(function (h) { return ids.indexOf(h) >= 0; });
    var have = Object.keys(st.hide).filter(function (h) { return st.hide[h]; });
    if (want.length !== have.length) return false;
    for (var i = 0; i < want.length; i++) if (have.indexOf(want[i]) < 0) return false;
    var sz = Object.keys(st.size); var psz = Object.keys(p.size).filter(function (k) { return ids.indexOf(k) >= 0; });
    if (sz.length !== psz.length) return false;
    for (var j = 0; j < psz.length; j++) if (st.size[psz[j]] !== p.size[psz[j]]) return false;
    return true;
  }
  function applyPreset(id) {
    var p = PRESETS.filter(function (x) { return x.id === id; })[0]; if (!p) return;
    var cat = catalog().filter(function (it) { return exists(it); });
    st.hide = {}; st.size = {};
    cat.forEach(function (it) { if (p.hide.indexOf(it.id) >= 0 && it.tags.indexOf("core") < 0) st.hide[it.id] = true; if (p.size[it.id]) st.size[it.id] = p.size[it.id]; });
    save(); apply(); refresh();
  }

  /* ------------------------------------------------------------------ Tiles & shapes: cards */
  function tset(gid) { return st.tiles[gid] || (st.tiles[gid] = {}); }
  function setTile(gid, key, val) {
    var o = tset(gid);
    if (GAME === "minedle" && gid === "tiles" && key === "size" && (val === "" || val == null)) val = "m";   // update 142: MINEDLE's default is S, so M must be stored explicitly
    if (val === "" || val == null) delete o[key]; else o[key] = val;
    if (!Object.keys(o).length) delete st.tiles[gid];
    save(); apply(); refresh();
  }
  function paintPreview(host) {
    var g = tileCatalog().filter(function (x) { return x.id === host.getAttribute("data-tprev"); })[0]; if (!g) return;
    var d = tdecls(st.tiles[g.id]), z = d.zoom || 1, w = Math.round(34 * z), h = Math.round(w * 1.18);
    if (d.ratio) { var pr = d.ratio.split("/"); h = Math.round(w * parseFloat(pr[1]) / parseFloat(pr[0])); }
    var cells = host.querySelectorAll(".gcPT");
    Array.prototype.forEach.call(cells, function (el, i) {
      var st2 = el.style;
      st2.width = w + "px"; st2.height = h + "px"; st2.borderRadius = d.radius || "8px";
      st2.borderWidth = d.border || "1px"; st2.boxShadow = d.depth || "none";
      st2.fontFamily = d.font || "inherit"; st2.fontSize = Math.round(17 * (d.letter || 1) * z) + "px";
      st2.animation = "none";
    });
    host.style.gap = d.gap || "6px";
  }
  function tileControl(g, ctl) {
    var wrap = mk("div", "gcTRow"); wrap.setAttribute("data-tc", ctl.key);
    wrap.appendChild(mk("div", "gcTLab", "<b>" + esc(ctl.label) + "</b><small>" + esc(ctl.help) + "</small>"));
    if (ctl.key === "shape") {
      var grid = mk("div", "gcShapes");
      T_SHAPES.forEach(function (sp) {
        var b = mk("button", "gcShapeBtn", '<i class="gcShapeIco" style="border-radius:' + sp[3] + (sp[0] === "" ? ";border-style:dashed" : "") + '"></i><span>' + esc(sp[1]) + "</span>");
        b.type = "button"; b.setAttribute("data-tg", g.id); b.setAttribute("data-tk", "shape"); b.setAttribute("data-tv", sp[0]);
        b.addEventListener("click", function () { setTile(g.id, "shape", sp[0]); });
        grid.appendChild(b);
      });
      wrap.appendChild(grid);
    } else if (ctl.opts === "select") {
      var sel = mk("select", "gcSelect"); sel.setAttribute("data-tg", g.id); sel.setAttribute("data-tk", ctl.key); sel.setAttribute("aria-label", ctl.label);
      T_FONTS.forEach(function (f) { var op = mk("option", "", esc(f[1])); op.value = f[0]; sel.appendChild(op); });
      sel.addEventListener("change", function () { setTile(g.id, ctl.key, sel.value); });
      wrap.appendChild(sel);
    } else {
      var seg = mk("div", "gcSeg gcWrap"); seg.setAttribute("role", "group"); seg.setAttribute("aria-label", g.label + " " + ctl.label);
      ctl.opts.forEach(function (op) {
        var b = mk("button", "gcSegBtn", esc(op[1])); b.type = "button";
        b.setAttribute("data-tg", g.id); b.setAttribute("data-tk", ctl.key); b.setAttribute("data-tv", op[0]);
        b.addEventListener("click", function () { setTile(g.id, ctl.key, op[0]); });
        seg.appendChild(b);
      });
      wrap.appendChild(seg);
    }
    return wrap;
  }
  function tileSections() {
    var groups = tileCatalog().filter(tileExists), out = [];
    if (!groups.length) return out;
    var intro = section("Tiles & shapes", "🔲", "Change how the tiles of this game look: size, shape, spacing, border, shadow and letters. Pick a ready-made style here, then fine-tune each kind of tile in its own card below.");
    var grid = mk("div", "gcPresets");
    T_STYLES.forEach(function (p) {
      var b = mk("button", "gcPreset", '<span class="gcPIco">' + p.icon + '</span><span class="gcPTxt"><b>' + esc(p.name) + "</b><small>" + esc(p.desc) + "</small></span>");
      b.type = "button";
      b.addEventListener("click", function () { applyTStyle(p.id); });
      grid.appendChild(b);
    });
    intro.appendChild(grid); intro.appendChild(mk("p", "gcCountLine", '<span class="gcTCount"></span>'));
    out.push(intro);
    groups.forEach(function (g) {
      var sec = section("Tiles · " + g.label, g.icon, g.desc);
      sec.setAttribute("data-gc-tilecard", g.id);
      var prev = mk("div", "gcTPrev"); prev.setAttribute("data-tprev", g.id); prev.setAttribute("aria-hidden", "true");
      "ABCD".split("").forEach(function (ch) { prev.appendChild(mk("span", "gcPT", ch)); });
      sec.appendChild(prev);
      TCTRL.forEach(function (ctl) {
        if (g.no.indexOf(ctl.key) >= 0) return;
        if (ctl.key === "gap" && !g.gapSel) return;
        if (g.keys && ctl.key === "ratio") return;
        sec.appendChild(tileControl(g, ctl));
      });
      var rb = mk("button", "gcBtn", "↩️ Reset these tiles"); rb.type = "button";
      rb.addEventListener("click", function () { delete st.tiles[g.id]; st.tdef = false; withDefaults(st); save(); apply(); refresh(); });
      sec.appendChild(rb);
      out.push(sec);
    });
    return out;
  }
  function applyTStyle(id) {
    var ps = T_STYLES.filter(function (x) { return x.id === id; })[0]; if (!ps) return;
    st.tiles = {}; st.tdef = false;
    if (ps.set) tileCatalog().filter(tileExists).forEach(function (g) {
      var o = {};
      Object.keys(ps.set).forEach(function (k) {
        if (g.no.indexOf(k) >= 0) return;
        if (g.keys && (k === "size" || k === "ratio")) return;
        o[k] = ps.set[k];
      });
      if (Object.keys(o).length) st.tiles[g.id] = o;
    });
    withDefaults(st);
    save(); apply(); refresh();
  }
  function refreshTiles(root) {
    Array.prototype.forEach.call(root.querySelectorAll("[data-tg]"), function (b) {
      var o = st.tiles[b.getAttribute("data-tg")] || {}, cur = o[b.getAttribute("data-tk")] || ""; if (cur === "m" && b.getAttribute("data-tk") === "size") cur = "";
      if (b.tagName === "SELECT") b.value = cur; else b.classList.toggle("on", b.getAttribute("data-tv") === cur);
    });
    Array.prototype.forEach.call(root.querySelectorAll("[data-tprev]"), paintPreview);
    var n = Object.keys(st.tiles || {}).length;
    Array.prototype.forEach.call(root.querySelectorAll(".gcTCount"), function (e) { e.textContent = n ? n + " kind" + (n > 1 ? "s" : "") + " of tiles changed" : "tiles are original"; });
  }
  function makeSections() {
    var cat = catalog().filter(exists), out = [];

    // 1. quick layouts
    var q = section("Quick layouts", "🪄", "One tap sets a ready-made layout. You can still change every part below.");
    var grid = mk("div", "gcPresets");
    PRESETS.forEach(function (p) {
      var b = mk("button", "gcPreset", '<span class="gcPIco">' + p.icon + '</span><span class="gcPTxt"><b>' + esc(p.name) + "</b><small>" + esc(p.desc) + "</small></span>");
      b.type = "button"; b.setAttribute("data-preset", p.id);
      b.addEventListener("click", function () { applyPreset(p.id); });
      grid.appendChild(b);
    });
    q.appendChild(grid); q.appendChild(mk("p", "gcCountLine", '<span class="gcCount"></span>'));
    out.push(q);

    // 2. whole-screen switches
    var s = section("Whole screen", "📱", "How the game uses your phone screen.");
    function globalRow(key, icon, label, desc) {
      var r = mk("label", "gcRow gcItem");
      r.innerHTML = '<span class="gcIco" aria-hidden="true">' + icon + '</span><span class="gcTxt"><b>' + esc(label) + "</b><small>" + esc(desc) + '</small></span><span class="gcSw"><input type="checkbox" role="switch" data-gc-global="' + key + '"><i></i></span>';
      return r;
    }
    var rFit = globalRow("fit", "📐", "Fit everything on one screen", "No scrolling: the game shrinks a little on small phones so every part is visible. Switch off to use the original scrolling layout.");
    var rCol = globalRow("collapse", "🔽", "Start with the host bar folded", "Folds “Host controls” when the game opens, to give the guesses more room (tap the bar to open it).");
    rFit.querySelector("input").addEventListener("change", function (e) { st.fit = e.target.checked; save(); apply(); });
    rCol.querySelector("input").addEventListener("change", function (e) { st.collapse = e.target.checked; save(); if (st.collapse) collapseHost(); });
    if (HASFIT) s.appendChild(rFit);
    if (document.getElementById("controlsHandle") || document.getElementById("dockToggle")) s.appendChild(rCol);
    if (s.querySelectorAll(".gcRow").length) out.push(s);

    // 2b. tiles & shapes (update 135)
    tileSections().forEach(function (x) { out.push(x); });

    // 3. one card per group
    ["title", "ribbon", "info", "legend", "keyboard", "parts", "board", "host"].forEach(function (g) {
      var items = cat.filter(function (it) { return it.group === g; });
      if (!items.length) return;
      var G = GROUPS[g];
      var sec = section(g === "parts" ? "Game parts" : G.title, G.icon, G.help);
      if (g === "ribbon") sec.appendChild(mk("p", "gcLock", "🔒 The ⚙️ Settings button is always shown, so you can never lock yourself out."));
      items.forEach(function (it) { sec.appendChild(row(it)); });
      out.push(sec);
    });

    // 4. reset / copy
    var t = section("Reset & share", "♻️", "Undo your changes or use this layout for every game.");
    var bar = mk("div", "gcBtns");
    var bReset = mk("button", "gcBtn", "↩️ Reset this game"); bReset.type = "button";
    bReset.addEventListener("click", function () { st = blank(); try { localStorage.removeItem(KEY); } catch (e) {} apply(); refresh(); });
    var bAll = mk("button", "gcBtn gcBtnPrimary", "📋 Use this layout for all games"); bAll.type = "button";
    bAll.addEventListener("click", function () {
      try { localStorage.setItem(KEY_ALL, JSON.stringify(st)); bAll.textContent = "✔ Saved — other games will start from this layout"; setTimeout(function () { bAll.textContent = "📋 Use this layout for all games"; }, 2600); } catch (e) {}
    });
    bar.appendChild(bReset); bar.appendChild(bAll); t.appendChild(bar);
    t.appendChild(mk("p", "sectionNote gcHelp", "Your choices are kept on this device. A game you have already customized keeps its own layout."));
    out.push(t);
    return out;
  }

  /* ------------------------------------------------------------------ inject once the Settings workspace exists */
  var injected = false;
  function bodyEl() {
    var cs = window.CraftSettings && window.CraftSettings.state;
    if (cs && cs.built && cs.out && cs.out.bodyEl) return cs.out.bodyEl;
    if (cs && cs.failed) return document.querySelector("#settingsOverlay .drawer, .settingsBody, .drawer-body, .sheet-body, .host-cards");
    return null;
  }
  function inject() {
    if (injected) return true;
    var b = bodyEl(); if (!b) return false;
    var secs = makeSections();
    secs.forEach(function (s) { b.appendChild(s); });
    injected = true;
    setTimeout(refresh, 50); setTimeout(refresh, 700); setTimeout(refresh, 1800);
    return true;
  }
  var tries = 0;
  function poll() { if (inject() || ++tries > 60) return; setTimeout(poll, 250); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { setTimeout(poll, 500); }); else setTimeout(poll, 500);

  window.GameCustomize = { catalog: catalog, tileCatalog: tileCatalog, tileExists: tileExists, applyTileStyle: applyTStyle, state: function () { return st; }, apply: apply, game: GAME, exists: exists, reset: function () { st = blank(); save(); apply(); } };
})();
