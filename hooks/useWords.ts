
import { useCallback } from 'react';
import { useLocalStorage } from './useLocalStorage';
import { Word } from '../types';
import { LANGUAGE_ORDER } from '../constants';
import { parseCSVContent } from '../utils/csv';

export const useWords = () => {
    const [words, setWords] = useLocalStorage<Word[]>('vocabuilder_words', []);

    const addWord = useCallback((wordData: Omit<Word, 'id' | 'active' | 'backCount' | 'difficulty'>) => {
        const newWord: Word = {
            ...wordData,
            id: crypto.randomUUID(),
            active: true,
            backCount: 0,
            difficulty: 'unmarked',
        };
        setWords(prevWords => [...prevWords, newWord]);
    }, [setWords]);

    const updateWord = useCallback((updatedWord: Word) => {
        setWords(prevWords => prevWords.map(w => w.id === updatedWord.id ? updatedWord : w));
    }, [setWords]);

    const deleteWord = useCallback((wordId: string) => {
        setWords(prevWords => prevWords.filter(w => w.id !== wordId));
    }, [setWords]);

    const deleteWords = useCallback((wordIdsToDelete: string[]) => {
        setWords(prevWords => prevWords.filter(w => !wordIdsToDelete.includes(w.id)));
    }, [setWords]);

    const toggleWordActive = useCallback((wordId: string) => {
        setWords(prevWords => prevWords.map(w => w.id === wordId ? { ...w, active: !w.active } : w));
    }, [setWords]);

    const toggleGroupActive = useCallback((filter: (word: Word) => boolean, isActive: boolean) => {
        setWords(prevWords => prevWords.map(w => filter(w) ? { ...w, active: isActive } : w));
    }, [setWords]);
    
    const importFromCSV = useCallback((csvText: string): { success: boolean, message: string } => {
        try {
            const existingWordKeys = new Set(words.map(w =>
                `${w.source}|${w.subtopic1}|${w.subtopic2}|${w.swedish}`.toLowerCase()
            ));

            const { newWords, duplicateCount, invalidCount, addedCount } = parseCSVContent(csvText, existingWordKeys);
            
            if (newWords.length > 0) {
                const wordsWithIds = newWords.map(w => ({ ...w, id: crypto.randomUUID() }));
                setWords(prev => [...prev, ...wordsWithIds]);
            }

            return { success: true, message: `Import Complete:\n- New words added: ${addedCount}\n- Duplicates skipped: ${duplicateCount}\n- Invalid rows: ${invalidCount}` };
        } catch (error) {
            console.error("Error loading CSV:", error);
            return { success: false, message: "An error occurred during import. Check console for details." };
        }
    }, [words, setWords]);

    const syncWithDataFolder = useCallback(async (): Promise<{ success: boolean, message: string }> => {
        try {
            // Glob import all CSV files from the ../data directory
            const modules = import.meta.glob('../data/*.csv', { query: '?raw', import: 'default' });
            
            let totalAdded = 0;
            let totalDuplicates = 0;
            let totalInvalid = 0;
            let filesProcessed = 0;
            const allNewWords: Word[] = [];

            // We need to get the current state of keys inside the setWords updater to ensure we don't overwrite recent changes,
            // but for the parsing logic we need a Set to track duplicates *across* the files we are processing.
            // We will fetch the current words first to initialize our "known" set.
            // Note: In a high-concurrency environment this might be stale, but for a user button click it is fine.
            
            // However, to be safe, we will parse everything into a candidate list, 
            // and then filter them inside the setWords updater.
            
            const fileContents: string[] = [];
            for (const path in modules) {
                try {
                    const content = await modules[path]() as string;
                    fileContents.push(content);
                    filesProcessed++;
                } catch (e) {
                    console.error(`Failed to load ${path}`, e);
                }
            }

            setWords(prevWords => {
                const existingWordKeys = new Set(prevWords.map(w =>
                    `${w.source}|${w.subtopic1}|${w.subtopic2}|${w.swedish}`.toLowerCase()
                ));

                const wordsToAdd: Word[] = [];

                fileContents.forEach(content => {
                     const { newWords, duplicateCount, invalidCount, addedCount } = parseCSVContent(content, existingWordKeys);
                     // Note: parseCSVContent updates existingWordKeys in place as it finds new valid words
                     // so subsequent files (or rows) won't add duplicates.
                     
                     totalAdded += addedCount;
                     totalDuplicates += duplicateCount;
                     totalInvalid += invalidCount;

                     newWords.forEach(nw => {
                         wordsToAdd.push({ ...nw, id: crypto.randomUUID() });
                     });
                });

                return [...prevWords, ...wordsToAdd];
            });

            return { 
                success: true, 
                message: `Folder Sync Complete:\n- Files processed: ${filesProcessed}\n- New words added: ${totalAdded}\n- Duplicates skipped: ${totalDuplicates}`
            };

        } catch (error) {
            console.error("Error syncing with data folder:", error);
            return { success: false, message: "Failed to sync with data folder." };
        }
    }, [setWords]);

    const exportToCSV = useCallback((): { success: boolean, message?: string } => {
        if (words.length === 0) {
            return { success: false, message: "No words to export." };
        }

        try {
            const header = ['Source', 'Subtopic1', 'Subtopic2', 'Swedish', 'SwedishExample', ...LANGUAGE_ORDER.flatMap(lang => [`${lang}_Word`, `${lang}_Example`])];
            
            const rows = words.map(word => {
                const rowData = [
                    word.source,
                    word.subtopic1,
                    word.subtopic2,
                    word.swedish,
                    word.swedishExample,
                ];
                LANGUAGE_ORDER.forEach(lang => {
                    const translation = word.translations[lang];
                    rowData.push(translation?.word || '');
                    rowData.push(translation?.example || '');
                });
                return rowData.map(field => {
                    const str = String(field || '');
                    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                        return `"${str.replace(/"/g, '""')}"`;
                    }
                    return str;
                }).join(',');
            });

            const csvContent = [header.join(','), ...rows].join('\n');
            const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement("a");
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", "vocab_export.csv");
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            return { success: true };
        } catch (error) {
            console.error("Error exporting to CSV:", error);
            return { success: false, message: "An error occurred during export. Check console for details." };
        }
    }, [words]);
    
    return {
        words,
        addWord,
        updateWord,
        deleteWord,
        deleteWords,
        toggleWordActive,
        toggleGroupActive,
        importFromCSV,
        syncWithDataFolder,
        exportToCSV,
    };
};
