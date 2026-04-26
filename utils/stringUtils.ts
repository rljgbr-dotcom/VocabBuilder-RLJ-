export type GradingSystem = 'none' | 'absolute' | 'strict' | 'lenient' | 'typo-forgiving';
export type TypingTarget = 'word' | 'example';

/**
 * Calculates the Levenshtein distance between two strings.
 */
export function levenshteinDistance(a: string, b: string): number {
    const matrix = [];

    // Increment along the first column of each row
    for (let i = 0; i <= b.length; i++) {
        matrix[i] = [i];
    }

    // Increment each column in the first row
    for (let j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
    }

    // Fill in the rest of the matrix
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) == a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1, // substitution
                    matrix[i][j - 1] + 1,     // insertion
                    matrix[i - 1][j] + 1      // deletion
                );
            }
        }
    }

    return matrix[b.length][a.length];
}

/**
 * Normalizes a string by converting it to lowercase and removing punctuation/extra spaces.
 */
export function normalizeString(str: string): string {
    return str
        .toLowerCase()
        // Remove common punctuation: period, comma, exclamation, question mark, quotes, parentheses
        .replace(/[.,!?'"()[\]{}]/g, '')
        // Replace multiple spaces with a single space
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Grades the user's input against the target based on the selected grading system.
 * Returns 'correct', 'incorrect', or 'almost'
 */
export function gradeInput(input: string, target: string, system: GradingSystem): 'correct' | 'incorrect' | 'almost' | null {
    if (system === 'none') return null;
    if (!input || !target) return 'incorrect';

    if (system === 'absolute') {
        return input === target ? 'correct' : 'incorrect';
    }

    if (system === 'strict') {
        return input.trim().toLowerCase() === target.trim().toLowerCase() ? 'correct' : 'incorrect';
    }

    const normInput = normalizeString(input);
    const normTarget = normalizeString(target);

    if (system === 'lenient') {
        return normInput === normTarget ? 'correct' : 'incorrect';
    }

    if (system === 'typo-forgiving') {
        if (normInput === normTarget) return 'correct';
        
        const dist = levenshteinDistance(normInput, normTarget);
        // Allow roughly 1 typo per 5 characters, minimum 1 if the string has at least 3 chars
        const allowedTypos = normTarget.length >= 3 ? Math.max(1, Math.floor(normTarget.length / 5)) : 0;
        
        if (dist <= allowedTypos) {
            return 'almost'; // Close enough, but we flag it as 'almost' to show it was forgiving
        }
        return 'incorrect';
    }

    return null;
}
