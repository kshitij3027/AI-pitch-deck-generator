import { Deck } from '../types';

const DB_NAME = 'PitchDeckAI_DB';
const DB_VERSION = 1;
const STORE_NAME = 'decks';

// Robust ID generator that works in all browsers (Safari/Chrome) and contexts (Secure/Non-Secure)
export const generateId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    try {
      return crypto.randomUUID();
    } catch (e) {
      // Fallback if randomUUID fails (e.g. non-secure context in Safari)
    }
  }
  // Fallback implementation
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

// Singleton connection promise to prevent opening too many connections (Safari issue)
let dbConnectionPromise: Promise<IDBDatabase> | null = null;

const openDB = (): Promise<IDBDatabase> => {
  // Reuse existing connection if available
  if (dbConnectionPromise) {
    return dbConnectionPromise.then(db => {
        // Safety check: if db was closed externally, reset and reopen
        if (!db || (db as any).readyState === 'closed' || (db as any).readyState === 'closing') {
           dbConnectionPromise = null;
           return openDB();
        }
        return db;
    }).catch(() => {
        dbConnectionPromise = null;
        return openDB();
    });
  }

  dbConnectionPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      // Handle version changes (e.g. another tab upgrades DB) to prevent blocking
      db.onversionchange = () => {
        db.close();
        dbConnectionPromise = null;
      };

      // Handle unexpected closure
      db.onclose = () => {
        dbConnectionPromise = null;
      };

      resolve(db);
    };

    request.onerror = (event) => {
      dbConnectionPromise = null;
      reject((event.target as IDBOpenDBRequest).error);
    };
  });

  return dbConnectionPromise;
};

export const getAllDecks = async (): Promise<Deck[]> => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        // Sort by lastModified desc
        const decks = request.result as Deck[];
        resolve(decks.sort((a, b) => b.lastModified - a.lastModified));
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    // Reset connection on error
    dbConnectionPromise = null;
    throw error;
  }
};

export const getDeckById = async (id: string): Promise<Deck | undefined> => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result as Deck);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    dbConnectionPromise = null;
    throw error;
  }
};

export const saveDeck = async (deck: Deck): Promise<void> => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      store.put(deck); // We don't strictly need to listen to request.onsuccess

      // CRITICAL FIX FOR SAFARI:
      // Wait for the transaction to COMPLETE, not just the request to succeed.
      // This ensures data is physically flushed to disk before resolving.
      transaction.oncomplete = () => resolve();
      
      transaction.onerror = (event) => reject(transaction.error || (event.target as any).error);
      transaction.onabort = (event) => reject(transaction.error || (event.target as any).error);
    });
  } catch (error) {
    dbConnectionPromise = null;
    throw error;
  }
};

export const deleteDeck = async (id: string): Promise<void> => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      store.delete(id);

      // CRITICAL FIX FOR SAFARI: Wait for transaction complete
      transaction.oncomplete = () => resolve();
      
      transaction.onerror = (event) => reject(transaction.error || (event.target as any).error);
      transaction.onabort = (event) => reject(transaction.error || (event.target as any).error);
    });
  } catch (error) {
    dbConnectionPromise = null;
    throw error;
  }
};

export const createInitialDeck = (): Deck => {
  return {
    id: generateId(),
    title: 'Untitled Deck',
    createdAt: Date.now(),
    lastModified: Date.now(),
    slides: [],
  };
};