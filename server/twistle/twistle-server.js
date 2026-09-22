// ============================================================================
// TWISTLE — game module
// Registered on its own Socket.IO namespace ("/twistle"), following the same
// pattern as Flagle/TRAVLE/Findle/CROSSDLE, so its events never cross paths
// with any other game on this platform.
//
// The secret-word mechanic (symbols, per-letter clues) is entirely Twistle's
// own — see twistle-engine.js. What's ported straight from BLINDLE:
//   - the curated word bank + difficulty engine (which word gets picked)
//   - the 370,000+ word guess dictionary (which guesses are accepted)
//   - the points/leaderboard system (Live mode only, 10/1 win/guess points)
//   - the Live / Test / Offline mode split every other game on this
//     platform already uses
// ============================================================================

import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { TikTokLiveConnection, WebcastEvent, ControlEvent } from 'tiktok-live-connector';

import {
  GameEngine,
  SYMBOL_POOL,
  MIN_LENGTH,
  MAX_LENGTH,
  normalizeLengthConfig,
  normalizeDifficulty,
} from './twistle-engine.js';
import { loadDictionary, dictionaryState } from './twistle-dictionary.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const MAX_CONNECT_ATTEMPTS = 3;
const BACKOFF_MS = [2000, 4000, 8000];

