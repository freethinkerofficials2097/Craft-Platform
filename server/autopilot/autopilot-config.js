// ===================================================================
// AUTOPILOT (AFK mode) - catalog of games + every setting the host can prepare ahead of time (update 109)
//
// This file is pure data + validation (no timers, no network):
//   GAMES            the games the autopilot can run, with a one-line "how to play" for the on-stream splash screen
//   PRESET_FIELDS    the gameplay settings a host can preset per game (sent to the game with the same "apply_settings"
//                    message the game's own Settings screen sends)
//   DEFAULT_CONFIG   every setting with its default
//   sanitizeConfig() turns anything the browser sends into a valid, clamped config (unknown keys are dropped)
//   update 112: every game also has NOTES for the viewers - other names (aka), the game it is inspired by, a note shown during the vote and an
//   optional custom "how to play" line (see games[id] below and the display.show* switches).
// ===================================================================

// family: true  -> one of the 21 games that share the "apply_settings" host message, so their gameplay settings can be preset.
// family: false -> the game runs with the settings the host last saved inside that game (the autopilot still starts / stops / switches it).
export const GAMES = [
  { id: "flagle", name: "Flagle", emoji: "🚩", path: "/flagle/", family: false, howTo: "Guess the country from its flag, one clue at a time." },
  { id: "travle", name: "Travle", emoji: "🧭", path: "/travle/", family: false, howTo: "Name the countries that connect the start and the end of the route." },
  { id: "blindle", name: "Blindle", emoji: "🔤", path: "/blindle/", family: true, howTo: "Chat guesses the hidden word from colourless clues." },
  { id: "findle", name: "Findle", emoji: "🔎", path: "/findle", family: false, howTo: "Find the hidden words in the letter grid." },
  { id: "crossdle", name: "Crossdle", emoji: "🧩", path: "/crossdle/", family: false, howTo: "Fill the crossword together with chat." },
  { id: "twistle", name: "Twistle", emoji: "🌀", path: "/twistle/", family: false, howTo: "Unscramble the twisted word." },
  { id: "oracle", name: "Oracle", emoji: "🔮", path: "/oracle/", family: true, howTo: "Guess the word from shuffled, uncoloured clue columns." },
  { id: "colorblindle", name: "Colorblindle", emoji: "🎨", path: "/colorblindle/", family: true, howTo: "Four shuffled colours - work out what they mean." },
  { id: "colordle", name: "Colordle", emoji: "🌈", path: "/colordle/", family: true, howTo: "Match the empty colour boxes with the keyboard colours." },
  { id: "structle", name: "Structle", emoji: "📐", path: "/structle/", family: true, howTo: "Clues are line and curve counts - find the word." },
  { id: "textle", name: "Textle", emoji: "📝", path: "/textle/", family: true, howTo: "Guesses are cut into green, yellow and grey segments." },
  { id: "rangedle", name: "Rangedle", emoji: "📏", path: "/rangedle/", family: true, howTo: "Every letter is coloured by how far it is in the alphabet." },
  { id: "codedle", name: "Codedle", emoji: "🔢", path: "/codedle/", family: true, howTo: "Use the number code to crack the word." },
  { id: "shapedle", name: "Shapedle", emoji: "🔷", path: "/shapedle/", family: true, howTo: "Symbols hide the letters - decode the word." },
  { id: "forbackle", name: "Forbackle", emoji: "↔️", path: "/forbackle/", family: true, howTo: "Forward or backward in the alphabet? Find the word." },
  { id: "shiftle", name: "Shiftle", emoji: "🔀", path: "/shiftle/", family: true, howTo: "The colour meanings shuffle every round." },
  { id: "wordle", name: "Wordle", emoji: "🟩", path: "/wordle/", family: true, howTo: "Classic green / yellow / grey word guessing." },
  { id: "betweendle", name: "Betweendle", emoji: "📚", path: "/betweendle/", family: true, howTo: "Narrow down the word in a giant alphabetical list." },
  { id: "comparable", name: "Comparable", emoji: "⚖️", path: "/comparable/", family: true, howTo: "Match the pattern of comparison signs." },
  { id: "minedle", name: "Minedle", emoji: "💣", path: "/minedle/", family: true, howTo: "Sweep the letter grid, then guess the word." },
  { id: "expandle", name: "Expandle", emoji: "➕", path: "/expandle/", family: true, howTo: "Grow the word by one letter every row." },
  { id: "citydle", name: "Citydle", emoji: "🏙️", path: "/citydle/", family: true, howTo: "Find the secret city with distance and direction clues." },
  { id: "towndle", name: "Towndle", emoji: "🇲🇾", path: "/towndle/", family: true, howTo: "Find the secret place in Malaysia with distance clues." },
  { id: "linedle", name: "Linedle", emoji: "〰️", path: "/linedle/", family: true, howTo: "Match the wave line with your word." },
  { id: "fixle", name: "Fixle", emoji: "🧷", path: "/fixle/", family: true, howTo: "Score words by matching start and end letters." },
  { id: "contexto", name: "Contexto", emoji: "🧠", path: "/contexto/", family: false, howTo: "The closer the meaning, the lower the rank." },
  { id: "numberblindle", name: "Numberblindle", emoji: "#️⃣", path: "/numberblindle/", family: true, howTo: "Crack the secret number code." }
];
export const GAME_IDS = GAMES.map((g) => g.id);
export const gameById = (id) => GAMES.find((g) => g.id === id) || null;

