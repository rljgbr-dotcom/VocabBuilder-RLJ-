export type Screen = 'main-menu' | 'language-select' | 'game-selection' | 'manage-words' | 'flashcard-game' | 'multiple-choice-game' | 'matching-game' | 'typing-test-game' | 'settings' | 'smart-cards-game' | 'srs-stats' | 'verb-game';

export interface Language {
  nativeName: string;
  englishName: string;
  ttsCode: string;
}

export interface Translation {
  word: string;
  example: string;
}

export interface TenseSrsData {
  active?: boolean;
  interval?: number;
  repetition?: number;
  efactor?: number;
  next_review?: string;
  last_reviewed_at?: string;
  last_quality?: number;
  added_at?: string;
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

  // --- Verb Game & Expanded Tense Fields ---
  verb_game_active?: boolean;
  present?: string;
  presentTranslation?: string;
  presentExample?: string;
  presentExampleTranslation?: string;
  preteritum?: string;
  preteritumTranslation?: string;
  preteritumExample?: string;
  preteritumExampleTranslation?: string;
  supinium?: string;
  supiniumTranslation?: string;
  supiniumExample?: string;
  supiniumExampleTranslation?: string;
  original_csv_id?: string;

  // Verb Game Ratings (1-5, 5 is unknown)
  verb_rating_infinitiv?: number;
  verb_rating_present?: number;
  verb_rating_preteritum?: number;
  verb_rating_supinium?: number;

  // SRS data for secondary tenses (infinitiv uses the root srs_* fields)
  srs_present?: TenseSrsData;
  srs_preteritum?: TenseSrsData;
  srs_supinium?: TenseSrsData;
}

export interface FlashcardWord extends Word {
    face: 'swedish' | 'source';
    isBlurredNext: boolean;
}

export interface SrsVirtualCard {
  id: string; // wordId + '|' + tense (e.g. "123-abc|present")
  wordId: string;
  tense: 'infinitiv' | 'present' | 'preteritum' | 'supinium';
  swedish: string; // The tense string
  english: string;
  exampleSv: string;
  exampleEn: string;
  // current SRS state
  srs_interval: number;
  srs_repetition: number;
  srs_efactor: number;
  srs_next_review?: string;
  srs_last_reviewed_at?: string;
  srs_last_quality?: number;
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