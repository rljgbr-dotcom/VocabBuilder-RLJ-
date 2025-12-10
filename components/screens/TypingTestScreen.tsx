
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWords } from '../../contexts/WordsContext';
import { useSettings } from '../../contexts/SettingsContext';

const shuffleArray = <T,>(array: T[]): T[] => [...array].sort(() => Math.random() - 0.5);

const TypingTestScreen: React.FC = () => {
    const { words } = useWords();
    const { currentSourceLanguage, currentLanguageInfo } = useSettings();
    const navigate = useNavigate();
    const [deck, setDeck] = useState<any[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [inputValue, setInputValue] = useState('');
    const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
    const [score, setScore] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);

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

    const currentWord = deck[currentIndex];

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
        return <div className="text-center">Loading game...</div>;
    }

    if (currentIndex >= deck.length) {
        return (
            <div className="text-center space-y-4">
                <h2 className="text-2xl font-bold">Game Over!</h2>
                <p className="text-xl">Your score: {score} / {deck.length}</p>
                <button onClick={() => navigate('/game-selection')} className="bg-primary text-primary-content py-2 px-4 rounded-md hover:bg-primary-focus">
                    Play Again
                </button>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-2xl font-bold mb-4">Typing Test</h2>
            <p className="mb-8 text-lg">Score: {score} / {deck.length}</p>

            <div className="bg-base-200 p-8 rounded-lg mb-6">
                <p className="text-sm text-gray-400">Translate the following word to Swedish:</p>
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
                    placeholder="Type your answer"
                />
                {feedback === null ? (
                    <button type="submit" className="mt-4 bg-primary text-primary-content py-3 px-8 rounded-lg font-bold hover:bg-primary-focus">
                        Check
                    </button>
                ) : (
                    <div className="mt-4">
                        {feedback === 'correct' && <p className="text-accent font-bold text-xl">Correct!</p>}
                        {feedback === 'incorrect' && (
                            <div>
                                <p className="text-red-500 font-bold text-xl">Incorrect!</p>
                                <p className="text-gray-400">The correct answer is: <strong className="text-white">{currentWord.swedish}</strong></p>
                            </div>
                        )}
                        <button type="button" onClick={handleNext} className="mt-4 bg-secondary text-secondary-content py-3 px-8 rounded-lg font-bold hover:bg-secondary-focus">
                            Next
                        </button>
                    </div>
                )}
            </form>
        </div>
    );
};

export default TypingTestScreen;
