const DB_NAME = 'VocabBuilderDB';
const STORE_NAME = 'ReadingSources';
const DB_VERSION = 1;

export const initDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = (event) => {
            console.error('IndexedDB Error:', event);
            reject('Error opening IndexedDB');
        };

        request.onsuccess = (event) => {
            resolve((event.target as IDBOpenDBRequest).result);
        };

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            }
        };
    });
};

export const saveSourceFile = async (id: string, fileData: string | ArrayBuffer): Promise<void> => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        
        const request = store.put({ id, data: fileData });
        
        request.onsuccess = () => resolve();
        request.onerror = () => reject('Error saving file to IndexedDB');
    });
};

export const getSourceFile = async (id: string): Promise<string | ArrayBuffer | null> => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        
        const request = store.get(id);
        
        request.onsuccess = () => {
            if (request.result) {
                resolve(request.result.data);
            } else {
                resolve(null);
            }
        };
        request.onerror = () => reject('Error retrieving file from IndexedDB');
    });
};

export const deleteSourceFile = async (id: string): Promise<void> => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        
        const request = store.delete(id);
        
        request.onsuccess = () => resolve();
        request.onerror = () => reject('Error deleting file from IndexedDB');
    });
};