export async function registerTwistle(app, rootIo) {
  const SIGN_API_KEY =
    process.env.EULERSTREAM_API_KEY || process.env.TIKTOK_SIGN_API_KEY || process.env.SIGN_API_KEY || '';
  const CUSTOM_WORDS_FILE = path.join(__dirname, '..', '..', 'data', 'twistle-custom-words.json');
  const SETTINGS_FILE = path.join(__dirname, '..', '..', 'data', 'twistle-settings.json');

  const io = rootIo.of('/twistle');

  function loadJsonSafe(file, fallback) {
    try {
      if (!fs.existsSync(file)) return fallback;
      return JSON.parse(fs.readFileSync(file, 'utf-8'));
    } catch (err) {
      console.error(`[twistle] Failed to read ${file}:`, err.message);
      return fallback;
    }
  }
  function saveJsonSafe(file, data) {
    try {
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, JSON.stringify(data, null, 2));
    } catch (err) {
      console.error(`[twistle] Failed to save ${file}:`, err.message);
    }
  }

  const savedSettings = loadJsonSafe(SETTINGS_FILE, {});
  const customWords = loadJsonSafe(CUSTOM_WORDS_FILE, []);

  const engine = new GameEngine(savedSettings.lengthConfig || {}, savedSettings.difficulty || 'normal', customWords);

  // Load the same 370,000+ word dictionary BLINDLE uses before accepting
  // connections, so the very first round's guesses are validated correctly.
  await loadDictionary();
  console.log(
    `[twistle] Dictionary: ${dictionaryState.source} (${dictionaryState.wordCount.toLocaleString()} words). ` +
      `Word bank: ${engine.wordBankSize} curated secret words.`
  );

  // -------------------------------------------------------------------
  // Diagnostics (mirrors BLINDLE/CROSSDLE's on-screen diagnostics panel)
  // -------------------------------------------------------------------
  const diagnostics = {
    connectionState: 'idle', // idle | connecting | connected | reconnecting | error
    connectionMessage: '',
    tiktokUsername: null,
    eventsReceived: 0,
    recognizedCount: 0,
    lastReceived: null,
    rawSamples: [],
    errors: [],
  };

  function setConnectionState(state, message = '') {
    diagnostics.connectionState = state;
    diagnostics.connectionMessage = message;
    io.emit('tiktok:status', { state, message, username: diagnostics.tiktokUsername });
  }
  function logError(context, err) {
    const entry = { context, message: err?.message || String(err), ts: Date.now() };
    diagnostics.errors.unshift(entry);
    if (diagnostics.errors.length > 25) diagnostics.errors.length = 25;
    console.error(`[twistle:${context}]`, err?.stack || err);
  }

  function extractChatFields(data) {
    // Robust fallback chain — never trust a single hardcoded field name,
    // matching the same pattern used by every other game on this platform.
    const text = data?.comment ?? data?.content ?? data?.text ?? data?.message ?? data?.msg ?? '';
    const username =
      data?.user?.uniqueId ?? data?.user?.nickname ?? data?.uniqueId ?? data?.nickname ?? data?.user?.displayId ?? 'unknown_user';
    const displayName = data?.user?.nickname ?? data?.nickname ?? data?.user?.uniqueId ?? username;
    const avatarUrl =
      data?.user?.profilePictureUrl ||
      data?.user?.avatarThumb?.urlList?.[0] ||
      data?.user?.avatarMedium?.urlList?.[0] ||
      data?.user?.avatarLarger?.urlList?.[0] ||
      data?.user?.avatarUrl ||
      null;
    return { text: String(text || ''), username: String(username || 'unknown_user'), displayName: String(displayName || username), avatarUrl };
  }

  function handleIncomingChat(username, displayName, text, avatarUrl, source) {
    try {
      diagnostics.eventsReceived += 1;
      diagnostics.lastReceived = { username: displayName, text, ts: Date.now(), source };
      io.emit('chat:raw', { text }); // lets every client's shared PenguinFun easter egg (!penguin / !fish) see chat
      const result = engine.handleGuess(username, displayName, text, avatarUrl);
      if (result) {
        diagnostics.recognizedCount += 1;
        if (result.rejected === 'not-a-word') io.emit('guess:rejected', { name: displayName, word: result.word });
      }
    } catch (err) {
      logError('handleIncomingChat', err);
    }
  }

  // -------------------------------------------------------------------
  // TikTok LIVE connection — retry + generation guard, same shape as
  // BLINDLE/CROSSDLE's TikTok managers.
  // -------------------------------------------------------------------
  let connection = null;
  let desiredUsername = null;
  let manuallyDisconnected = false;
  let generation = 0;

  function friendlyConnectError(err, username) {
    const msg = (err && err.message) || String(err);
    if (/offline|not.*live|UserOfflineError|room.?id|not found/i.test(msg)) {
      return `@${username} does not look like they're LIVE right now.`;
    }
    if (/rate.?limit/i.test(msg)) return 'Rate-limited by the signing service. Add a sign-in key or wait a bit.';
    if (/sign/i.test(msg)) return 'The signing service rejected the connection. Double-check your sign API key.';
    return msg || 'Unknown connection error.';
  }

  async function connectToTikTok(usernameRaw, signApiKeyOverride) {
    const username = String(usernameRaw || '').replace(/^@/, '').trim();
    if (!username) return setConnectionState('error', 'Please enter a TikTok username.');

    generation += 1;
    const myGeneration = generation;
    manuallyDisconnected = false;
    desiredUsername = username;
    diagnostics.tiktokUsername = username;

    if (connection) {
      try { connection.disconnect(); } catch (_) { /* ignore */ }
      connection = null;
    }

    const apiKey = signApiKeyOverride || SIGN_API_KEY;
    if (!apiKey) {
      return setConnectionState('error', 'A EulerStream signing API key is required. Set EULERSTREAM_API_KEY on the server, or paste one into Host Controls.');
    }

    for (let attempt = 1; attempt <= MAX_CONNECT_ATTEMPTS; attempt++) {
      if (manuallyDisconnected || myGeneration !== generation) return;
      setConnectionState('connecting', `Connecting to @${username} (attempt ${attempt}/${MAX_CONNECT_ATTEMPTS})...`);
      try {
        const conn = new TikTokLiveConnection(username, { signApiKey: apiKey });
        connection = conn;

        conn.on(WebcastEvent.CHAT, (data) => {
          try {
            if (myGeneration !== generation) return;
            if (diagnostics.rawSamples.length < 6) diagnostics.rawSamples.push({ ts: Date.now(), text: JSON.stringify(data).slice(0, 2000) });
            const { text, username: user, displayName, avatarUrl } = extractChatFields(data);
            handleIncomingChat(user, displayName, text, avatarUrl, 'tiktok');
          } catch (err) {
            logError('chatHandler', err);
          }
        });
        conn.on(ControlEvent.ERROR, (info) => logError('controlError', (info && info.exception) || info));
        conn.on(ControlEvent.DISCONNECTED, () => {
          if (manuallyDisconnected || myGeneration !== generation) return;
          setConnectionState('reconnecting', 'Connection dropped. Reconnecting...');
          connectToTikTok(username, apiKey);
        });

        const state = await conn.connect();
        if (myGeneration !== generation) { try { conn.disconnect(); } catch (_) {} return; }
        engine.setMode('live');
        setConnectionState('connected', `Connected to @${username} (room ${state?.roomId || ''}).`);
        try {
          const { Engagement } = await import('../engagement/engagement-hub.js');
          Engagement.attach(conn, { game: 'twistle', tiktokUsername: username });
        } catch (err) {
          logError('engagementAttach', err);
        }
        return;
      } catch (err) {
        if (myGeneration !== generation) return;
        logError('connect', err);
        if (attempt === MAX_CONNECT_ATTEMPTS) {
          setConnectionState('error', friendlyConnectError(err, username));
          return;
        }
        setConnectionState('connecting', `Attempt ${attempt} failed (${friendlyConnectError(err, username)}). Retrying...`);
        await new Promise((r) => setTimeout(r, BACKOFF_MS[attempt - 1] || 8000));
      }
    }
  }

  function disconnectFromTikTok() {
    generation += 1;
    manuallyDisconnected = true;
    if (connection) {
      try { connection.disconnect(); } catch (err) { logError('disconnect', err); }
      connection = null;
    }
    if (engine.mode === 'live') engine.setMode(testModeActive ? 'test' : 'offline');
    setConnectionState('idle', 'Disconnected.');
  }

  // -------------------------------------------------------------------
  // Test mode — fake chat feed, exercises the exact same handleGuess()
  // path real TikTok chat goes through. Same idea as every other game's
  // Test Mode on this platform.
  // -------------------------------------------------------------------
  const FAKE_USERS = ['sparkle_fan22', 'tiktok_lurker', 'moon.child', 'xX_gamerpro_Xx', 'lisa.loves.cats', 'big_dave99', 'mango_mia', 'zed.zone'];
  const FAKE_CHATTER = ['hi!', 'lol', 'omg', 'no way', '???', 'love this game', 'wait what', 'hmm', 'lets gooo', 'what do the symbols mean'];
  let testModeTimer = null;
  let testModeActive = false;

  function startTestMode() {
    stopTestMode();
    testModeActive = true;
    if (!connection) engine.setMode('test');
    testModeTimer = setInterval(() => {
      try {
        const user = FAKE_USERS[Math.floor(Math.random() * FAKE_USERS.length)];
        const state = engine.getPublicState();
        const active = state.status === 'active' && engine.current;
        let text;
        const roll = Math.random();
        if (active && roll < 0.04 + 0.01 * state.rows.length) text = engine.current.answer;
        else if (active) text = engine.randomValidWord() || FAKE_CHATTER[0];
        else text = FAKE_CHATTER[Math.floor(Math.random() * FAKE_CHATTER.length)];
        handleIncomingChat(user, `${user}`, text, null, 'test');
      } catch (err) {
        logError('testMode', err);
      }
    }, 1200);
    io.emit('testMode:status', true);
  }
  function stopTestMode() {
    if (testModeTimer) clearInterval(testModeTimer);
    testModeTimer = null;
    testModeActive = false;
    if (!connection && engine.mode === 'test') engine.setMode('offline');
    io.emit('testMode:status', false);
  }

  // -------------------------------------------------------------------
  // Engine -> broadcast bridge
  // -------------------------------------------------------------------
  engine.on('stateChanged', (state) => io.emit('game:state', state));
  engine.on('wordBankUpdated', (count) => io.emit('game:wordBankSize', count));
  engine.on('roundEnded', (info) => io.emit('round:ended', info));
  engine.on('configChanged', (config) => saveJsonSafe(SETTINGS_FILE, { lengthConfig: config, difficulty: engine.difficulty }));

  app.get('/twistle/healthz', (req, res) => res.status(200).send('ok'));

  io.on('connection', (socket) => {
    socket.emit('game:state', engine.getPublicState());
    socket.emit('tiktok:status', { state: diagnostics.connectionState, message: diagnostics.connectionMessage, username: diagnostics.tiktokUsername });
    socket.emit('testMode:status', testModeActive);
    socket.emit('server:config', {
      hasEnvSignKey: Boolean(SIGN_API_KEY),
      symbols: SYMBOL_POOL,
      minLength: MIN_LENGTH,
      maxLength: MAX_LENGTH,
      dictionary: { source: dictionaryState.source, wordCount: dictionaryState.wordCount },
    });
    socket.emit('diagnostics:update', diagnostics);

    socket.on('host:connectTikTok', ({ username, signApiKey } = {}) => connectToTikTok(username, signApiKey));
    socket.on('host:disconnectTikTok', () => disconnectFromTikTok());

    socket.on('host:startGame', () => engine.start());
    socket.on('host:stopGame', () => engine.stop());

    socket.on('host:setLength', (cfg, ack) => {
      const config = engine.setLengthConfig(normalizeLengthConfig(cfg || {}, engine.config));
      if (typeof ack === 'function') ack({ ok: true, config });
    });

    socket.on('host:setDifficulty', (value, ack) => {
      const difficulty = engine.setDifficulty(normalizeDifficulty(value));
      saveJsonSafe(SETTINGS_FILE, { lengthConfig: engine.config, difficulty });
      if (typeof ack === 'function') ack({ ok: true, difficulty });
    });

    socket.on('host:revealAnswer', () => engine.revealAnswer());
    socket.on('host:skipRound', () => engine.skipRound());

    socket.on('host:sendMessage', ({ name, text } = {}) => {
      const who = String(name || 'Host').trim() || 'Host';
      const clean = String(text || '').trim();
      if (clean) handleIncomingChat(who, who, clean, null, 'host');
    });

    socket.on('host:addWord', (entry, ack) => {
      try {
        const clean = engine.addWord(entry || {});
        const all = loadJsonSafe(CUSTOM_WORDS_FILE, []).map((w) => String(w?.answer ?? w)).filter((w) => /^[A-Za-z]{4,20}$/.test(w));
        if (!all.includes(clean.answer)) all.push(clean.answer);
        saveJsonSafe(CUSTOM_WORDS_FILE, all);
        if (typeof ack === 'function') ack({ ok: true });
      } catch (err) {
        if (typeof ack === 'function') ack({ ok: false, error: err.message });
      }
    });

    socket.on('host:testMode', (enabled) => (enabled ? startTestMode() : stopTestMode()));

    socket.on('host:setTiming', (cfg) => engine.setTiming(cfg || {}));
    socket.on('host:resetRoundLeaderboard', () => engine.resetRoundLeaderboard());
    socket.on('host:resetTotalLeaderboard', () => engine.resetTotalLeaderboard());

    socket.on('disconnect', () => {
      // No per-socket cleanup needed — state lives on the engine, not the socket.
    });
  });

  console.log(
    `[twistle] registered on namespace /twistle. ` +
      (SIGN_API_KEY ? 'Sign API key detected.' : 'WARNING: no EULERSTREAM_API_KEY set — TikTok connections will use the unreliable free/no-key path.')
  );

  return { engine, diagnostics };
}
