import { Word } from '../types';

// We only share the core "vocabulary" fields — not the user's personal SRS
// progress, difficulty ratings, or active state. The recipient imports clean words.
type ShareableWord = Pick<Word,
    'source' | 'subtopic1' | 'subtopic2' | 'wordType' | 'swedish' | 'swedishExample' | 'translations'
>;

const VERSION = 1;

/**
 * Packs an array of words into a URL-safe base64 string.
 * Format: base64(JSON({ v, words }))
 */
export function packDeck(words: Word[]): string {
    const payload: ShareableWord[] = words.map(w => ({
        source: w.source,
        subtopic1: w.subtopic1,
        subtopic2: w.subtopic2,
        wordType: w.wordType || '',
        swedish: w.swedish,
        swedishExample: w.swedishExample || '',
        translations: w.translations,
    }));
    const json = JSON.stringify({ v: VERSION, words: payload });
    // btoa handles ASCII — we need to handle Unicode chars in vocabulary safely
    return btoa(encodeURIComponent(json));
}

/**
 * Unpacks a URL-safe base64 string back into an array of Word-shaped objects.
 * Returns null if the data is invalid.
 */
export function unpackDeck(encoded: string): ShareableWord[] | null {
    try {
        const json = decodeURIComponent(atob(encoded));
        const parsed = JSON.parse(json);
        if (!parsed || !Array.isArray(parsed.words)) return null;
        return parsed.words as ShareableWord[];
    } catch {
        return null;
    }
}

/**
 * Builds a shareable URL for the current page with the encoded deck as a query param.
 */
export function buildShareUrl(words: Word[]): string {
    const base = `${window.location.origin}${window.location.pathname}`;
    return `${base}?import=${packDeck(words)}`;
}
