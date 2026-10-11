import { useState, useEffect, useCallback } from 'react';
import { ReadingPassage } from '../types';
import { deleteSourceFile } from '../utils/indexedDB';

const STORAGE_KEY = 'vocabBuilder_readingLibrary';

export const useReadingLibrary = () => {
    const [passages, setPassages] = useState<ReadingPassage[]>(() => {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            try {
                return JSON.parse(stored);
            } catch (e) {
                console.error("Failed to parse reading library from local storage:", e);
            }
        }
        return [];
    });

    const savePassage = useCallback((passage: ReadingPassage) => {
        const stored = localStorage.getItem(STORAGE_KEY);
        let currentPassages: ReadingPassage[] = [];
        if (stored) {
            try {
                currentPassages = JSON.parse(stored);
            } catch (e) {
                console.error("Failed to parse reading library from local storage:", e);
            }
        }
        const index = currentPassages.findIndex(p => p.id === passage.id);
        let updated;
        if (index >= 0) {
            updated = [...currentPassages];
            updated[index] = passage;
        } else {
            updated = [passage, ...currentPassages];
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        setPassages(updated);
    }, []);

    const deletePassage = useCallback(async (id: string) => {
        // First delete the source file from IndexedDB if it exists
        const stored = localStorage.getItem(STORAGE_KEY);
        let currentPassages: ReadingPassage[] = [];
        if (stored) {
            try {
                currentPassages = JSON.parse(stored);
            } catch (e) {}
        }

        const passage = currentPassages.find(p => p.id === id);
        if (passage?.sourceFileId) {
            try {
                await deleteSourceFile(passage.sourceFileId);
            } catch (e) {
                console.error("Failed to delete source file from IndexedDB", e);
            }
        }
        
        const updated = currentPassages.filter(p => p.id !== id);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        setPassages(updated);
    }, []);

    return {
        passages,
        savePassage,
        deletePassage,
    };
};
