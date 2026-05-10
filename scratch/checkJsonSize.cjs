
const fs = require('fs');
const path = require('path');

// Read CSV
const csvPath = path.join(__dirname, '..', 'data', 'Kelly list edited for Vocab Builder - 1 to 1000+ - default-words.csv');
const csvText = fs.readFileSync(csvPath, 'utf-8');

// Basic mockup of parsing logic from useWords.ts
const lines = csvText.trim().split('\n');
const headerLine = lines.shift().trim();
const delimiter = headerLine.includes(';') ? ';' : ',';
const header = headerLine.split(delimiter).map(c => c.trim().toLowerCase());

const expectedColCount = 47; // From useWords.ts check

const LANGUAGE_ORDER = ['en', 'es', 'fr', 'de', 'it', 'pt', 'ar', 'zh', 'hi', 'ru', 'tr', 'ja'];

const csvRegex = delimiter === ";"
    ? /("([^"]*)"|[^;]*)(?:;|$)/g
    : /("([^"]*)"|[^,]*)(?:,|$)/g;

const words = [];
lines.forEach((line) => {
    let values = [];
    let match;
    csvRegex.lastIndex = 0;
    while ((match = csvRegex.exec(line)) !== null && values.length < expectedColCount) {
        values.push((match[2] !== undefined ? match[2] : match[1]).trim());
    }
    if (values.length < 6 || !values[4]) return;
    
    const [source, subtopic1, subtopic2, wordType, swedish, swedishExample = ''] = values;
    const newWord = {
        id: '12345678-1234-1234-1234-123456789012', // standardized uuid length
        source, subtopic1, subtopic2, wordType: wordType || '', swedish, swedishExample,
        active: true, translations: {}, backCount: 0, difficulty: 'unmarked',
        verb_game_active: false,
        verb_rating_infinitiv: 5,
        verb_rating_present: 5,
        verb_rating_preteritum: 5,
        verb_rating_supinium: 5,
        srs_next_review: '2026-05-10T14:58:29.000Z' // realistic growth
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
    newWord.swedishNote    = values[verbIndex + 13] || '';
    newWord.presentNote    = values[verbIndex + 14] || '';
    newWord.preteritumNote = values[verbIndex + 15] || '';
    newWord.supiniumNote   = values[verbIndex + 16] || '';
    
    words.push(newWord);
});

const jsonString = JSON.stringify(words);
console.log('Total Words:', words.length);
console.log('JSON String Length:', jsonString.length, 'chars');
console.log('JSON String MB:', (jsonString.length / (1024 * 1024)).toFixed(2), 'MB');
