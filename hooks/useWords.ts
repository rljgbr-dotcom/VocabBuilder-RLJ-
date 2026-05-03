
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
    const expectedHeader42 = ['source', 'subtopic1', 'subtopic2', 'wordtype', 'swedish', 'swedishexample', ...LANGUAGE_ORDER.flatMap(lang => [`${lang}_word`, `${lang}_example`]), 'present', 'presenttranslation', 'presentexample', 'presentexampletranslation', 'preteritum', 'preteritumtranslation', 'preteritumexample', 'preteritumexampletranslation', 'supinium', 'supiniumtranslation', 'supiniumexample', 'supiniumexampletranslation'];
    const expectedHeader43 = [...expectedHeader42, 'id'];
    const expectedHeader46 = [...expectedHeader42, 'swedishnote', 'presentnote', 'preteritumnote', 'supiniumnote'];
    const expectedHeader47 = [...expectedHeader43, 'swedishnote', 'presentnote', 'preteritumnote', 'supiniumnote'];
    const expectedHeader30 = ['source', 'subtopic1', 'subtopic2', 'wordtype', 'swedish', 'swedishexample', ...LANGUAGE_ORDER.flatMap(lang => [`${lang}_word`, `${lang}_example`])];
    
    let isLegacy = false;
    let expectedColCount = 42;

    const header = cleanedHeaderLine.split(delimiter).map(c => c.trim().toLowerCase());

    if (JSON.stringify([...header].sort()) === JSON.stringify([...expectedHeader30].sort())) {
        isLegacy = true;
        expectedColCount = 30;
    } else if (JSON.stringify([...header].sort()) === JSON.stringify([...expectedHeader47].sort())) {
        expectedColCount = 47;
    } else if (JSON.stringify([...header].sort()) === JSON.stringify([...expectedHeader46].sort())) {
        expectedColCount = 46;
    } else if (JSON.stringify([...header].sort()) === JSON.stringify([...expectedHeader43].sort())) {
        expectedColCount = 43;
    } else if (JSON.stringify([...header].sort()) !== JSON.stringify([...expectedHeader42].sort())) {
        console.error("Header mismatch. Expected:", expectedHeader42, "Got:", header);
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
        while ((match = csvRegex.exec(line)) !== null && values.length < expectedColCount) {
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
            verb_game_active: false,
            verb_rating_infinitiv: 5,
            verb_rating_present: 5,
            verb_rating_preteritum: 5,
            verb_rating_supinium: 5
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
        
        if (!isLegacy) {
            const verbIndex = 6 + (LANGUAGE_ORDER.length * 2);
            newWord.present = values[verbIndex] || '';
            newWord.presentTranslation = values[verbIndex + 1] || '';
            newWord.presentExample = values[verbIndex + 2] || '';
            newWord.presentExampleTranslation = values[verbIndex + 3] || '';
            newWord.preteritum = values[verbIndex + 4] || '';
            newWord.preteritumTranslation = values[verbIndex + 5] || '';
            newWord.preteritumExample = values[verbIndex + 6] || '';
            newWord.preteritumExampleTranslation = values[verbIndex + 7] || '';
            newWord.supinium = values[verbIndex + 8] || '';
            newWord.supiniumTranslation = values[verbIndex + 9] || '';
            newWord.supiniumExample = values[verbIndex + 10] || '';
            newWord.supiniumExampleTranslation = values[verbIndex + 11] || '';
            // col 12 = id (optional)
            if (expectedColCount === 43 || expectedColCount === 47) {
                newWord.original_csv_id = values[verbIndex + 12] || '';
            }
            // Note columns (46 = no id + 4 notes; 47 = id + 4 notes)
            if (expectedColCount === 46) {
                newWord.swedishNote    = values[verbIndex + 12] || '';
                newWord.presentNote    = values[verbIndex + 13] || '';
                newWord.preteritumNote = values[verbIndex + 14] || '';
                newWord.supiniumNote   = values[verbIndex + 15] || '';
            } else if (expectedColCount === 47) {
                newWord.swedishNote    = values[verbIndex + 13] || '';
                newWord.presentNote    = values[verbIndex + 14] || '';
                newWord.preteritumNote = values[verbIndex + 15] || '';
                newWord.supiniumNote   = values[verbIndex + 16] || '';
            }
        }
        
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

    const toggleVerbGameActive = useCallback((wordId: string) => {
        setWords(prevWords => prevWords.map(w => w.id === wordId ? { ...w, verb_game_active: !w.verb_game_active } : w));
    }, [setWords]);

    const toggleWordSrsActive = useCallback((wordId: string) => {
        setWords(prevWords => prevWords.map(w => {
            if (w.id === wordId) {
                const newActive = !w.srs_active;
                return {
                    ...w,
                    srs_active: newActive,
                    srs_added_at: (newActive && !w.srs_added_at) ? new Date().toISOString() : w.srs_added_at
                };
            }
            return w;
        }));
    }, [setWords]);

    const toggleWordFlag = useCallback((wordId: string) => {
        setWords(prevWords => prevWords.map(w => w.id === wordId ? { ...w, flagged: !w.flagged } : w));
    }, [setWords]);

    const toggleGroupActive = useCallback((filter: (word: Word) => boolean, isActive: boolean) => {
        setWords(prevWords => prevWords.map(w => filter(w) ? { ...w, active: isActive } : w));
    }, [setWords]);

    const toggleGroupVerbGameActive = useCallback((filter: (word: Word) => boolean, isActive: boolean) => {
        setWords(prevWords => prevWords.map(w => filter(w) ? { ...w, verb_game_active: isActive } : w));
    }, [setWords]);

    const toggleGroupSrsActive = useCallback((filter: (word: Word) => boolean, isActive: boolean) => {
        setWords(prevWords => prevWords.map(w => {
            if (filter(w)) {
                return {
                    ...w,
                    srs_active: isActive,
                    srs_added_at: (isActive && !w.srs_added_at) ? new Date().toISOString() : w.srs_added_at
                };
            }
            return w;
        }));
    }, [setWords]);

    const syncActiveToSrs = useCallback(() => {
        const now = new Date().toISOString();
        setWords(prevWords => prevWords.map(w => ({
            ...w,
            srs_active: w.active,
            srs_added_at: (w.active && !w.srs_added_at) ? now : w.srs_added_at
        })));
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
            let addedCount = 0;
            let updatedCount = 0;

            setWords(prevWords => {
                const existingWordsMap = new Map<string, Word>();
                prevWords.forEach(w => {
                    const key = `${w.source}|${w.subtopic1}|${w.subtopic2}|${w.swedish}`.toLowerCase();
                    existingWordsMap.set(key, w);
                });

                const { newWords } = parseCSVContent(csvText, new Set());
                const updatedWords: Word[] = [...prevWords];

                newWords.forEach(nw => {
                    const key = `${nw.source}|${nw.subtopic1}|${nw.subtopic2}|${nw.swedish}`.toLowerCase();
                    if (existingWordsMap.has(key)) {
                        const existingWord = existingWordsMap.get(key)!;
                        Object.assign(existingWord, {
                            wordType: nw.wordType || existingWord.wordType,
                            swedishExample: nw.swedishExample || existingWord.swedishExample,
                            translations: { ...existingWord.translations, ...nw.translations },
                            present: nw.present || existingWord.present,
                            presentTranslation: nw.presentTranslation || existingWord.presentTranslation,
                            presentExample: nw.presentExample || existingWord.presentExample,
                            presentExampleTranslation: nw.presentExampleTranslation || existingWord.presentExampleTranslation,
                            preteritum: nw.preteritum || existingWord.preteritum,
                            preteritumTranslation: nw.preteritumTranslation || existingWord.preteritumTranslation,
                            preteritumExample: nw.preteritumExample || existingWord.preteritumExample,
                            preteritumExampleTranslation: nw.preteritumExampleTranslation || existingWord.preteritumExampleTranslation,
                            supinium: nw.supinium || existingWord.supinium,
                            supiniumTranslation: nw.supiniumTranslation || existingWord.supiniumTranslation,
                            supiniumExample: nw.supiniumExample || existingWord.supiniumExample,
                            supiniumExampleTranslation: nw.supiniumExampleTranslation || existingWord.supiniumExampleTranslation,
                            original_csv_id: nw.original_csv_id || existingWord.original_csv_id,
                        });
                        updatedCount++;
                    } else {
                        const freshWord: Word = { ...nw, id: crypto.randomUUID() };
                        updatedWords.push(freshWord);
                        existingWordsMap.set(key, freshWord);
                        addedCount++;
                    }
                });

                return updatedWords;
            });

            return { success: true, message: `Import Complete:\n- New words added: ${addedCount}\n- Existing words updated: ${updatedCount}` };
        } catch (error) {
            console.error("Error loading CSV:", error);
            return { success: false, message: "An error occurred during import. Check console for details." };
        }
    }, [setWords]);

    const syncWithDataFolder = useCallback(async (): Promise<{ success: boolean, message: string }> => {
        try {
            // Glob import all CSV files from the ../data directory
            const modules = import.meta.glob('../data/*.csv', { query: '?raw', import: 'default' });
            
            let filesProcessed = 0;
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

            let totalAdded = 0;
            let totalUpdated = 0;

            setWords(prevWords => {
                const existingWordsMap = new Map<string, Word>();
                prevWords.forEach(w => {
                    const key = `${w.source}|${w.subtopic1}|${w.subtopic2}|${w.swedish}`.toLowerCase();
                    existingWordsMap.set(key, w);
                });

                const updatedWords: Word[] = [...prevWords];

                fileContents.forEach(content => {
                    const { newWords } = parseCSVContent(content, new Set());
                    
                    newWords.forEach(nw => {
                        const key = `${nw.source}|${nw.subtopic1}|${nw.subtopic2}|${nw.swedish}`.toLowerCase();
                        if (existingWordsMap.has(key)) {
                            const existingWord = existingWordsMap.get(key)!;
                            Object.assign(existingWord, {
                                wordType: nw.wordType || existingWord.wordType,
                                swedishExample: nw.swedishExample || existingWord.swedishExample,
                                translations: { ...existingWord.translations, ...nw.translations },
                                present: nw.present || existingWord.present,
                                presentTranslation: nw.presentTranslation || existingWord.presentTranslation,
                                presentExample: nw.presentExample || existingWord.presentExample,
                                presentExampleTranslation: nw.presentExampleTranslation || existingWord.presentExampleTranslation,
                                preteritum: nw.preteritum || existingWord.preteritum,
                                preteritumTranslation: nw.preteritumTranslation || existingWord.preteritumTranslation,
                                preteritumExample: nw.preteritumExample || existingWord.preteritumExample,
                                preteritumExampleTranslation: nw.preteritumExampleTranslation || existingWord.preteritumExampleTranslation,
                                supinium: nw.supinium || existingWord.supinium,
                                supiniumTranslation: nw.supiniumTranslation || existingWord.supiniumTranslation,
                                supiniumExample: nw.supiniumExample || existingWord.supiniumExample,
                                supiniumExampleTranslation: nw.supiniumExampleTranslation || existingWord.supiniumExampleTranslation,
                                original_csv_id: nw.original_csv_id || existingWord.original_csv_id,
                                // Merge notes (CSV wins if non-empty)
                                swedishNote: nw.swedishNote || existingWord.swedishNote,
                                presentNote: nw.presentNote || existingWord.presentNote,
                                preteritumNote: nw.preteritumNote || existingWord.preteritumNote,
                                supiniumNote: nw.supiniumNote || existingWord.supiniumNote,
                            });
                            totalUpdated++;
                        } else {
                            const freshWord: Word = { ...nw, id: crypto.randomUUID() };
                            updatedWords.push(freshWord);
                            existingWordsMap.set(key, freshWord);
                            totalAdded++;
                        }
                    });
                });

                return updatedWords;
            });

            return { 
                success: true, 
                message: `Folder Sync Complete:\n- Files processed: ${filesProcessed}\n- New words added: ${totalAdded}\n- Existing words updated/merged: ${totalUpdated}`
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
            const header = ['Source', 'Subtopic1', 'Subtopic2', 'WordType', 'Swedish', 'SwedishExample', ...LANGUAGE_ORDER.flatMap(lang => [`${lang}_Word`, `${lang}_Example`]), 'Present', 'PresentTranslation', 'PresentExample', 'PresentExampleTranslation', 'Preteritum', 'PreteritumTranslation', 'PreteritumExample', 'PreteritumExampleTranslation', 'Supinium', 'SupiniumTranslation', 'SupiniumExample', 'SupiniumExampleTranslation', 'ID', 'SwedishNote', 'PresentNote', 'PreteritumNote', 'SupiniumNote'];
            
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
                
                rowData.push(word.present || '');
                rowData.push(word.presentTranslation || '');
                rowData.push(word.presentExample || '');
                rowData.push(word.presentExampleTranslation || '');
                rowData.push(word.preteritum || '');
                rowData.push(word.preteritumTranslation || '');
                rowData.push(word.preteritumExample || '');
                rowData.push(word.preteritumExampleTranslation || '');
                rowData.push(word.supinium || '');
                rowData.push(word.supiniumTranslation || '');
                rowData.push(word.supiniumExample || '');
                rowData.push(word.supiniumExampleTranslation || '');
                rowData.push(word.original_csv_id || '');
                // Note columns
                rowData.push(word.swedishNote || '');
                rowData.push(word.presentNote || '');
                rowData.push(word.preteritumNote || '');
                rowData.push(word.supiniumNote || '');
                
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
    
    /**
     * Imports words received from a shareable URL.
     * - Skips exact duplicates (same source+subtopic+swedish).
     * - Strips personal SRS/difficulty data — recipients start fresh.
     */
    const importSharedDeck = useCallback((sharedWords: Pick<Word, 'source' | 'subtopic1' | 'subtopic2' | 'wordType' | 'swedish' | 'swedishExample' | 'translations'>[]): { added: number; duplicates: number } => {
        let added = 0;
        let duplicates = 0;
        setWords(prevWords => {
            const existingKeys = new Set(prevWords.map(w =>
                `${w.source}|${w.subtopic1}|${w.subtopic2}|${w.swedish}`.toLowerCase()
            ));
            const newWords: Word[] = [];
            sharedWords.forEach(sw => {
                const key = `${sw.source}|${sw.subtopic1}|${sw.subtopic2}|${sw.swedish}`.toLowerCase();
                if (existingKeys.has(key)) {
                    duplicates++;
                    return;
                }
                existingKeys.add(key);
                newWords.push({
                    ...sw,
                    id: crypto.randomUUID(),
                    active: true,
                    backCount: 0,
                    difficulty: 'unmarked',
                    wordType: sw.wordType || '',
                });
                added++;
            });
            return [...prevWords, ...newWords];
        });
        return { added, duplicates };
    }, [setWords]);

    return {
        words,
        addWord,
        updateWord,
        deleteWord,
        deleteWords,
        toggleWordActive,
        toggleVerbGameActive,
        toggleWordSrsActive,
        toggleWordFlag,
        toggleGroupActive,
        toggleGroupVerbGameActive,
        toggleGroupSrsActive,
        syncActiveToSrs,
        syncSrsToActive,
        importFromCSV,
        importSharedDeck,
        syncWithDataFolder,
        exportToCSV,
        saveWordState,
        loadWordState,
        listWordStates,
        deleteWordState,
    };
};
