
import { useCallback } from 'react';
import { useLocalStorage } from './useLocalStorage';
import { Word } from '../types';
import { LANGUAGE_ORDER } from '../constants';

// Helper to parse CSV content into word objects
const parseCSVContent = (csvText: string, existingWordKeys: Set<string>): { newWords: Omit<Word, 'id'>[], duplicateCount: number, invalidCount: number, addedCount: number } => {
    const lines = csvText.trim().split('\n');
    const headerLine = lines.shift()?.trim();
    if (!headerLine) {
        return { newWords: [], duplicateCount: 0, invalidCount: 0, addedCount: 0 };
    }

    const cleanedHeaderLine = headerLine.replace(/^\uFEFF/, '');
    // Auto-detect delimiter: semicolon or comma
    const delimiter = cleanedHeaderLine.includes(';') ? ';' : ',';
    const expectedHeader = ['source', 'subtopic1', 'subtopic2', 'wordtype', 'swedish', 'swedishexample', ...LANGUAGE_ORDER.flatMap(lang => [`${lang}_word`, `${lang}_example`])];
    const header = cleanedHeaderLine.toLowerCase().split(delimiter).map(h => h.trim().replace(/\s/g, ''));

    // Basic header validation (loose check to allow for minor whitespace diffs)
    if (JSON.stringify(header.sort()) !== JSON.stringify(expectedHeader.sort())) {
        console.error("Header mismatch. Expected:", expectedHeader, "Got:", header);
        return { newWords: [], duplicateCount: 0, invalidCount: lines.length, addedCount: 0 };
    }

    const csvRegex = delimiter === ";"
        ? /("([^"]*)"|[^;]*)(?:;|$)/g
        : /("([^"]*)"|[^,]*)(?:,|$)/g;
    let addedCount = 0;
    let duplicateCount = 0;
    let invalidCount = 0;
    const newWords: Omit<Word, 'id'>[] = [];

    lines.forEach((line) => {
        let values: string[] = [];
        let match;
        csvRegex.lastIndex = 0;
        while ((match = csvRegex.exec(line)) !== null && values.length < expectedHeader.length) {
            values.push((match[2] !== undefined ? match[2] : match[1]).trim());
        }

        if (values.length < 6 || !values[0] || !values[1] || !values[2] || !values[4]) {
            invalidCount++;
            return;
        }
        
        const [source, subtopic1, subtopic2, wordType, swedish, swedishExample = ''] = values;
        const key = `${source}|${subtopic1}|${subtopic2}|${swedish}`.toLowerCase();
        
        // Check duplicates against existing words passed in AND words already processed in this batch
        if (existingWordKeys.has(key)) {
            duplicateCount++;
            return;
        }

        const newWord: Omit<Word, 'id'> = {
            source, subtopic1, subtopic2, wordType: wordType || '', swedish, swedishExample,
            active: true, translations: {}, backCount: 0, difficulty: 'unmarked',
        };

        LANGUAGE_ORDER.forEach((lang, langIndex) => {
            const wordIndex = 6 + (langIndex * 2);
            const exampleIndex = 7 + (langIndex * 2);
            const sourceWord = values[wordIndex] || '';
            const sourceWordExample = values[exampleIndex] || '';
            if (sourceWord) {
                newWord.translations[lang] = { word: sourceWord, example: sourceWordExample };
            }
        });
        
        if (Object.keys(newWord.translations).length === 0) {
            invalidCount++;
            return;
        }
        
        existingWordKeys.add(key);
        newWords.push(newWord);
        addedCount++;
    });

    return { newWords, duplicateCount, invalidCount, addedCount };
};

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

    const toggleWordSrsActive = useCallback((wordId: string) => {
        setWords(prevWords => prevWords.map(w => w.id === wordId ? { ...w, srs_active: !w.srs_active } : w));
    }, [setWords]);

    const toggleWordFlag = useCallback((wordId: string) => {
        setWords(prevWords => prevWords.map(w => w.id === wordId ? { ...w, flagged: !w.flagged } : w));
    }, [setWords]);

    const toggleGroupActive = useCallback((filter: (word: Word) => boolean, isActive: boolean) => {
        setWords(prevWords => prevWords.map(w => filter(w) ? { ...w, active: isActive } : w));
    }, [setWords]);

    const toggleGroupSrsActive = useCallback((filter: (word: Word) => boolean, isActive: boolean) => {
        setWords(prevWords => prevWords.map(w => filter(w) ? { ...w, srs_active: isActive } : w));
    }, [setWords]);

    const syncActiveToSrs = useCallback(() => {
        setWords(prevWords => prevWords.map(w => ({ ...w, srs_active: w.active })));
    }, [setWords]);

    const syncSrsToActive = useCallback(() => {
        setWords(prevWords => prevWords.map(w => ({ ...w, active: !!w.srs_active })));
    }, [setWords]);

    // Save a named snapshot of active/srs_active state for all words to localStorage
    const saveWordState = useCallback((name: string): { success: boolean } => {
        try {
            const snapshot = words.map(w => ({ id: w.id, active: w.active, srs_active: !!w.srs_active }));
            const saves = JSON.parse(localStorage.getItem('vocabuilder_word_states') || '{}');
            saves[name] = { savedAt: new Date().toISOString(), snapshot };
            localStorage.setItem('vocabuilder_word_states', JSON.stringify(saves));
            return { success: true };
        } catch {
            return { success: false };
        }
    }, [words]);

    // Load a named snapshot — restores active/srs_active for words still present by id
    const loadWordState = useCallback((name: string): { success: boolean; message: string } => {
        try {
            const saves = JSON.parse(localStorage.getItem('vocabuilder_word_states') || '{}');
            const save = saves[name];
            if (!save) return { success: false, message: `No saved state named "${name}" found.` };
            const map = new Map<string, { active: boolean; srs_active: boolean }>(save.snapshot.map((s: { id: string; active: boolean; srs_active: boolean }) => [s.id, s]));
            setWords(prev => prev.map(w => {
                const s = map.get(w.id);
                if (!s) return w;
                return { ...w, active: s.active, srs_active: s.srs_active };
            }));
            return { success: true, message: `State "${name}" restored successfully.` };
        } catch {
            return { success: false, message: 'Failed to load saved state.' };
        }
    }, [setWords]);

    // List saved state names with timestamps
    const listWordStates = useCallback((): { name: string; savedAt: string }[] => {
        try {
            const saves = JSON.parse(localStorage.getItem('vocabuilder_word_states') || '{}');
            return Object.entries(saves).map(([name, val]: [string, any]) => ({ name, savedAt: val.savedAt }));
        } catch {
            return [];
        }
    }, []);

    // Delete a saved state
    const deleteWordState = useCallback((name: string) => {
        try {
            const saves = JSON.parse(localStorage.getItem('vocabuilder_word_states') || '{}');
            delete saves[name];
            localStorage.setItem('vocabuilder_word_states', JSON.stringify(saves));
        } catch { /* ignore */ }
    }, []);
    
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
            const header = ['Source', 'Subtopic1', 'Subtopic2', 'WordType', 'Swedish', 'SwedishExample', ...LANGUAGE_ORDER.flatMap(lang => [`${lang}_Word`, `${lang}_Example`])];
            
            const rows = words.map(word => {
                const rowData = [
                    word.source,
                    word.subtopic1,
                    word.subtopic2,
                    word.wordType || '',
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
        toggleWordSrsActive,
        toggleWordFlag,
        toggleGroupActive,
        toggleGroupSrsActive,
        syncActiveToSrs,
        syncSrsToActive,
        importFromCSV,
        syncWithDataFolder,
        exportToCSV,
        saveWordState,
        loadWordState,
        listWordStates,
        deleteWordState,
    };
};
