import { Word } from '../types';

// We only share the core "vocabulary" fields — not the user's personal SRS
// progress, difficulty ratings, or active state. The recipient imports clean words.
type ShareableWord = Pick<Word,
    'source' | 'subtopic1' | 'subtopic2' | 'wordType' | 'swedish' | 'swedishExample' | 'translations'
>;

const VERSION = 1;

/**
 * Encodes a unicode string to URL-safe base64 (RFC 4648).
 * Uses - instead of +, _ instead of /, and strips = padding.
 * This avoids URLSearchParams treating + as a space and corrupting the data.
 */
function toBase64(str: string): string {
    return btoa(
        encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, p1) =>
            String.fromCharCode(parseInt(p1, 16))
        )
    )
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
}

/**
 * Decodes a URL-safe base64 string produced by toBase64().
 */
function fromBase64(b64: string): string {
    // Restore standard base64 chars and add missing padding
    const standard = b64.replace(/-/g, '+').replace(/_/g, '/');
    const padded = standard + '=='.slice(0, (4 - standard.length % 4) % 4);
    return decodeURIComponent(
        Array.from(atob(padded))
            .map(c => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
            .join('')
    );
}

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
    return toBase64(json);
}

/**
 * Unpacks a URL-safe base64 string back into an array of Word-shaped objects.
 * Returns null if the data is invalid.
 * Handles both the current base64 format AND the legacy btoa(encodeURIComponent(json)) format.
 */
export function unpackDeck(encoded: string): ShareableWord[] | null {
    // Try new format first (toBase64)
    try {
        const json = fromBase64(encoded);
        const parsed = JSON.parse(json);
        if (parsed && Array.isArray(parsed.words)) {
            return parsed.words as ShareableWord[];
        }
    } catch { /* fall through to legacy format */ }

    // Try legacy format: btoa(encodeURIComponent(json))
    // URLSearchParams decodes + as space, so restore it first
    try {
        const fixedEncoded = encoded.replace(/ /g, '+');
        const json = decodeURIComponent(atob(fixedEncoded));
        const parsed = JSON.parse(json);
        if (parsed && Array.isArray(parsed.words)) {
            return parsed.words as ShareableWord[];
        }
    } catch { /* fall through */ }

    // Try treating the encoded string as raw URL-encoded JSON (very old format)
    try {
        const json = decodeURIComponent(encoded);
        const parsed = JSON.parse(json);
        if (parsed && Array.isArray(parsed.words)) {
            return parsed.words as ShareableWord[];
        }
    } catch { /* give up */ }

    return null;
}

/**
 * Builds a shareable URL for the current page with the encoded deck as a query param.
 */
export function buildShareUrl(words: Word[]): string {
    const base = `${window.location.origin}${window.location.pathname}`;
    return `${base}?import=${packDeck(words)}`;
}