// ---- per-game gameplay presets -------------------------------------------------------------------------------------
// Only the fields a game's own "apply_settings" understands are listed for it. The game clamps values by itself too.
const WORD = ["difficulty", "lengthMode", "wordLength", "lengthMin", "lengthMax", "autoContinueDelaySeconds"];
export const PRESET_KEYS = {
  blindle: WORD, oracle: WORD, colorblindle: WORD, colordle: WORD, structle: WORD, textle: WORD, rangedle: WORD, forbackle: WORD, shiftle: WORD,
  wordle: WORD, betweendle: WORD, comparable: WORD, minedle: WORD, linedle: WORD, fixle: WORD,
  codedle: [...WORD, "starterWord"], shapedle: [...WORD, "starterWord"],
  numberblindle: ["lengthMode", "wordLength", "lengthMin", "lengthMax", "autoContinueDelaySeconds", "allowRepeats"],
  citydle: ["difficulty", "regions", "autoContinueDelaySeconds"],
  towndle: ["difficulty", "regions", "autoContinueDelaySeconds"],
  expandle: ["difficulty", "startLength", "maxLength", "roundSeconds", "autoContinueDelaySeconds"]
};
export const REGION_CHOICES = {
  citydle: [["EU", "Europe"], ["AS", "Asia"], ["AF", "Africa"], ["NA", "North America"], ["SA", "South America"], ["OC", "Oceania"]],
  towndle: [["JH", "Johor"], ["KD", "Kedah"], ["KN", "Kelantan"], ["ML", "Melaka"], ["NS", "Negeri Sembilan"], ["PH", "Pahang"], ["PK", "Perak"], ["PL", "Perlis"],
    ["PG", "Penang"], ["SB", "Sabah"], ["SK", "Sarawak"], ["SL", "Selangor"], ["TR", "Terengganu"], ["FT", "Federal Territories"]]
};
// field descriptions for the Settings screen (the browser builds the forms from this)
export const PRESET_FIELDS = {
  difficulty: { type: "select", label: "Difficulty", options: [["normal", "Normal (well known)"], ["medium", "Medium"], ["hard", "Hard (lesser known)"], ["random", "Random mix"]] },
  lengthMode: { type: "select", label: "Word length mode", options: [["fixed", "Fixed length"], ["random", "Random length in a range"]] },
  wordLength: { type: "number", label: "Word length (fixed)", min: 3, max: 20 },
  lengthMin: { type: "number", label: "Shortest word (range)", min: 3, max: 20 },
  lengthMax: { type: "number", label: "Longest word (range)", min: 3, max: 20 },
  autoContinueDelaySeconds: { type: "number", label: "Pause between rounds (seconds)", min: 3, max: 120 },
  starterWord: { type: "bool", label: "Open every round with a starter word" },
  allowRepeats: { type: "bool", label: "Digits may repeat" },
  regions: { type: "regions", label: "Where the secret place can be" },
  startLength: { type: "select", label: "Starting word length", options: [["3", "3 letters"], ["4", "4 letters"], ["5", "5 letters"], ["0", "Random 3-5"]] },
  maxLength: { type: "number", label: "Longest word (0 = automatic)", min: 0, max: 20 },
  roundSeconds: { type: "number", label: "Round time (seconds)", min: 20, max: 300 }
};

