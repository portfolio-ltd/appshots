/**
 * Screenshot and overlay files, kept in IndexedDB so a draft survives reloads.
 * Nothing here leaves the browser.
 */

const DB_NAME = "appshots";
const STORE = "files";

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    dbPromise.catch(() => { dbPromise = null; });
  }
  return dbPromise;
}

async function tx<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const req = fn(db.transaction(STORE, mode).objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

const shotKey = (deviceId: string) => `shots:${deviceId}`;
const overlayKey = (overlayId: string) => `overlay:${overlayId}`;

export async function loadShots(deviceId: string): Promise<File[]> {
  try {
    return ((await tx("readonly", (s) => s.get(shotKey(deviceId)))) as File[] | undefined) ?? [];
  } catch {
    return [];
  }
}

export async function saveShots(deviceId: string, files: File[]): Promise<void> {
  await tx("readwrite", (s) => s.put(files, shotKey(deviceId)));
}

export async function loadOverlayFile(overlayId: string): Promise<Blob | null> {
  try {
    return ((await tx("readonly", (s) => s.get(overlayKey(overlayId)))) as Blob | undefined) ?? null;
  } catch {
    return null;
  }
}

export async function saveOverlayFile(overlayId: string, file: Blob): Promise<void> {
  await tx("readwrite", (s) => s.put(file, overlayKey(overlayId)));
}

export async function clearFiles(): Promise<void> {
  try {
    await tx("readwrite", (s) => s.clear());
  } catch {
    // Storage unavailable (private mode) — nothing to clear.
  }
}
