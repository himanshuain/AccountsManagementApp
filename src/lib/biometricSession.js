export const SESSION_UNLOCKED_KEY = "biometric_session_unlocked";
export const UNLOCK_TIMESTAMP_KEY = "biometric_unlock_timestamp";
export const RELOCK_TIMEOUT_MS = 20000;

/**
 * @returns {{ unlocked: boolean, timestamp: number | null }}
 */
export function readUnlockState() {
  if (typeof sessionStorage === "undefined") {
    return { unlocked: false, timestamp: null };
  }
  try {
    const sessionUnlocked = sessionStorage.getItem(SESSION_UNLOCKED_KEY);
    const rawTs = sessionStorage.getItem(UNLOCK_TIMESTAMP_KEY);
    const timestamp = rawTs ? parseInt(rawTs, 10) : null;
    return {
      unlocked: sessionUnlocked === "true",
      timestamp: Number.isFinite(timestamp) ? timestamp : null,
    };
  } catch {
    return { unlocked: false, timestamp: null };
  }
}

/**
 * @param {number} [now]
 * @returns {boolean}
 */
export function isUnlockValid(now = Date.now()) {
  const { unlocked, timestamp } = readUnlockState();
  if (!unlocked) return false;
  if (timestamp == null) return true;
  return now - timestamp < RELOCK_TIMEOUT_MS;
}

export function markUnlocked(now = Date.now()) {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(SESSION_UNLOCKED_KEY, "true");
    sessionStorage.setItem(UNLOCK_TIMESTAMP_KEY, String(now));
  } catch (e) {
    console.error("Error saving biometric session:", e);
  }
}

export function touchUnlockTimestamp(now = Date.now()) {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(UNLOCK_TIMESTAMP_KEY, String(now));
  } catch (e) {
    console.error("Error updating unlock timestamp:", e);
  }
}

export function clearUnlock() {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.removeItem(SESSION_UNLOCKED_KEY);
    sessionStorage.removeItem(UNLOCK_TIMESTAMP_KEY);
  } catch (e) {
    console.error("Error clearing biometric session:", e);
  }
}

/**
 * Hydrate React state from session on mount (handles legacy unlocked-without-timestamp).
 * @returns {boolean} initial isUnlocked
 */
export function syncUnlockFromSessionOnMount() {
  const { unlocked, timestamp } = readUnlockState();
  if (!unlocked) return false;
  if (timestamp != null) {
    if (isUnlockValid()) return true;
    clearUnlock();
    return false;
  }
  markUnlocked();
  return true;
}