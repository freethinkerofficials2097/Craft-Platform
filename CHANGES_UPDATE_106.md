# Update 106 - NUMBERBLINDLE connection fix

## Root cause
NUMBERBLINDLE and BLINDLE both use the plain `ws` library on the one shared http server. Each created its WebSocket server
with `{ server, path }`, and the `ws` library answers **400 Bad Request to every upgrade whose path is not its own**.
BLINDLE is mounted first, so it rejected every `/numberblindle-ws` connection: the NUMBERBLINDLE page stayed on
"Reconnecting to game server..." and could not connect (and BLINDLE's own socket could get corrupted frames).

## Fixes
- New `server/shared/ws-upgrade.js`: each game gets its own WebSocket server that only handles its own path and ignores
  all other upgrade requests. Used by NUMBERBLINDLE and BLINDLE.
- Heartbeat: ping/pong every 25 s plus a small `hb` message, so Render / proxies do not close an idle socket and dead
  clients are removed. Compression is off (no more proxy "RSV1" frame errors).
- NUMBERBLINDLE page: one socket and one reconnect timer at a time (no stacking), growing waits with jitter, a watchdog
  that replaces a silently dead socket, and an instant reconnect when the tab becomes visible, the phone wakes or the
  network comes back.
- NUMBERBLINDLE TikTok connect: a Connect / Disconnect / mode change now cancels any attempt still running, so an old
  attempt can no longer attach a second TikTok connection or overwrite the status. Failed attempts are cleaned up.
  Errors that retrying cannot fix (wrong key, unknown username, plan limit, restricted LIVE) are shown at once instead of
  after 14 s of retries. A clear message when the username box is empty and when TikTok drops (auto-reconnect).
- `server.js`: `keepAliveTimeout` / `headersTimeout` raised above Render's proxy timeout (prevents random 502s / dropped sockets).

Run `npm install` as usual (no new dependencies). Redeploy the whole folder.
