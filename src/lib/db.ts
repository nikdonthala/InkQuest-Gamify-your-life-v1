// ---- IndexedDB persistence (offline-first) ----
import { openDB, type DBSchema } from 'idb';
import type { Snapshot } from '../types';

interface InkDB extends DBSchema {
  kv: {
    key: string;
    value: Snapshot;
  };
}

const DB_NAME = 'inkquest';
const STORE = 'kv';
const KEY = 'snapshot';

let dbPromise: Promise<import('idb').IDBPDatabase<InkDB>> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<InkDB>(DB_NAME, 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
      }
    });
  }
  return dbPromise;
}

export async function loadSnapshot(): Promise<Snapshot | null> {
  try {
    const db = await getDB();
    return (await db.get(STORE, KEY)) ?? null;
  } catch {
    return null;
  }
}

export async function saveSnapshot(snap: Snapshot): Promise<void> {
  try {
    const db = await getDB();
    await db.put(STORE, snap, KEY);
  } catch {
    // ignore persistence errors (private mode etc.)
  }
}

export async function clearSnapshot(): Promise<void> {
  try {
    const db = await getDB();
    await db.delete(STORE, KEY);
  } catch {
    /* noop */
  }
}
