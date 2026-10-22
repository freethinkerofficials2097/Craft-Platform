// ===================================================================
// SHARED RAW-WEBSOCKET HELPER (update 106)
//
// WHY THIS EXISTS: BLINDLE and NUMBERBLINDLE both use the plain "ws" library on the ONE shared http server.
// With `new WebSocketServer({ server, path })` every game's server listens to EVERY upgrade request and answers
// "400 Bad Request" to any path that is not its own. So the game mounted first (Blindle) rejected every
// /numberblindle-ws connection and the page sat on "Reconnecting to game server..." forever.
//
// createGameWss() fixes that: each game gets a `noServer` WebSocketServer and ONE small upgrade listener that only
// reacts to its own path and ignores everything else (socket.io, other games). It also adds:
//   - a ping/pong heartbeat every 25 s (stops Render / proxies closing an idle socket and removes dead clients)
//   - an app-level {"type":"hb"} message so the page can detect a silently dead connection
//   - perMessageDeflate off (avoids proxy "RSV1" frame errors) and a payload limit
// ===================================================================
import { WebSocketServer } from "ws";

const HEARTBEAT_MS = 25000;

export function createGameWss(httpServer, wsPath, { heartbeatMs = HEARTBEAT_MS, label = "WS" } = {}) {
  const wss = new WebSocketServer({ noServer: true, perMessageDeflate: false, maxPayload: 1024 * 1024 });

  httpServer.on("upgrade", (req, socket, head) => {
    let pathname = "";
    try {
      pathname = new URL(req.url || "/", "http://localhost").pathname;
    } catch {
      return;
    }
    if (pathname !== wsPath) return; // not ours - leave it to the other listeners
    wss.handleUpgrade(req, socket, head, (ws) => wss.emit("connection", ws, req));
  });

  wss.on("connection", (ws) => {
    ws.isAlive = true;
    ws.on("pong", () => { ws.isAlive = true; });
    ws.on("error", (err) => console.error(`[${label}] client socket error:`, err && err.message ? err.message : err));
  });

  const timer = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (ws.isAlive === false) { try { ws.terminate(); } catch {} return; }
      ws.isAlive = false;
      try { ws.ping(); } catch {}
      try { if (ws.readyState === 1) ws.send('{"type":"hb"}'); } catch {}
    });
  }, heartbeatMs);
  timer.unref?.();
  wss.on("close", () => clearInterval(timer));

  return wss;
}
