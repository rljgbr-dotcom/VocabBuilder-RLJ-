
import { Word } from '../types';

const DB_NAME = 'VocabBuilderDB';
const DB_VERSION = 1;
const WORD_STORE = 'words_store';

// Standard native IDB helper
const getDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
        const request = window.indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event: any) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(WORD_STORE)) {
                // Key path can just be a static entry for all words, 
                // OR we store words individually. Storing the WHOLE array as one 
                // large entry is easy, safe, and extremely efficient for serialization.
                db.createObjectStore(WORD_STORE);
            }
        };

        request.onsuccess = (event: any) => {
            resolve(event.target.result);
        };

        request.onerror = (event: any) => {
            reject(event.target.error);
        };
    });
};

/**
 * Loads all words from IndexedDB.
 * Falls back to returning undefined if database is completely fresh.
 */
export const loadWordsFromDB = async (): Promise<Word[] | undefined> => {
    try {
        const db = await getDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(WORD_STORE, 'readonly');
            const store = transaction.objectStore(WORD_STORE);
            const request = store.get('current_word_list'); // Stored as a single entry for atomic reading

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    } catch (error) {
        console.error('Failed to load from IndexedDB:', error);
        return undefined;
    }
};

/**
 * Atomically overwrites current word list in DB.
 */
export const saveWordsToDB = async (words: Word[]): Promise<void> => {
    try {
        const db = await getDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(WORD_STORE, 'readwrite');
            const store = transaction.objectStore(WORD_STORE);
            
            // Put updates or creates automatically. 
            // We pass the key explicitly here.
            const request = store.put(words, 'current_word_list');

            request.onsuccess = () => {
                resolve();
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    } catch (error) {
        console.error('Failed to save to IndexedDB:', error);
    }
};
