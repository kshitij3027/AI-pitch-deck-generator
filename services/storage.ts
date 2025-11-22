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

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onerror = (event) => {
      reject((event.target as IDBOpenDBRequest).error);
    };
  });
};

export const getAllDecks = async (): Promise<Deck[]> => {
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
};

export const getDeckById = async (id: string): Promise<Deck | undefined> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(id);

    request.onsuccess = () => resolve(request.result as Deck);
    request.onerror = () => reject(request.error);
  });
};

export const saveDeck = async (deck: Deck): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(deck);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const deleteDeck = async (id: string): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
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