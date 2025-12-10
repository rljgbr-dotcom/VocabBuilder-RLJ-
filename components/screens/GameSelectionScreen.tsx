
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSettings } from '../../contexts/SettingsContext';
import { useWords } from '../../contexts/WordsContext';
import { useModal } from '../../contexts/ModalContext';
const GameSelectionScreen: React.FC = () => {
    const [activeOptions, setActiveOptions] = useState<string | null>(null);
    const { currentLanguageInfo, currentSourceLanguage } = useSettings();
    const { words } = useWords();
    const { showModal } = useModal();
    const navigate = useNavigate();

    const handleStartGame = (gameScreen: string, minWords: number) => {
        const activeWords = words.filter(w => w.active && w.translations[currentSourceLanguage]?.word);
        if (activeWords.length < minWords) {
            showModal('info', {
                title: 'Not Enough Words',
                content: `You need at least ${minWords} active words for ${currentLanguageInfo.englishName} to play this game. Activate some words in 'Manage Words'.`
            });
            return;
        }

        if (gameScreen === 'flashcard-game') {
            setActiveOptions(activeOptions === 'flashcard' ? null : 'flashcard');
        } else {
            navigate(`/${gameScreen}`);
        }
    };

    const handleStartFlashcards = (startFace: 'swedish' | 'source') => {
        localStorage.setItem('flashcard_start_face', startFace);
        navigate('/flashcard-game');
    };

    return (
        <div>
            <h2 className="text-3xl font-bold text-center mb-8">Select a Game</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
                <button
                    onClick={() => handleStartGame('flashcard-game', 1)}
                    className="p-6 bg-base-200 rounded-lg shadow-lg hover:bg-base-300 transition-colors"
                >
                    <span className="text-xl font-bold">Flashcards</span>
                </button>
                <button
                    onClick={() => handleStartGame('multiple-choice-game', 4)}
                    className="p-6 bg-base-200 rounded-lg shadow-lg hover:bg-base-300 transition-colors"
                >
                    <span className="text-xl font-bold">Multiple Choice</span>
                </button>
                <button
                    onClick={() => handleStartGame('matching-game', 6)}
                    className="p-6 bg-base-200 rounded-lg shadow-lg hover:bg-base-300 transition-colors"
                >
                    <span className="text-xl font-bold">Matching Game</span>
                </button>
                <button
                    onClick={() => handleStartGame('typing-test-game', 1)}
                    className="p-6 bg-base-200 rounded-lg shadow-lg hover:bg-base-300 transition-colors"
                >
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

export default GameSelectionScreen;
