
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Screen } from '../../types';
import { useWords } from '../../contexts/WordsContext';
import { useSettings } from '../../contexts/SettingsContext';
import { useTranslation } from '../../hooks/useTranslation';

const shuffleArray = <T,>(array: T[]): T[] => [...array].sort(() => Math.random() - 0.5);

const TypingTestScreen: React.FC<{ setScreen: (screen: Screen) => void }> = ({ setScreen }) => {
    const { words, toggleWordFlag } = useWords();
    const { currentSourceLanguage, currentLanguageInfo } = useSettings();
    const [deck, setDeck] = useState<any[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [inputValue, setInputValue] = useState('');
    const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
    const [score, setScore] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const { t } = useTranslation();

    const activeWords = useMemo(() => {
        return words.filter(w => w.active && w.translations[currentSourceLanguage]?.word);
    }, [words, currentSourceLanguage]);

    useEffect(() => {
        if (activeWords.length > 0) {
            setDeck(shuffleArray(activeWords));
            setCurrentIndex(0);
            setScore(0);
            setInputValue('');
            setFeedback(null);
            inputRef.current?.focus();
        }
    }, [activeWords]);

    const currentWord = useMemo(() => {
        const deckWord = deck[currentIndex];
        if (!deckWord) return undefined;
        return words.find(w => w.id === deckWord.id) || deckWord;
    }, [deck, currentIndex, words]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (feedback !== null) return;

        const isCorrect = inputValue.trim().toLowerCase() === currentWord.swedish.toLowerCase();
        setFeedback(isCorrect ? 'correct' : 'incorrect');
        if (isCorrect) {
            setScore(s => s + 1);
        }
    };
    
    const handleNext = () => {
        setCurrentIndex(i => i + 1);
        setInputValue('');
        setFeedback(null);
        setTimeout(() => inputRef.current?.focus(), 0);
    };

    if (deck.length === 0) {
        return <div className="text-center">{t('game.loading')}</div>;
    }

    if (currentIndex >= deck.length) {
        return (
            <div className="text-center space-y-4">
                <h2 className="text-2xl font-bold">{t('game.gameOver')}</h2>
                <p className="text-xl">{t('game.yourScore', { score, total: deck.length })}</p>
                <button onClick={() => setScreen('game-selection')} className="bg-primary text-primary-content py-2 px-4 rounded-md hover:bg-primary-focus">
                    {t('game.playAgain')}
                </button>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-2xl font-bold mb-4">{t('gameSelection.typingTest')}</h2>
            <p className="mb-8 text-lg">{t('game.scoreTotal', { score, total: deck.length })}</p>

            <div className="bg-base-200 p-8 rounded-lg mb-6 relative">
                <button 
                    onClick={() => toggleWordFlag(currentWord.id)}
                    className={`absolute top-2 right-2 p-2 rounded-full transition-colors ${currentWord.flagged ? 'text-red-500 bg-red-500/10' : 'text-gray-400 hover:bg-base-300'}`}
                    title="Flag translation"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill={currentWord.flagged ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
                    </svg>
                </button>
                <p className="text-sm text-gray-400">{t('game.typing.instruction')}</p>
                <p className="text-3xl font-bold">{currentWord.translations[currentSourceLanguage].word}</p>
            </div>

            <form onSubmit={handleSubmit}>
                <input
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    disabled={feedback !== null}
                    className="w-full text-center text-2xl p-4 rounded-lg bg-base-300 border-2 border-transparent focus:border-primary focus:outline-none"
                    placeholder={t('game.typing.placeholder')}
                />
                {feedback === null ? (
                    <button type="submit" className="mt-4 bg-primary text-primary-content py-3 px-8 rounded-lg font-bold hover:bg-primary-focus">
                        {t('game.check')}
                    </button>
                ) : (
                    <div className="mt-4">
                        {feedback === 'correct' && <p className="text-accent font-bold text-xl">{t('game.typing.correct')}</p>}
                        {feedback === 'incorrect' && (
                            <div>
                                <p className="text-red-500 font-bold text-xl">{t('game.typing.incorrect')}</p>
                                <p className="text-gray-400">{t('game.typing.correctAnswerIs')} <strong className="text-white">{currentWord.swedish}</strong></p>
                            </div>
                        )}
                        <button type="button" onClick={handleNext} className="mt-4 bg-secondary text-secondary-content py-3 px-8 rounded-lg font-bold hover:bg-secondary-focus">
                            {t('game.next')}
                        </button>
                    </div>
                )}
            </form>
        </div>
    );
};

export default TypingTestScreen;
