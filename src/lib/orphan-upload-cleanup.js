/**
 * Client-side cleanup: delete R2 objects that were uploaded during a form session
 * but never persisted because the user closed/cancelled without saving.
 *
 * Only deletes keys that match /api/upload/delete validation (storage keys, not URLs).
 */

const STORAGE_KEY_PATTERN = /^[a-z0-9-]+\/[0-9]+-[a-z0-9]+\.[a-z]+$/i;

export function isDeletableStorageKey(s) {
  return typeof s === "string" && STORAGE_KEY_PATTERN.test(s);
}

/** Orphans in an image list: present now, not in the snapshot from when the form opened / last saved. */
export function getOrphanStorageKeysFromArray(currentList, initialList) {
  const initial = new Set(
    (Array.isArray(initialList) ? initialList : []).filter(isDeletableStorageKey)
  );
  return (Array.isArray(currentList) ? currentList : []).filter(
    key => isDeletableStorageKey(key) && !initial.has(key)
  );
}

/** Single image field: new upload replaced/changed value vs initial. */
export function getOrphanStorageKeysFromSingle(currentVal, initialVal) {
  if (!isDeletableStorageKey(currentVal)) return [];
  if (currentVal === initialVal) return [];
  return [currentVal];
}

export function deleteStorageKeysClient(keys) {
  for (const storageKey of keys) {
    if (!isDeletableStorageKey(storageKey)) continue;
    fetch("/api/upload/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storageKey }),
    }).catch(() => {});
  }
}

/**
 * Track storage keys created by successful uploads during one form open.
 * Cancel should delete only this set (includes uploads removed from the UI before cancel).
 * Clear the set on successful save without deleting.
 *
 * @param {{ current: Set<string> }} setRef
 */
export function addSessionStorageKeys(setRef, keys) {
  if (!Array.isArray(keys)) return;
  for (const k of keys) {
    if (isDeletableStorageKey(k)) setRef.current.add(k);
  }
}

/** Call when the user removes an image and R2 delete is triggered (or will be), so cancel does not double-delete. */
export function removeSessionStorageKeys(setRef, keys) {
  if (!Array.isArray(keys)) return;
  for (const k of keys) {
    setRef.current.delete(k);
  }
}

export function clearSessionStorageKeys(setRef) {
  setRef.current.clear();
}

/** Keys to delete on cancel; empties the set. */
export function drainSessionStorageKeysForCancel(setRef) {
  const keys = [...setRef.current].filter(isDeletableStorageKey);
  setRef.current.clear();
  return keys;
}
