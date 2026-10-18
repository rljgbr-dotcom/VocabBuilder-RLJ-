export type Screen = 'main-menu' | 'language-select' | 'game-selection' | 'manage-words' | 'flashcard-game' | 'multiple-choice-game' | 'matching-game' | 'typing-test-game' | 'settings' | 'smart-cards-game' | 'srs-stats' | 'verb-game' | 'reading-library' | 'reading-lab';

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

  // Verb Game Score History and shownCount
  verb_history_infinitiv?: number[];
  verb_shown_infinitiv?: number;
  verb_history_present?: number[];
  verb_shown_present?: number;
  verb_history_preteritum?: number[];
  verb_shown_preteritum?: number;
  verb_history_supinium?: number[];
  verb_shown_supinium?: number;

  // Per-word usage notes (shown via ⓘ icon in games next to the word)
  swedishNote?: string;
  presentNote?: string;
  preteritumNote?: string;
  supiniumNote?: string;

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
  note?: string;     // Usage note for this tense's example sentence
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

export interface ProcessedWord {
  swedish: string;
  literal: string;
  idiomatic: string;
  dependencies: string[]; // List of other words in the sentence that change its meaning
}

export interface ProcessedSentence {
  swedish: string;
  literal: string;
  idiomatic: string;
  words: ProcessedWord[];
}

export interface ProcessedPassage {
  sentences: ProcessedSentence[];
}

export interface ReadingPassage {
  id: string;
  title: string;
  content: string; // The raw text
  dateAdded: string; // ISO string
  sourceFileId?: string; // ID in IndexedDB if from image/pdf
  processedData?: ProcessedPassage; // JSON from Gemini
}

export interface BookChapter {
  id: string;
  bookId: string;
  chapterNumber: number;
  title: string;
  content: string; // The raw text of the chapter
  dateAdded: string; // ISO string
  completed?: boolean;
  scrollProgress?: number; // 0 - 100 percentage
  savedScrollTop?: number; // pixel scroll offset
}

export interface Book {
  id: string;
  title: string;
  author?: string;
  description?: string;
  coverColor?: string; // e.g. 'indigo' | 'emerald' | 'amber' | 'purple' | 'rose' | 'sky'
  dateAdded: string;
  lastReadChapterId?: string;
  chapters: BookChapter[];
}

export interface AnalyzedWordContext {
  targetWord: string;
  baseForm: string; // dictionary / lemma form (e.g. infinitiv or indefinite singular)
  wordType?: string; // verb, noun, adjective, adverb, preposition, etc.
  literalMeaning: string;
  contextMeaning: string; // idiomatic meaning in this sentence
  sentenceSwedish: string;
  sentenceTranslation: string;
  dependencies: string[]; // related words in the sentence that change meaning (e.g. particle in phrasal verb)
  grammarNotes?: string; // helpful grammatical explanation
  isAi?: boolean; // true if from Gemini AI, false if non-AI/dictionary
  isLibrary?: boolean; // true if already in user's library deck
  libraryWordId?: string; // ID of the word in user library
  isArchaic?: boolean; // true if Old / Archaic Swedish (Gammalsvenska)
  modernEquivalent?: string; // Modern Swedish equivalent
  archaicNote?: string; // Historical usage notes & guidance
}

