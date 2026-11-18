export const SESSION_UNLOCKED_KEY = "biometric_session_unlocked";
export const UNLOCK_TIMESTAMP_KEY = "biometric_unlock_timestamp";
export const BIOMETRIC_SETTINGS_KEY = "biometric_lock_settings";
export const RELOCK_TIMEOUT_MS = 20000;

function getSessionStorage() {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function getLocalStorage() {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** @returns {Record<string, unknown> | null} */
export function readBiometricSettingsFromStorage() {
  const storage = getLocalStorage();
  if (!storage) return null;
  try {
    const stored = storage.getItem(BIOMETRIC_SETTINGS_KEY);
    if (!stored) return null;
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

/** @param {Record<string, unknown>} settings */
export function writeBiometricSettingsToStorage(settings) {
  const storage = getLocalStorage();
  if (!storage) return;
  try {
    storage.setItem(BIOMETRIC_SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error("Error saving biometric settings:", e);
  }
}

/**
 * @returns {{ unlocked: boolean, timestamp: number | null }}
 */
export function readUnlockState() {
  const storage = getSessionStorage();
  if (!storage) {
    return { unlocked: false, timestamp: null };
  }
  try {
    const sessionUnlocked = storage.getItem(SESSION_UNLOCKED_KEY);
    const rawTs = storage.getItem(UNLOCK_TIMESTAMP_KEY);
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
  const storage = getSessionStorage();
  if (!storage) return;
  try {
    storage.setItem(SESSION_UNLOCKED_KEY, "true");
    storage.setItem(UNLOCK_TIMESTAMP_KEY, String(now));
  } catch (e) {
    console.error("Error saving biometric session:", e);
  }
}

export function touchUnlockTimestamp(now = Date.now()) {
  const storage = getSessionStorage();
  if (!storage) return;
  try {
    storage.setItem(UNLOCK_TIMESTAMP_KEY, String(now));
  } catch (e) {
    console.error("Error updating unlock timestamp:", e);
  }
}

export function clearUnlock() {
  const storage = getSessionStorage();
  if (!storage) return;
  try {
    storage.removeItem(SESSION_UNLOCKED_KEY);
    storage.removeItem(UNLOCK_TIMESTAMP_KEY);
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