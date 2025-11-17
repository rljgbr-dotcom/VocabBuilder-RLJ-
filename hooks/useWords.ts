import { useCallback, useEffect } from 'react';
import { useLocalStorage } from './useLocalStorage';
import { Word } from '../types';
import { LANGUAGE_ORDER } from '../constants';

const parseCSVToWords = (csvText: string): Word[] => {
    const lines = csvText.trim().split('\n');
    const headerLine = lines.shift()?.trim();
    if (!headerLine) {
        return [];
    }
    
    // Remove BOM (Byte Order Mark) if present
    const cleanedHeaderLine = headerLine.replace(/^\uFEFF/, '');

    const expectedHeader = ['source', 'subtopic1', 'subtopic2', 'swedish', 'swedishexample', ...LANGUAGE_ORDER.flatMap(lang => [`${lang}_word`, `${lang}_example`])];
    const header = cleanedHeaderLine.toLowerCase().split(',').map(h => h.trim().replace(/\s/g, ''));
    
    if (header[0] !== 'source' || header[3] !== 'swedish') {
        console.error("Default words CSV has an invalid header.");
        return [];
    }

    const csvRegex = /("([^"]*)"|[^,]*)(?:,|$)/g;
    const newWords: Word[] = [];

    lines.forEach((line) => {
        let values: string[] = [];
        let match;
        csvRegex.lastIndex = 0;
        while ((match = csvRegex.exec(line)) !== null && values.length < expectedHeader.length) {
            values.push((match[2] !== undefined ? match[2] : match[1]).trim());
        }

        if (values.length < 5 || !values[0] || !values[1] || !values[2] || !values[3]) {
            return; // Skip invalid row
        }
        
        const [source, subtopic1, subtopic2, swedish, swedishExample = ''] = values;

        const newWordData: Omit<Word, 'id'> = {
            source, subtopic1, subtopic2, swedish, swedishExample,
            active: true, translations: {}, backCount: 0, difficulty: 'unmarked',
        };

        LANGUAGE_ORDER.forEach((lang, langIndex) => {
            const wordIndex = 5 + (langIndex * 2);
            const exampleIndex = 6 + (langIndex * 2);
            if(values.length > exampleIndex) {
                const sourceWord = values[wordIndex] || '';
                const sourceWordExample = values[exampleIndex] || '';
                if (sourceWord) {
                    newWordData.translations[lang] = { word: sourceWord, example: sourceWordExample };
                }
            }
        });
        
        if (Object.keys(newWordData.translations).length === 0) {
            return; // Skip if no translations found
        }
        
        newWords.push({ ...newWordData, id: crypto.randomUUID() });
    });

    return newWords;
};

