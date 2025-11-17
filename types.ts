
export type Screen = 'main-menu' | 'language-select' | 'game-selection' | 'manage-words' | 'flashcard-game' | 'multiple-choice-game' | 'matching-game' | 'typing-test-game';

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
  // FIX: Add optional 'isBlurredNext' property to allow persisting the blur state for a word.
  isBlurredNext?: boolean;
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
  | 'markEasy'
  | 'markMedium'
  | 'markHard';

export interface SwipeSettings {
  up: SwipeAction;
  down: SwipeAction;
  left: SwipeAction;
  right: SwipeAction;
}