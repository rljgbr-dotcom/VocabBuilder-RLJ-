
import React, { useState } from 'react';
import { Screen } from '../../types';
import { useSettings } from '../../contexts/SettingsContext';
import { useWords } from '../../contexts/WordsContext';
import { useModal } from '../../contexts/ModalContext';

interface GameSelectionScreenProps {
    setScreen: (screen: Screen) => void;
}

const GameSelectionScreen: React.FC<GameSelectionScreenProps> = ({ setScreen }) => {
    const [activeOptions, setActiveOptions] = useState<string | null>(null);
    // FIX: Destructure currentSourceLanguage from useSettings to correctly access the language code.
    const { currentLanguageInfo, currentSourceLanguage } = useSettings();
    const { words } = useWords();
    const { showModal } = useModal();

    const handleStartFlashcards = (startFace: 'swedish' | 'source') => {
        // FIX: Use currentSourceLanguage instead of currentLanguageInfo.code, which does not exist on the Language type.
        const activeWords = words.filter(w => w.active && w.translations[currentSourceLanguage] && w.translations[currentSourceLanguage].word);
        if (activeWords.length < 1) {
            showModal('info', {
                title: 'Not Enough Words',
                content: `Not enough active words found for ${currentLanguageInfo.englishName}. Activate some words in 'Manage Words'.`
            });
            return;
        }

        // Pass startFace via props/state management in a real implementation
        // For this structure, we'll store it temporarily and pick it up in the game screen
        localStorage.setItem('flashcard_start_face', startFace);
        setScreen('flashcard-game');
    };

    return (
        <div>
            <h2 className="text-3xl font-bold text-center mb-8">Select a Game</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
                <button
                    onClick={() => setActiveOptions(activeOptions === 'flashcard' ? null : 'flashcard')}
                    className="p-6 bg-base-200 rounded-lg shadow-lg hover:bg-base-300 transition-colors"
                >
                    <span className="text-xl font-bold">Flashcards</span>
                </button>
                <button className="p-6 bg-base-200 rounded-lg shadow-lg transition-colors opacity-50 cursor-not-allowed" disabled>
                    <span className="text-xl font-bold">Multiple Choice</span>
                </button>
                <button className="p-6 bg-base-200 rounded-lg shadow-lg transition-colors opacity-50 cursor-not-allowed" disabled>
                    <span className="text-xl font-bold">Matching Game</span>
                </button>
                <button className="p-6 bg-base-200 rounded-lg shadow-lg transition-colors opacity-50 cursor-not-allowed" disabled>
                    <span className="text-xl font-bold">Typing Test</span>
                </button>
            </div>
            <div className="game-options-container mt-6 max-w-md mx-auto space-y-4">
                {activeOptions === 'flashcard' && (
                    <div className="text-center p-4 bg-base-200 rounded-lg animate-fade-in">
                        <h3 className="font-bold mb-3">Start with which side?</h3>
                        <div className="flex justify-center gap-4">
                            <button onClick={() => handleStartFlashcards('swedish')} className="flex-1 bg-primary text-primary-content py-2 px-4 rounded-md hover:bg-primary-focus">Swedish</button>
                            <button onClick={() => handleStartFlashcards('source')} className="flex-1 bg-secondary text-secondary-content py-2 px-4 rounded-md hover:bg-secondary-focus">{currentLanguageInfo.englishName}</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// FIX: Add default export to resolve import error in App.tsx.
export default GameSelectionScreen;

// Add a simple fade-in animation to tailwind config if possible, or define in index.html if not.
// For now, we will rely on the class name for potential future styling.