// ===================================================================
// TWISTLE — game module
// Registered on its own Socket.IO namespace ("/twistle"), on the platform's
// shared Express app + Socket.IO server + HTTP server, the same pattern
// used by Flagle, TRAVLE, Findle and CROSSDLE (see server.js at the repo
// root). Ported from Twistle's original standalone server.js — the game
// rules, symbols and word lists are untouched; what changed is everything
// around them: no more owning its own app/http/io, host-key handling
// mirrors the platform's shared EulerStream key, gift/like/share alerts
// go through the platform's Engagement hub, and a leaderboard/points
// system (previously missing) now persists the same way CROSSDLE's does.
// ===================================================================

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { TikTokLiveConnection, WebcastEvent, ControlEvent } from 'tiktok-live-connector';
import { GameEngine, SYMBOL_POOL, MIN_LENGTH, MAX_LENGTH, normalizeLengthConfig } from './twistle-engine.js';
import { Engagement } from '../engagement/engagement-hub.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Run any function safely - log and continue instead of crashing the shared server. */
function safe(label, fn) {
  return (...args) => {
    try {
      return fn(...args);
    } catch (err) {
      console.error(`[twistle:SAFE-CATCH] Error in ${label}:`, err);
      return undefined;
    }
  };
}

export async function registerTwistle(app, rootIo, options = {}) {
  // There is intentionally no host password, matching Twistle's original
  // design — Host Controls (the gear icon) are open to anyone with the
  // page open, same trust model as every other game's host controls on
  // this platform (see root README).
  const DEFAULT_TIKTOK_USERNAME = process.env.DEFAULT_TIKTOK_USERNAME || '';
  // Twistle originally read its own SIGN_API_KEY env var; server/env-bridge.js
  // (imported first in server.js) already mirrors EULERSTREAM_API_KEY <->
  // TIKTOK_SIGN_API_KEY onto each other, so accept all three names here —
  // whichever one the host set on Render, Twistle picks it up too.
  const ENV_SIGN_API_KEY = process.env.SIGN_API_KEY || process.env.EULERSTREAM_API_KEY || process.env.TIKTOK_SIGN_API_KEY || '';

  const io = rootIo.of('/twistle');

  // -----------------------------------------------------------------
  // Word lists, loaded from disk
  //   twistle-words.json        - the secret words (answers), lengths 4-20
  //   twistle-guesses.json      - every other word viewers may guess
  //   data/twistle-custom-words.json - secret words the host adds live
  //   data/twistle-settings.json     - remembers the host's word-length setting
  //   data/twistle-leaderboard.json  - persisted points/leaderboard
  // Custom words/settings/leaderboard live under the platform's shared
  // data/ folder (same convention as CROSSDLE/Findle) since Render's free
  // tier wipes anything written elsewhere on redeploy anyway.
  // -----------------------------------------------------------------
  const WORDS_PATH = path.join(__dirname, 'twistle-words.json');
  const GUESSES_PATH = path.join(__dirname, 'twistle-guesses.json');
  const DATA_DIR = path.join(__dirname, '..', '..', 'data');
  const CUSTOM_WORDS_PATH = path.join(DATA_DIR, 'twistle-custom-words.json');
  const SETTINGS_PATH = path.join(DATA_DIR, 'twistle-settings.json');
  const LEADERBOARD_PATH = path.join(DATA_DIR, 'twistle-leaderboard.json');

  function loadJsonSafe(filePath, fallback) {
    try {
      if (!fs.existsSync(filePath)) return fallback;
      const raw = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(raw);
    } catch (err) {
      console.error(`[twistle:WORDS] Failed to read ${filePath}:`, err);
      return fallback;
    }
  }

  function saveJsonSafe(filePath, data) {
    try {
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    } catch (err) {
      console.error(`[twistle:WORDS] Failed to write ${filePath}:`, err);
    }
  }

  const builtInWords = loadJsonSafe(WORDS_PATH, []);
  const validGuesses = loadJsonSafe(GUESSES_PATH, []);
  const customWords = loadJsonSafe(CUSTOM_WORDS_PATH, []);
  const savedSettings = loadJsonSafe(SETTINGS_PATH, {});
  const savedLeaderboard = loadJsonSafe(LEADERBOARD_PATH, []);

  const engine = new GameEngine(
    [...builtInWords, ...customWords],
    validGuesses,
    savedSettings.lengthConfig || {},
    savedLeaderboard
  );
  console.log(
    `[twistle:WORDS] ${engine.wordBankSize} secret words, ${engine.valid.size} accepted guesses. ` +
    `Word length: ${JSON.stringify(engine.config)}. Leaderboard: ${engine.leaderboard.size} viewers restored.`
  );

  function saveLeaderboard() {
    saveJsonSafe(LEADERBOARD_PATH, [...engine.leaderboard.values()]);
  }

  // -----------------------------------------------------------------
  // Connection state (remembered so a page opened mid-stream shows the
  // right status straight away). Chat messages are NOT stored or
  // rebroadcast to viewers — same privacy stance as Twistle's original
  // build. The one narrow exception is the "!penguin"/"!fish" easter egg
  // (see below): only that exact matched trigger word is ever relayed,
  // never the guess/chat text itself.
  // -----------------------------------------------------------------
  const diagnostics = {
    connectionState: 'disconnected', // disconnected | connecting | connected | error
    connectionMessage: '',
    loggedSamples: 0,
  };

  let tiktokConnection = null;
  const MAX_RETRIES = 3;

  function extractChatFields(data) {
    // Robust fallback chain - never trust a single hardcoded field name.
    const text =
      data?.comment ?? data?.content ?? data?.text ?? data?.message ?? data?.msg ?? '';
    const username =
      data?.user?.uniqueId ??
      data?.user?.nickname ??
      data?.uniqueId ??
      data?.nickname ??
      data?.user?.displayId ??
      'unknown_user';
    const displayName =
      data?.user?.nickname ?? data?.nickname ?? data?.user?.uniqueId ?? username;
    const avatarUrl =
      data?.user?.profilePictureUrl ??
      data?.user?.avatarThumb?.urlList?.[0] ??
      data?.user?.avatarMedium?.urlList?.[0] ??
      data?.user?.avatarLarger?.urlList?.[0] ??
      data?.user?.avatarUrl ??
      data?.profilePictureUrl ??
      data?.avatarUrl ??
      null;
    return {
      text: String(text || ''),
      username: String(username || 'unknown_user'),
      displayName: String(displayName || username),
      avatarUrl: avatarUrl ? String(avatarUrl) : null,
    };
  }

  /** "!penguin" / "!fish" is a purely-decorative shared easter egg (see
   *  public/shared/penguin-fun.js). Only the matched trigger word itself is
   *  ever relayed to viewers — never the surrounding chat/guess text. */
  function maybeTriggerFun(text) {
    const t = String(text || '').trim().toLowerCase();
    if (t === '!penguin' || t === '!fish') io.emit('fun:trigger', t);
  }

  function processGuess(username, displayName, text, avatarUrl) {
    maybeTriggerFun(text);
    const result = engine.handleGuess(username, displayName, text, avatarUrl);
    if (result && (result.correct || result.added)) saveLeaderboard();
    return result;
  }

  function wireConnectionEvents(connection) {
    connection.on(
      ControlEvent.CONNECTED,
      safe('tiktok:connected', (state) => {
        diagnostics.connectionState = 'connected';
        diagnostics.connectionMessage = `Connected to room ${state?.roomId || ''}`;
        io.emit('tiktok:status', { state: 'connected', message: diagnostics.connectionMessage });
      })
    );

    connection.on(
      ControlEvent.DISCONNECTED,
      safe('tiktok:disconnected', ({ code, reason } = {}) => {
        diagnostics.connectionState = 'disconnected';
        diagnostics.connectionMessage = reason || `Disconnected (code ${code ?? 'n/a'})`;
        io.emit('tiktok:status', { state: 'disconnected', message: diagnostics.connectionMessage });
      })
    );

    connection.on(
      ControlEvent.ERROR,
      safe('tiktok:error', ({ info, exception } = {}) => {
        console.error('[twistle:TIKTOK ERROR]', info, exception);
        diagnostics.connectionState = 'error';
        diagnostics.connectionMessage = String(info || exception?.message || 'Unknown error');
        io.emit('tiktok:status', { state: 'error', message: diagnostics.connectionMessage });
      })
    );

    connection.on(
      WebcastEvent.CHAT,
      safe('tiktok:chat', (data) => {
        // One-time raw shape logging so a developer can inspect real payloads.
        if (diagnostics.loggedSamples < 5) {
          diagnostics.loggedSamples += 1;
          console.log('[twistle:RAW CHAT SAMPLE]', JSON.stringify(data));
        }
        const { text, username, displayName, avatarUrl } = extractChatFields(data);
        processGuess(username, displayName, text, avatarUrl);
      })
    );
  }

  async function connectToTikTok(username, signApiKey) {
    const cleanUsername = String(username || '').replace(/^@/, '').trim();
    if (!cleanUsername) {
      io.emit('tiktok:status', { state: 'error', message: 'Please enter a TikTok username.' });
      return;
    }

    if (tiktokConnection) {
      try {
        await tiktokConnection.disconnect();
      } catch (err) {
        console.error('[twistle:TIKTOK] Error disconnecting previous connection:', err);
      }
      tiktokConnection = null;
    }

    const apiKey = signApiKey || ENV_SIGN_API_KEY;
    if (!apiKey) {
      io.emit('tiktok:status', {
        state: 'error',
        message: 'A Euler Stream signing API key is required. Paste it into the Host Controls panel, or set EULERSTREAM_API_KEY on Render (shared with the rest of the platform).',
      });
      return;
    }

    diagnostics.connectionState = 'connecting';
    diagnostics.connectionMessage = `Connecting to @${cleanUsername}...`;
    io.emit('tiktok:status', { state: 'connecting', message: diagnostics.connectionMessage });

    const connection = new TikTokLiveConnection(cleanUsername, { signApiKey: apiKey });
    wireConnectionEvents(connection);
    tiktokConnection = connection;

    let attempt = 0;
    while (attempt < MAX_RETRIES) {
      try {
        const state = await connection.connect();
        console.log(`[twistle:TIKTOK] Connected to roomId ${state.roomId}`);
        // Platform-wide Gift/Like/Share alerts — one line, added on top of
        // Twistle's own listeners, never interfering with them.
        Engagement.attach(connection, { game: 'twistle', tiktokUsername: cleanUsername });
        return;
      } catch (err) {
        attempt += 1;
        console.error(`[twistle:TIKTOK] Connect attempt ${attempt} failed:`, err?.message || err);
        diagnostics.connectionMessage = `Attempt ${attempt}/${MAX_RETRIES} failed: ${err?.message || err}`;
        diagnostics.connectionState = attempt < MAX_RETRIES ? 'connecting' : 'error';
        io.emit('tiktok:status', { state: diagnostics.connectionState, message: diagnostics.connectionMessage });

        if (attempt >= MAX_RETRIES) {
          io.emit('tiktok:status', {
            state: 'error',
            message:
              'Could not connect after 3 attempts. Make sure the username is correct, the account is currently LIVE, and your signing key is valid.',
          });
          return;
        }
        const backoffMs = 2000 * attempt; // 2s, 4s, 6s
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
      }
    }
  }

  async function disconnectFromTikTok() {
    if (tiktokConnection) {
      try {
        await tiktokConnection.disconnect();
      } catch (err) {
        console.error('[twistle:TIKTOK] Error during manual disconnect:', err);
      }
      tiktokConnection = null;
    }
    diagnostics.connectionState = 'disconnected';
    diagnostics.connectionMessage = 'Disconnected by host.';
    io.emit('tiktok:status', { state: 'disconnected', message: diagnostics.connectionMessage });
  }

  // -----------------------------------------------------------------
  // Game engine -> broadcast bridge
  // -----------------------------------------------------------------
  engine.on('stateChanged', safe('emit:stateChanged', (state) => io.emit('game:state', state)));
  engine.on('wordBankUpdated', safe('emit:wordBank', (count) => io.emit('game:wordBankSize', count)));
  engine.on('roundEnded', safe('emit:roundEnded', (payload) => io.emit('round:ended', payload)));
  engine.on('leaderboardChanged', safe('save:leaderboard', saveLeaderboard));
  // Remember the word-length setting so it survives a restart (best effort - Render's free tier wipes files on redeploy).
  engine.on('configChanged', safe('save:settings', (config) => {
    saveJsonSafe(SETTINGS_PATH, { lengthConfig: config });
  }));

  // -----------------------------------------------------------------
  // Test mode - simulate fake chat locally without going LIVE
  // -----------------------------------------------------------------
  const FAKE_USERS = ['sparkle_fan22', 'tiktok_lurker', 'moon.child', 'xX_gamerpro_Xx', 'lisa.loves.cats', 'big_dave99', 'mango_mia', 'zed.zone'];
  const FAKE_CHATTER = ['hi!', 'lol', 'omg', 'no way', '???', 'love this game', 'wait what', 'hmm', '😂😂😂', 'lets gooo', 'what do the symbols mean', 'sun = green??'];
  let testModeTimer = null;

  function startTestMode() {
    stopTestMode();
    testModeTimer = setInterval(
      safe('testMode:tick', () => {
        const user = FAKE_USERS[Math.floor(Math.random() * FAKE_USERS.length)];
        const state = engine.getPublicState();
        const active = state.status === 'active' && engine.current;
        let text;
        const roll = Math.random();
        if (active && roll < 0.04 + 0.01 * state.rows.length) {
          text = engine.current.answer; // somebody cracked it - more likely the more guesses are on the board
        } else if (active && roll < 0.7) {
          text = engine.randomValidWord(); // a fresh guess for the board
        } else {
          text = FAKE_CHATTER[Math.floor(Math.random() * FAKE_CHATTER.length)];
        }

        processGuess(user, `${user} (test)`, text, null);
      }),
      1200
    );
  }
  function stopTestMode() {
    if (testModeTimer) clearInterval(testModeTimer);
    testModeTimer = null;
  }

  // -----------------------------------------------------------------
  // HTTP: health check, matching the other games' /<game>/healthz routes.
  // The page itself (public/twistle/index.html) and its assets are served
  // automatically by the platform's shared express.static(public/) in
  // server.js — no extra route needed here.
  // -----------------------------------------------------------------
  app.get('/twistle/healthz', (req, res) => res.status(200).send('ok'));

  // -----------------------------------------------------------------
  // Socket.IO wiring - Host Controls are open to anyone on the page
  // (no password gate - see note above).
  // -----------------------------------------------------------------
  io.on('connection', (socket) => {
    // Send current snapshot to the newly connected client.
    socket.emit('game:state', engine.getPublicState());
    socket.emit('tiktok:status', { state: diagnostics.connectionState, message: diagnostics.connectionMessage });
    socket.emit('server:config', {
      defaultUsername: DEFAULT_TIKTOK_USERNAME,
      hasEnvSignKey: Boolean(ENV_SIGN_API_KEY),
      symbols: SYMBOL_POOL,
      minLength: MIN_LENGTH,
      maxLength: MAX_LENGTH,
    });
    socket.emit('testMode:status', Boolean(testModeTimer));

    socket.on('host:connectTikTok', safe('socket:connectTikTok', ({ username, signApiKey } = {}) => {
      connectToTikTok(username, signApiKey);
    }));

    socket.on('host:disconnectTikTok', safe('socket:disconnectTikTok', () => {
      disconnectFromTikTok();
    }));

    socket.on('host:startGame', safe('socket:startGame', () => {
      engine.start();
    }));

    socket.on('host:stopGame', safe('socket:stopGame', () => {
      engine.stop();
    }));

    socket.on('host:setLength', safe('socket:setLength', (cfg, ack) => {
      const config = engine.setLengthConfig(normalizeLengthConfig(cfg || {}, engine.config));
      if (typeof ack === 'function') ack({ ok: true, config });
    }));

    socket.on('host:revealAnswer', safe('socket:revealAnswer', () => {
      engine.revealAnswer();
    }));

    socket.on('host:skipRound', safe('socket:skipRound', () => {
      engine.skipRound();
    }));

    socket.on('host:sendMessage', safe('socket:sendMessage', ({ name, text } = {}) => {
      const who = String(name || 'Host').trim() || 'Host';
      const clean = String(text || '').trim();
      if (!clean) return;
      processGuess(who, who, clean, null);
    }));

    socket.on('host:addWord', safe('socket:addWord', (entry, ack) => {
      try {
        const clean = engine.addWord(entry || {});
        const all = loadJsonSafe(CUSTOM_WORDS_PATH, []).map((w) => String(w?.answer ?? w)).filter((w) => /^[A-Za-z]{4,20}$/.test(w));
        if (!all.includes(clean.answer)) all.push(clean.answer);
        saveJsonSafe(CUSTOM_WORDS_PATH, all);
        if (typeof ack === 'function') ack({ ok: true });
      } catch (err) {
        if (typeof ack === 'function') ack({ ok: false, error: err.message });
      }
    }));

    socket.on('host:testMode', safe('socket:testMode', (enabled) => {
      if (enabled) startTestMode();
      else stopTestMode();
      io.emit('testMode:status', Boolean(enabled));
    }));

    socket.on('host:resetLeaderboard', safe('socket:resetLeaderboard', () => {
      engine.resetLeaderboard();
      saveLeaderboard();
    }));

    socket.on('disconnect', () => {
      // No per-socket cleanup needed - state lives on the server, not the socket.
    });
  });

  console.log('[twistle] registered on namespace /twistle');
  return { diagnostics, engine };
}