// ---- defaults ------------------------------------------------------------------------------------------------------
export const DEFAULT_TIPS = [
  "Type the number of your favourite game in chat to vote!",
  "Follow the live so you never miss a game.",
  "Share the live with a friend - more players, more fun!",
  "The leaderboard resets with every new game session."
];

export const DEFAULT_CONFIG = {
  name: "My AFK setup",
  run: {
    startDelaySeconds: 15,        // countdown after pressing Start before the first game
    firstGame: "vote",            // vote | fixed | random | sequence
    firstGameId: "wordle",        // used when firstGame is "fixed"
    stopRule: "never",            // never | hours | games
    stopAfterHours: 4,
    stopAfterGames: 10,
    onDisconnect: "keep",         // keep | pause | stop   (what to do when TikTok stays disconnected)
    disconnectGraceSeconds: 180,
    idleStopMinutes: 0,           // 0 = off. Stop when nobody typed in chat for this long
    resumeAfterRestart: true      // carry on by itself if the server restarts while running
  },
  session: {
    minutes: 10,                  // default length of one game session
    endRule: "time",              // time | rounds | either (whichever comes first)
    rounds: 6,                    // used by "rounds" / "either"
    finishRound: true,            // when the time is up, let the running round finish first
    graceSeconds: 90,             // ... but never wait longer than this
    showLeaderboardSeconds: 10,   // session leaderboard before voting (0 = skip)
    resultSeconds: 8              // update 115: after the LAST round of a session, keep the result on screen this long before the game changes
  },
  rotation: {
    mode: "vote",                 // vote | sequence | random | weighted
    sequence: [],                 // game ids in order (mode "sequence"); empty = all enabled games in catalog order
    loop: true,
    avoidRepeatLast: 2,           // do not offer / pick the last N games again (while enough others exist)
    allowReplay: false,           // the game that just finished may be offered / chosen again
    breakSeconds: 8               // splash "next game" time when nobody votes (sequence / random / weighted)
  },
  vote: {
    seconds: 45,
    options: 4,                   // 2 - 9
    optionPick: "random",         // random | weighted | all | fixed
    fixedOptions: [],             // game ids, when optionPick is "fixed"
    method: "number",             // number | letter | name | any
    changeVote: true,             // a viewer may change their vote (last one counts)
    minVotes: 1,                  // fewer total votes than this = "no result"
    tie: "random",                // random | first | longest-waiting | revote
    noResult: "random",           // random | default | replay | sequence
    defaultGameId: "wordle",
    showCounts: true,             // live counts on screen
    resultSeconds: 8,
    extendSecondsIfClose: 0,      // add time once if the top two are within 1 vote with < 5 s left (0 = off)
    includeReplayOption: false,   // add "Play <current game> again" as an option
    maxVotesPerMinutePerUser: 20, // anti-spam
    simulateWhenNotLive: true,    // update 115: in Offline / Test mode nobody can type in chat, so a few practice voters vote (otherwise every vote would end with "nobody voted")
    allowStageClicks: true        // update 115: a click / tap on an option of the stage page also counts as a vote (host, or a phone)
  },
  eligibility: {
    everyone: true,
    followers: false,             // follows the host (or followed during this live)
    subscribers: false,
    moderators: true,
    gifters: false,               // sent a gift during this live
    giftMinCoins: 1,
    sharers: false,               // shared the live during this live
    allowList: [],                // usernames that may always vote
    blockList: [],                // usernames that may never vote
    weightSubscriber: 1,          // a vote counts this many times
    weightGifter: 1,
    weightModerator: 1,
    weightFollower: 1
  },
  display: {
    voteTitle: "🗳️ Vote for the NEXT game!",
    breakTitle: "Next game",
    voteHint: "",                 // empty = made automatically from the vote method + who can vote
    tips: DEFAULT_TIPS,
    tipSeconds: 8,
    showTimer: true,              // small session timer chip while a game runs
    showUpNext: true,
    theme: "dark",                // dark | light
    accent: "#ff5c8a",
    showHowTo: true,              // one-line "how to play" on the next-game splash
    showAka: true,                // "Also known as ..." / "Inspired by ..." under each game on the vote, result and splash screens (update 112)
    showVoteNotes: true,          // the host's short note for each game, shown under it during the vote
    showNotesOnSplash: true,      // the same notes on the winner screen and the next-game splash
    transitionSeconds: 4          // black "loading" moment while the stage switches game
  },
  sync: { mode: "stick" },         // update 114: "stick" = keep the host's saved settings, never auto-refresh from the games | "follow" = auto-refresh what the games use
  games: {}                       // id -> { enabled, minutes, rounds, weight, settings, aka, inspiredBy, voteNote, howTo }
};
for (const g of GAMES) DEFAULT_CONFIG.games[g.id] = { enabled: g.id !== "contexto" && g.id !== "crossdle", minutes: 0, rounds: 0, weight: 1, settings: {}, syncMode: "global", aka: [], inspiredBy: "", voteNote: "", howTo: "" };
// limits of the viewer notes (they must fit on a TikTok LIVE screen)
export const NOTE_LIMITS = { akaCount: 6, akaChars: 40, inspiredBy: 80, voteNote: 120, howTo: 140 };

