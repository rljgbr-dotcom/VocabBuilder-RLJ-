import { Word } from '../types';

export interface SRSResult {
    srs_interval: number;
    srs_repetition: number;
    srs_efactor: number;
    srs_next_review: string;
    srs_last_reviewed_at: string;
    srs_last_quality: number;
}

/** Returns the current time as an ISO string */
export const nowISO = (): string => new Date().toISOString();

/** Add seconds to an ISO timestamp */
const addSeconds = (isoDate: string, seconds: number): string => {
    const d = new Date(isoDate);
    d.setSeconds(d.getSeconds() + seconds);
    return d.toISOString();
};

/** Add days to an ISO timestamp */
const addDays = (isoDate: string, days: number): string => {
    const d = new Date(isoDate);
    d.setDate(d.getDate() + days);
    return d.toISOString();
};

/**
 * Applies the SM-2 algorithm to a word given a quality score (0–5).
 * Returns the updated SRS fields without mutating the word.
 */
export const applySM2 = (word: Word, q: number): SRSResult => {
    const now = nowISO();

    let interval   = word.srs_interval   ?? 0;
    let repetition = word.srs_repetition ?? 0;
    let efactor    = word.srs_efactor    ?? 2.5;

    // A. Update Easiness Factor
    efactor = efactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
    if (efactor < 1.3) efactor = 1.3;

    let nextReview: string;

    // B. Update Repetition & Interval
    if (q < 3) {
        // FAIL: Score < 3 resets repetition chain.
        // User requested 30s for failed cards.
        repetition = 0;
        interval = 0; // represent sub-day interval as 0
        nextReview = addSeconds(now, 30);
    } else {
        // SUCCESS
        repetition = repetition + 1;
        
        if (repetition === 1) {
            // Better differentiation for the very first review
            // Hard (3) -> 1d, Good (4) -> 3d, Easy (5) -> 5d
            interval = q === 3 ? 1 : q === 4 ? 3 : 5;
        } else if (repetition === 2) {
            // Second review intervals
            // Hard (3) -> 4d, Good (4) -> 7d, Easy (5) -> 10d
            interval = q === 3 ? 4 : q === 4 ? 7 : 10;
        } else {
            // Standard SM-2 for subsequent reviews, but scaled by quality
            const qualityScale = q === 3 ? 0.8 : q === 4 ? 1.0 : 1.3;
            interval = Math.round(interval * efactor * qualityScale);
        }
        
        // Ensure interval doesn't get stuck or go backwards for successful ratings
        if (interval < 1) interval = 1;
        
        nextReview = addDays(now, interval);
    }

    return {
        srs_interval: interval,
        srs_repetition: repetition,
        srs_efactor: parseFloat(efactor.toFixed(4)),
        srs_next_review: nextReview,
        srs_last_reviewed_at: now,
        srs_last_quality: q,
    };
};

/**
 * Returns true if a card is due for review now.
 */
export const isDueToday = (word: Word): boolean => {
    if (!word.srs_next_review) return true; // new card → always due
    return new Date(word.srs_next_review) <= new Date();
};