export const useWords = () => {
    const [words, setWords] = useLocalStorage<Word[]>('vocabuilder_words', []);

    useEffect(() => {
        const loadDefaultWords = async () => {
            try {
                const response = await fetch('/data/default-words.csv');
                if (!response.ok) {
                    throw new Error(`Failed to fetch default words: ${response.statusText}`);
                }
                const csvText = await response.text();
                const defaultWords = parseCSVToWords(csvText);
                if (defaultWords.length > 0) {
                    setWords(defaultWords);
                }
            } catch (error) {
                console.error("Failed to load or parse default words CSV:", error);
            }
        };
        
        // Only load default words if localStorage is completely empty for this key
        if (localStorage.getItem('vocabuilder_words') === null) {
            loadDefaultWords();
        }
    }, [setWords]);

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

    const clearAllWords = useCallback(() => {
        setWords([]);
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

            const lines = csvText.trim().split('\n');
            const headerLine = lines.shift()?.trim();
            if (!headerLine) {
                return { success: false, message: "CSV file appears to be empty or invalid." };
            }

            const cleanedHeaderLine = headerLine.replace(/^\uFEFF/, '');
            const expectedHeader = ['source', 'subtopic1', 'subtopic2', 'swedish', 'swedishexample', ...LANGUAGE_ORDER.flatMap(lang => [`${lang}_word`, `${lang}_example`])];
            const header = cleanedHeaderLine.toLowerCase().split(',').map(h => h.trim().replace(/\s/g, ''));

            if (JSON.stringify(header) !== JSON.stringify(expectedHeader)) {
                console.error("Expected Header:", expectedHeader);
                console.error("Actual Header:", header);
                return { success: false, message: 'Invalid CSV header. Please check the format guide.' };
            }

            const csvRegex = /("([^"]*)"|[^,]*)(?:,|$)/g;
            let addedCount = 0;
            let duplicateCount = 0;
            let invalidCount = 0;
            const newWords: Word[] = [];

            lines.forEach((line, index) => {
                let values: string[] = [];
                let match;
                csvRegex.lastIndex = 0;
                while ((match = csvRegex.exec(line)) !== null && values.length < expectedHeader.length) {
                    values.push((match[2] !== undefined ? match[2] : match[1]).trim());
                }

                if (values.length < 5 || !values[0] || !values[1] || !values[2] || !values[3]) {
                    invalidCount++;
                    return;
                }
                
                const [source, subtopic1, subtopic2, swedish, swedishExample = ''] = values;
                const key = `${source}|${subtopic1}|${subtopic2}|${swedish}`.toLowerCase();
                if (existingWordKeys.has(key)) {
                    duplicateCount++;
                    return;
                }

                const newWord: Omit<Word, 'id'> = {
                    source, subtopic1, subtopic2, swedish, swedishExample,
                    active: true, translations: {}, backCount: 0, difficulty: 'unmarked',
                };

                LANGUAGE_ORDER.forEach((lang, langIndex) => {
                    const wordIndex = 5 + (langIndex * 2);
                    const exampleIndex = 6 + (langIndex * 2);
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
                newWords.push({ ...newWord, id: crypto.randomUUID() });
                addedCount++;
            });

            setWords(prev => [...prev, ...newWords]);
            return { success: true, message: `Import Complete:\n- New words added: ${addedCount}\n- Duplicates skipped: ${duplicateCount}\n- Invalid rows: ${invalidCount}` };
        } catch (error) {
            console.error("Error loading CSV:", error);
            return { success: false, message: "An error occurred during import. Check console for details." };
        }
    }, [words, setWords]);

    const exportToCSV = useCallback((): { success: boolean, message?: string } => {
        if (!words || words.length === 0) {
            return { success: false, message: "There are no words to export." };
        }

        const escapeCSV = (str: string | null | undefined) => {
            str = String(str ?? '');
            if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
        };

        const header = ['source', 'subtopic1', 'subtopic2', 'swedish', 'swedishexample', ...LANGUAGE_ORDER.flatMap(lang => [`${lang}_word`, `${lang}_example`])];
        const csvRows = [header.join(',')];

        words.forEach(word => {
            const row = [
                escapeCSV(word.source), escapeCSV(word.subtopic1), escapeCSV(word.subtopic2),
                escapeCSV(word.swedish), escapeCSV(word.swedishExample),
            ];
            LANGUAGE_ORDER.forEach(lang => {
                const translation = word.translations[lang] || { word: '', example: '' };
                row.push(escapeCSV(translation.word), escapeCSV(translation.example));
            });
            csvRows.push(row.join(','));
        });

        const csvContent = csvRows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        const date = new Date().toISOString().split('T')[0];
        link.setAttribute('href', url);
        link.setAttribute('download', `vocab_builder_export_${date}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        return { success: true };
    }, [words]);

    const reloadDefaultWords = useCallback(async (): Promise<{ success: boolean, message: string }> => {
        try {
            const response = await fetch('/data/default-words.csv');
            if (!response.ok) {
                throw new Error(`Failed to fetch default words: ${response.statusText}`);
            }
            const csvText = await response.text();
            const result = importFromCSV(csvText);
            if(result.success) {
                return { success: true, message: `Default words reloaded successfully.\n${result.message.replace('Import Complete:', '').trim()}` };
            }
            return result;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error("Error reloading default words:", errorMessage);
            return { success: false, message: `An error occurred while reloading default words: ${errorMessage}` };
        }
    }, [importFromCSV]);

    return {
        words,
        addWord,
        updateWord,
        deleteWord,
        clearAllWords,
        toggleWordActive,
        toggleGroupActive,
        importFromCSV,
        exportToCSV,
        reloadDefaultWords
    };
};