// ---- sanitizing ----------------------------------------------------------------------------------------------------
// update 114: forgiving readers - a restored file may have been edited by hand or come from an older version (numbers as text, "true"/"false",
// different capital letters). They are understood instead of silently replaced by the default.
const num = (v, lo, hi, d) => {
  if (v === null || v === undefined || v === "" || typeof v === "boolean") return d;
  const n = typeof v === "string" ? parseFloat(v.replace(",", ".")) : Number(v);
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, Math.round(n))) : d;
};
const pick = (v, list, d) => {
  if (list.includes(v)) return v;
  if (typeof v === "string") { const k = v.trim().toLowerCase(); const hit = list.find((x) => String(x).toLowerCase() === k); if (hit !== undefined) return hit; }
  return d;
};
const bool = (v, d) => {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v === 1 ? true : v === 0 ? false : d;
  if (typeof v === "string") { const k = v.trim().toLowerCase(); if (["true", "yes", "on", "1"].includes(k)) return true; if (["false", "no", "off", "0"].includes(k)) return false; }
  return d;
};
const str = (v, max, d) => (typeof v === "string" ? v.trim().slice(0, max) : d);
const idList = (v, max = 40) => {
  const raw = Array.isArray(v) ? v : typeof v === "string" ? v.split(/[\s,;]+/) : [];
  return [...new Set(raw.map((x) => String(x == null ? "" : x).trim().toLowerCase()).filter((x) => GAME_IDS.includes(x)))].slice(0, max);
};
const nameList = (v, max = 300) => {
  const raw = Array.isArray(v) ? v : typeof v === "string" ? v.split(/[\s,;]+/) : [];
  return [...new Set(raw.map((x) => String(x || "").replace(/^@/, "").trim().toLowerCase()).filter((x) => /^[a-z0-9._]{2,40}$/.test(x)))].slice(0, max);
};
// "Termo, Lingo" / ["Termo","Lingo"] / one per line  ->  a clean list of other names
const akaList = (v, d) => {
  const raw = Array.isArray(v) ? v : typeof v === "string" ? v.split(/[,;|\n]+/) : null;
  if (!raw) return d;
  const seen = new Set(), out = [];
  for (const x of raw) { const n = String(x == null ? "" : x).replace(/\s+/g, " ").trim().slice(0, NOTE_LIMITS.akaChars); const k = n.toLowerCase(); if (n && !seen.has(k)) { seen.add(k); out.push(n); } }
  return out.slice(0, NOTE_LIMITS.akaCount);
};
const hex = (v, d) => (typeof v === "string" && /^#[0-9a-fA-F]{6}$/.test(v) ? v : d);

export function sanitizePreset(gameId, raw) {
  const keys = PRESET_KEYS[gameId] || [];
  const out = {};
  if (!raw || typeof raw !== "object") return out;
  for (const k of keys) {
    if (raw[k] === undefined || raw[k] === null || raw[k] === "") continue; // empty = "leave the game's own setting"
    const f = PRESET_FIELDS[k];
    if (f.type === "select") {
      let v = String(raw[k]).trim().toLowerCase();
      if (k === "startLength") { const m = v.match(/\d+/); v = m ? m[0] : v.startsWith("rand") ? "0" : v; }
      const hit = f.options.map((o) => o[0]).find((x) => String(x).toLowerCase() === v);
      if (hit !== undefined) out[k] = k === "startLength" ? Number(hit) : hit;
    }
    else if (f.type === "number") out[k] = num(raw[k], f.min, f.max, f.min);
    else if (f.type === "bool") { const b = bool(raw[k], undefined); if (b !== undefined) out[k] = b; }
    else if (f.type === "regions") {
      const choices = REGION_CHOICES[gameId] || [];
      const src = Array.isArray(raw[k]) ? raw[k] : typeof raw[k] === "string" ? raw[k].split(/[,;|]+/) : [];
      const list = [];
      for (const x of src) { const t = String(x == null ? "" : x).trim().toLowerCase(); const hit = choices.find((r) => r[0].toLowerCase() === t || r[1].toLowerCase() === t); if (hit && !list.includes(hit[0])) list.push(hit[0]); }
      if (list.length) out[k] = list;
    }
  }
  if (out.lengthMin !== undefined && out.lengthMax !== undefined && out.lengthMin > out.lengthMax) [out.lengthMin, out.lengthMax] = [out.lengthMax, out.lengthMin];
  return out;
}

// update 114: finds the config inside whatever file was uploaded: a setup file, a bare config, a browser backup ({ t, data }),
// or a file wrapped one level deeper. Returns null when nothing that looks like an autopilot setup is in it.
export function extractConfig(d, depth = 0) {
  if (!d || typeof d !== "object" || depth > 3) return null;
  if (d.config && typeof d.config === "object") return extractConfig(d.config, depth + 1) || d.config;
  if (d.run || d.vote || d.games || d.rotation || d.session || d.eligibility || d.display) return d;
  if (d.data && typeof d.data === "object") return extractConfig(d.data, depth + 1);
  return null;
}
// games may be an object keyed by id OR by name ("Wordle"), or an array of { id, ... }; settings may sit directly on the game
function normGames(g) {
  const key = (x) => String(x == null ? "" : x).toLowerCase().replace(/[^a-z0-9]/g, "");
  const byKey = {};
  for (const gm of GAMES) { byKey[key(gm.id)] = gm.id; byKey[key(gm.name)] = gm.id; }
  const out = {};
  const put = (k, v) => { const id = byKey[key(k)]; if (id && v && typeof v === "object") out[id] = v; };
  if (Array.isArray(g)) g.forEach((v) => v && put(v.id || v.game || v.name, v));
  else if (g && typeof g === "object") Object.entries(g).forEach(([k, v]) => put(k, v));
  return out;
}

// update 114: what a restore found in the file and what could not be used (shown to the host after "Restore from a file")
export function describeImport(rawCfg, clean) {
  const found = normGames(rawCfg && rawCfg.games), rep = { games: Object.keys(found).length, withSettings: 0, settingValues: 0, notes: 0, dropped: [] };
  for (const [id, r] of Object.entries(found)) {
    const gm = gameById(id), cg = clean.games[id] || {}, keys = PRESET_KEYS[id] || [];
    const src = r.settings && typeof r.settings === "object" ? r.settings : r;
    let any = false;
    for (const k of keys) {
      if (src[k] === undefined || src[k] === null || src[k] === "") continue;
      if (cg.settings && cg.settings[k] !== undefined) { rep.settingValues++; any = true; } else rep.dropped.push(gm.name + ": " + k + " = " + JSON.stringify(src[k]) + " was not understood");
    }
    if (any) rep.withSettings++;
    if (r.settings && typeof r.settings === "object" && !keys.length && Object.keys(r.settings).length) rep.dropped.push(gm.name + ": its settings stay inside the game itself (not part of the autopilot)");
    if ((cg.aka && cg.aka.length) || cg.inspiredBy || cg.voteNote || cg.howTo) rep.notes++;
  }
  rep.dropped = rep.dropped.slice(0, 12);
  return rep;
}

export function sanitizeConfig(input, base = DEFAULT_CONFIG) {
  const c = input && typeof input === "object" ? input : {};
  const b = base;
  const run = c.run || {}, ses = c.session || {}, rot = c.rotation || {}, vt = c.vote || {}, el = c.eligibility || {}, dp = c.display || {};
  const out = {
    name: str(c.name, 60, b.name) || b.name,
    run: {
      startDelaySeconds: num(run.startDelaySeconds, 0, 600, b.run.startDelaySeconds),
      firstGame: pick(run.firstGame, ["vote", "fixed", "random", "sequence"], b.run.firstGame),
      firstGameId: GAME_IDS.includes(run.firstGameId) ? run.firstGameId : b.run.firstGameId,
      stopRule: pick(run.stopRule, ["never", "hours", "games"], b.run.stopRule),
      stopAfterHours: num(run.stopAfterHours, 1, 48, b.run.stopAfterHours),
      stopAfterGames: num(run.stopAfterGames, 1, 200, b.run.stopAfterGames),
      onDisconnect: pick(run.onDisconnect, ["keep", "pause", "stop"], b.run.onDisconnect),
      disconnectGraceSeconds: num(run.disconnectGraceSeconds, 10, 3600, b.run.disconnectGraceSeconds),
      idleStopMinutes: num(run.idleStopMinutes, 0, 600, b.run.idleStopMinutes),
      resumeAfterRestart: bool(run.resumeAfterRestart, b.run.resumeAfterRestart)
    },
    session: {
      minutes: num(ses.minutes, 1, 240, b.session.minutes),
      endRule: pick(ses.endRule, ["time", "rounds", "either"], b.session.endRule),
      rounds: num(ses.rounds, 1, 100, b.session.rounds),
      finishRound: bool(ses.finishRound, b.session.finishRound),
      graceSeconds: num(ses.graceSeconds, 5, 900, b.session.graceSeconds),
      showLeaderboardSeconds: num(ses.showLeaderboardSeconds, 0, 60, b.session.showLeaderboardSeconds),
      resultSeconds: num(ses.resultSeconds, 0, 60, b.session.resultSeconds !== undefined ? b.session.resultSeconds : 8)
    },
    rotation: {
      mode: pick(rot.mode, ["vote", "sequence", "random", "weighted"], b.rotation.mode),
      sequence: idList(rot.sequence),
      loop: bool(rot.loop, b.rotation.loop),
      avoidRepeatLast: num(rot.avoidRepeatLast, 0, 10, b.rotation.avoidRepeatLast),
      allowReplay: bool(rot.allowReplay, b.rotation.allowReplay),
      breakSeconds: num(rot.breakSeconds, 2, 120, b.rotation.breakSeconds)
    },
    vote: {
      seconds: num(vt.seconds, 10, 600, b.vote.seconds),
      options: num(vt.options, 2, 9, b.vote.options),
      optionPick: pick(vt.optionPick, ["random", "weighted", "all", "fixed"], b.vote.optionPick),
      fixedOptions: idList(vt.fixedOptions, 9),
      method: pick(vt.method, ["number", "letter", "name", "any"], b.vote.method),
      changeVote: bool(vt.changeVote, b.vote.changeVote),
      minVotes: num(vt.minVotes, 1, 1000, b.vote.minVotes),
      tie: pick(vt.tie, ["random", "first", "longest-waiting", "revote"], b.vote.tie),
      noResult: pick(vt.noResult, ["random", "default", "replay", "sequence"], b.vote.noResult),
      defaultGameId: GAME_IDS.includes(vt.defaultGameId) ? vt.defaultGameId : b.vote.defaultGameId,
      showCounts: bool(vt.showCounts, b.vote.showCounts),
      resultSeconds: num(vt.resultSeconds, 2, 60, b.vote.resultSeconds),
      extendSecondsIfClose: num(vt.extendSecondsIfClose, 0, 60, b.vote.extendSecondsIfClose),
      includeReplayOption: bool(vt.includeReplayOption, b.vote.includeReplayOption),
      maxVotesPerMinutePerUser: num(vt.maxVotesPerMinutePerUser, 1, 120, b.vote.maxVotesPerMinutePerUser),
      simulateWhenNotLive: bool(vt.simulateWhenNotLive, b.vote.simulateWhenNotLive !== undefined ? b.vote.simulateWhenNotLive : true),
      allowStageClicks: bool(vt.allowStageClicks, b.vote.allowStageClicks !== undefined ? b.vote.allowStageClicks : true)
    },
    eligibility: {
      everyone: bool(el.everyone, b.eligibility.everyone),
      followers: bool(el.followers, b.eligibility.followers),
      subscribers: bool(el.subscribers, b.eligibility.subscribers),
      moderators: bool(el.moderators, b.eligibility.moderators),
      gifters: bool(el.gifters, b.eligibility.gifters),
      giftMinCoins: num(el.giftMinCoins, 1, 100000, b.eligibility.giftMinCoins),
      sharers: bool(el.sharers, b.eligibility.sharers),
      allowList: nameList(el.allowList !== undefined ? el.allowList : b.eligibility.allowList),
      blockList: nameList(el.blockList !== undefined ? el.blockList : b.eligibility.blockList),
      weightSubscriber: num(el.weightSubscriber, 1, 20, b.eligibility.weightSubscriber),
      weightGifter: num(el.weightGifter, 1, 20, b.eligibility.weightGifter),
      weightModerator: num(el.weightModerator, 1, 20, b.eligibility.weightModerator),
      weightFollower: num(el.weightFollower, 1, 20, b.eligibility.weightFollower)
    },
    display: {
      voteTitle: str(dp.voteTitle, 80, b.display.voteTitle),
      breakTitle: str(dp.breakTitle, 60, b.display.breakTitle),
      voteHint: str(dp.voteHint, 160, b.display.voteHint),
      tips: Array.isArray(dp.tips) ? dp.tips.map((t) => str(t, 140, "")).filter(Boolean).slice(0, 20) : b.display.tips,
      tipSeconds: num(dp.tipSeconds, 3, 60, b.display.tipSeconds),
      showTimer: bool(dp.showTimer, b.display.showTimer),
      showUpNext: bool(dp.showUpNext, b.display.showUpNext),
      theme: pick(dp.theme, ["dark", "light"], b.display.theme),
      accent: hex(dp.accent, b.display.accent),
      showHowTo: bool(dp.showHowTo, b.display.showHowTo),
      showAka: bool(dp.showAka, b.display.showAka !== undefined ? b.display.showAka : true),
      showVoteNotes: bool(dp.showVoteNotes, b.display.showVoteNotes !== undefined ? b.display.showVoteNotes : true),
      showNotesOnSplash: bool(dp.showNotesOnSplash, b.display.showNotesOnSplash !== undefined ? b.display.showNotesOnSplash : true),
      transitionSeconds: num(dp.transitionSeconds, 1, 30, b.display.transitionSeconds)
    },
    sync: { mode: pick((c.sync || {}).mode, ["stick", "follow"], (b.sync && b.sync.mode) || "stick") }, // update 114: stick to the saved settings (default) | follow the games' own settings
    games: {}
  };
  const gin = normGames(c.games);
  for (const g of GAMES) {
    const bg = (b.games && b.games[g.id]) || DEFAULT_CONFIG.games[g.id];
    const r = gin[g.id] && typeof gin[g.id] === "object" ? gin[g.id] : {};
    out.games[g.id] = {
      enabled: bool(r.enabled, bg.enabled),
      minutes: num(r.minutes, 0, 240, bg.minutes),   // 0 = use the default session length
      rounds: num(r.rounds, 0, 100, bg.rounds),      // 0 = use the default round count
      weight: num(r.weight, 1, 10, bg.weight),
      settings: r.settings !== undefined ? sanitizePreset(g.id, r.settings) : (PRESET_KEYS[g.id] || []).some((k) => r[k] !== undefined) ? sanitizePreset(g.id, r) : bg.settings || {},
      syncMode: pick(r.syncMode, ["global", "stick", "follow"], bg.syncMode || "global"), // update 114: this game follows the global choice, or its own
      aka: akaList(r.aka, Array.isArray(bg.aka) ? bg.aka : []),
      inspiredBy: str(r.inspiredBy, NOTE_LIMITS.inspiredBy, typeof bg.inspiredBy === "string" ? bg.inspiredBy : ""),
      voteNote: str(r.voteNote, NOTE_LIMITS.voteNote, typeof bg.voteNote === "string" ? bg.voteNote : ""),
      howTo: str(r.howTo, NOTE_LIMITS.howTo, typeof bg.howTo === "string" ? bg.howTo : "")
    };
  }
  return out;
}

export const enabledGames = (cfg) => GAMES.filter((g) => cfg.games[g.id] && cfg.games[g.id].enabled);
