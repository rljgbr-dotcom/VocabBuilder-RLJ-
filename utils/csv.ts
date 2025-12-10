import { Word } from '../types';
import { LANGUAGE_ORDER } from '../constants';

// Helper to parse CSV content into word objects
export const parseCSVContent = (csvText: string, existingWordKeys: Set<string>): { newWords: Omit<Word, 'id'>[], duplicateCount: number, invalidCount: number, addedCount: number } => {
    const lines = csvText.trim().split('\n');
    const headerLine = lines.shift()?.trim();
    if (!headerLine) {
        return { newWords: [], duplicateCount: 0, invalidCount: 0, addedCount: 0 };
    }

    const cleanedHeaderLine = headerLine.replace(/^\uFEFF/, '');
    const expectedHeader = ['source', 'subtopic1', 'subtopic2', 'swedish', 'swedishexample', ...LANGUAGE_ORDER.flatMap(lang => [`${lang}_word`, `${lang}_example`])];
    const header = cleanedHeaderLine.toLowerCase().split(',').map(h => h.trim().replace(/\s/g, ''));

    // Basic header validation (loose check to allow for minor whitespace diffs)
    if (JSON.stringify(header) !== JSON.stringify(expectedHeader)) {
        console.error("Header mismatch. Expected:", expectedHeader, "Got:", header);
        return { newWords: [], duplicateCount: 0, invalidCount: lines.length, addedCount: 0 };
    }

    const csvRegex = /("([^"]*)"|[^,]*)(?:,|$)/g;
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

        if (values.length < 5 || !values[0] || !values[1] || !values[2] || !values[3]) {
            invalidCount++;
            return;
        }

        const [source, subtopic1, subtopic2, swedish, swedishExample = ''] = values;
        const key = `${source}|${subtopic1}|${subtopic2}|${swedish}`.toLowerCase();

        // Check duplicates against existing words passed in AND words already processed in this batch
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
        newWords.push(newWord);
        addedCount++;
    });

    return { newWords, duplicateCount, invalidCount, addedCount };
};