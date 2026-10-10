export const PENDING_FLYER_KEY = 'a18-pending-flyer-v1';

export type PendingFlyer = {
  dataUrl: string;
  name: string;
};

let memoryPending: PendingFlyer | null = null;

export function savePendingFlyer(pending: PendingFlyer) {
  memoryPending = pending;
  try {
    sessionStorage.setItem(PENDING_FLYER_KEY, JSON.stringify(pending));
  } catch {
    // Large images may exceed sessionStorage quota; in-memory handoff still works in this tab.
  }
}

/** Read without clearing — safe under React Strict Mode double-mount. */
export function peekPendingFlyer(): PendingFlyer | null {
  if (memoryPending?.dataUrl) return memoryPending;

  try {
    const raw = sessionStorage.getItem(PENDING_FLYER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PendingFlyer;
    if (!parsed?.dataUrl || !parsed?.name) return null;
    memoryPending = parsed;
    return parsed;
  } catch {
    return null;
  }
}

export function clearPendingFlyer() {
  memoryPending = null;
  try {
    sessionStorage.removeItem(PENDING_FLYER_KEY);
  } catch {
    // Ignore storage failures.
  }
}

/** @deprecated Prefer peekPendingFlyer + clearPendingFlyer after a successful load. */
export function takePendingFlyer(): PendingFlyer | null {
  const pending = peekPendingFlyer();
  if (pending) clearPendingFlyer();
  return pending;
}
