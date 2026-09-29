// ===================================================================
// Host profile picture helper (shared by every game that opens a round with
// a random "starter word": BLINDLE, ORACLE, TWISTLE, CROSSDLE).
//
// The starter word is played by the game itself, not by a viewer, so its
// avatar circle used to fall back to a generic colored initial. It now shows
// the profile picture of the HOST of the current TikTok LIVE session - i.e.
// the account the game is connected to.
//
// Where the picture comes from (first hit wins):
//   1. The room info TikTok returns when the connection is made
//      (roomInfo.owner.avatar_thumb / avatar_medium / avatar_large ...).
//   2. A second, explicit room-info fetch, if the first one had no owner.
//   3. The host's OWN chat messages (their avatar is attached to each one) -
//      see hostAvatarFromChat() - used as a late fallback.
// If none of these produce a picture the game simply keeps its old look
// (colored initial circle); nothing ever breaks because a picture is missing.
// ===================================================================

// Field names differ between library versions / payload styles (snake_case
// straight from TikTok vs camelCase from the protobuf decoder), so try both.
const OWNER_AVATAR_KEYS = [
  "avatar_thumb", "avatarThumb",
  "avatar_medium", "avatarMedium",
  "avatar_larger", "avatarLarger",
  "avatar_large", "avatarLarge",
];
const URL_LIST_KEYS = ["url_list", "urlList", "urls"];

function firstUsableUrl(list) {
  if (!Array.isArray(list)) return null;
  const urls = list.filter((u) => typeof u === "string" && /^https?:\/\//i.test(u));
  if (urls.length === 0) return null;
  // Most browsers can't draw .heic - prefer a normal image format when offered.
  return urls.find((u) => !/\.heic(\?|$)/i.test(u)) || urls[0];
}

function urlFromAvatarObject(obj) {
  if (!obj) return null;
  if (typeof obj === "string") return firstUsableUrl([obj]);
  if (Array.isArray(obj)) return firstUsableUrl(obj);
  for (const k of URL_LIST_KEYS) {
    const found = firstUsableUrl(obj[k]);
    if (found) return found;
  }
  return null;
}

/** Pulls the host's picture URL out of a TikTok room-info object (or null). */
export function extractOwnerAvatar(roomInfo) {
  if (!roomInfo || typeof roomInfo !== "object") return null;
  // Room info is sometimes wrapped ({ data: {...} }) depending on the version.
  const candidates = [roomInfo, roomInfo.data, roomInfo.roomInfo].filter(Boolean);
  for (const info of candidates) {
    const owner = info.owner || info.anchor || info.host || null;
    if (!owner) continue;
    for (const key of OWNER_AVATAR_KEYS) {
      const url = urlFromAvatarObject(owner[key]);
      if (url) return url;
    }
    // Last resort: any avatar-looking property on the owner.
    for (const [key, value] of Object.entries(owner)) {
      if (/avatar/i.test(key)) {
        const url = urlFromAvatarObject(value);
        if (url) return url;
      }
    }
    if (typeof owner.profilePictureUrl === "string" && /^https?:\/\//i.test(owner.profilePictureUrl)) {
      return owner.profilePictureUrl;
    }
  }
  return null;
}

/**
 * Finds the host's profile picture for a freshly connected TikTok connection.
 * Never throws - resolves to a URL string, or null if nothing was available.
 *
 * @param connection  the TikTokLiveConnection that just finished connect()
 * @param connectState whatever `await connection.connect()` resolved to
 */
export async function resolveHostAvatar(connection, connectState) {
  try {
    const first =
      extractOwnerAvatar(connectState && connectState.roomInfo) ||
      extractOwnerAvatar(connection && connection.roomInfo);
    if (first) return first;
  } catch (_) { /* fall through */ }

  try {
    if (connection && typeof connection.fetchRoomInfo === "function") {
      const info = await connection.fetchRoomInfo();
      const second = extractOwnerAvatar(info);
      if (second) return second;
    }
  } catch (_) { /* room info is optional - ignore */ }

  return null;
}

/** True when a chat message was written by the host (the connected account). */
export function isHostUser(chatUsername, hostUsername) {
  const a = String(chatUsername || "").trim().replace(/^@/, "").toLowerCase();
  const b = String(hostUsername || "").trim().replace(/^@/, "").toLowerCase();
  return Boolean(a) && a === b;
}
