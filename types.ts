
export type Screen = 'main-menu' | 'language-select' | 'game-selection' | 'manage-words' | 'flashcard-game' | 'multiple-choice-game' | 'matching-game' | 'typing-test-game' | 'settings' | 'smart-cards-game' | 'srs-stats';

export interface Language {
  nativeName: string;
  englishName: string;
  ttsCode: string;
}

export interface Translation {
  word: string;
  example: string;
}

export interface Word {
  id: string;
  source: string;
  subtopic1: string;
  subtopic2: string;
  swedish: string;
  swedishExample: string;
  active: boolean;
  translations: { [langCode: string]: Translation };
  backCount: number;
  difficulty: 'easy' | 'medium' | 'hard' | 'unmarked';
  wordType?: string;
  // FIX: Add optional 'isBlurredNext' property to allow persisting the blur state for a word.
  isBlurredNext?: boolean;
  // SRS (SM-2) fields
  srs_active?: boolean;       // Whether this word is in the SRS deck
  srs_interval?: number;      // Days until next review
  srs_repetition?: number;    // Successful recall count
  srs_efactor?: number;       // Easiness factor (default 2.5)
  srs_next_review?: string;   // ISO date string (YYYY-MM-DD)
  srs_last_reviewed_at?: string; // ISO timestamp
  srs_last_quality?: number;     // 0, 3, 4, 5
  srs_added_at?: string;         // ISO timestamp when first added to SRS
  history?: string[];            // Last 3 actions (e.g., "+2", "Hide")
  flagged?: boolean;             // Whether this word is flagged for correction
}

export interface FlashcardWord extends Word {
    face: 'swedish' | 'source';
    isBlurredNext: boolean;
}

export type SwipeDirection = 'up' | 'down' | 'left' | 'right';
export type SwipeAction = 
  | 'none'
  | 'flip'
  | 'readAloud'
  | 'move-1'
  | 'move-2'
  | 'move-3'
  | 'move-4'
  | 'move-5'
  | 'sendToBack'
  | 'reverseAndBack'
  | 'backAndBlur'
  | 'reverseBackAndBlur'
  | 'hide'
  | 'moveToSrs'
  | 'markEasy'
  | 'markMedium'
  | 'markHard';

export interface SwipeSettings {
  up: SwipeAction;
  down: SwipeAction;
  left: SwipeAction;
  right: SwipeAction;
}