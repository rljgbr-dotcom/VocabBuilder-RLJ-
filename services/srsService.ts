import { Word } from '../types';

export interface SRSResult {
    srs_interval: number;
    srs_repetition: number;
    srs_efactor: number;
    srs_next_review: string;
    srs_last_reviewed_at: string;
    srs_last_quality: number;
}

/** Returns today's date as a YYYY-MM-DD string in local time */
export const todayISO = (): string => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
};

/** Add `days` calendar days to a YYYY-MM-DD string */
const addDays = (isoDate: string, days: number): string => {
    const d = new Date(`${isoDate}T00:00:00`);
    d.setDate(d.getDate() + days);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
};

/**
 * Applies the SM-2 algorithm to a word given a quality score (0–5).
 * Returns the updated SRS fields without mutating the word.
 */
export const applySM2 = (word: Word, q: number): SRSResult => {
    const today = todayISO();

    let interval   = word.srs_interval   ?? 0;
    let repetition = word.srs_repetition ?? 0;
    let efactor    = word.srs_efactor    ?? 2.5;

    // A. Update Easiness Factor
    efactor = efactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
    if (efactor < 1.3) efactor = 1.3;

    // B. Update Repetition & Interval
    if (q < 3) {
        repetition = 0;
        interval = 1;
    } else {
        repetition = repetition + 1;
        if (repetition === 1) {
            interval = 1;
        } else if (repetition === 2) {
            interval = 6;
        } else {
            interval = Math.round(interval * efactor);
        }
    }

    // C. Set next review date
    const srs_next_review = addDays(today, interval);

    return {
        srs_interval: interval,
        srs_repetition: repetition,
        srs_efactor: parseFloat(efactor.toFixed(4)),
        srs_next_review,
        srs_last_reviewed_at: new Date().toISOString(),
        srs_last_quality: q,
    };
};

/**
 * Returns true if a card is due for review today (or is brand new with no date).
 */
export const isDueToday = (word: Word): boolean => {
    if (!word.srs_next_review) return true; // new card → always due
    return word.srs_next_review <= todayISO();
};
