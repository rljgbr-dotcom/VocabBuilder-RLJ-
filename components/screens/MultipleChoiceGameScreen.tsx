import React, { useState, useEffect, useMemo } from 'react';
import { Screen, Word } from '../../types';
import { useWords } from '../../contexts/WordsContext';
import { useSettings } from '../../contexts/SettingsContext';

// Helper to shuffle array
const shuffleArray = <T,>(array: T[]): T[] => {
    return [...array].sort(() => Math.random() - 0.5);
};

interface Question {
    word: Word;
    options: string[];
    correctAnswer: string;
}

const MultipleChoiceGameScreen: React.FC<{ setScreen: (screen: Screen) => void }> = ({ setScreen }) => {
    const { words } = useWords();
    const { currentSourceLanguage, currentLanguageInfo } = useSettings();
    const [deck, setDeck] = useState<Question[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [score, setScore] = useState(0);
    const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
    const [isCorrect, setIsCorrect] = useState<boolean | null>(null);

    const activeWords = useMemo(() => {
        return words.filter(w => w.active && w.translations[currentSourceLanguage]?.word);
    }, [words, currentSourceLanguage]);

    useEffect(() => {
        if (activeWords.length >= 4) {
            const shuffledWords = shuffleArray(activeWords);
            // FIX: Explicitly type 'word' and 'w' to resolve 'unknown' type errors.
            const newDeck = shuffledWords.map((word: Word, index, arr) => {
                const correctAnswer = word.translations[currentSourceLanguage].word;
                
                const distractors = arr
                    .filter((w: Word) => w.id !== word.id)
                    .map((w: Word) => w.translations[currentSourceLanguage].word);
                
                const shuffledDistractors = shuffleArray(distractors).slice(0, 3);
                
                const options = shuffleArray([correctAnswer, ...shuffledDistractors]);

                return { word, options, correctAnswer };
            });
            setDeck(newDeck);
            setCurrentIndex(0);
            setScore(0);
            setSelectedAnswer(null);
            setIsCorrect(null);
        }
    }, [activeWords, currentSourceLanguage]);

    const handleAnswer = (answer: string) => {
        if (selectedAnswer) return; // Prevent answering twice

        setSelectedAnswer(answer);
        if (answer === deck[currentIndex].correctAnswer) {
            setScore(s => s + 1);
            setIsCorrect(true);
        } else {
            setIsCorrect(false);
        }
    };

    const handleNext = () => {
        setCurrentIndex(i => i + 1);
        setSelectedAnswer(null);
        setIsCorrect(null);
    };

    if (deck.length === 0) {
        return <div className="text-center">Loading game...</div>;
    }

    if (currentIndex >= deck.length) {
        return (
            <div className="text-center space-y-4">
                <h2 className="text-2xl font-bold">Game Over!</h2>
                <p className="text-xl">Your score: {score} / {deck.length}</p>
                <button onClick={() => setScreen('game-selection')} className="bg-primary text-primary-content py-2 px-4 rounded-md hover:bg-primary-focus">
                    Play Again
                </button>
            </div>
        );
    }
    
    const currentQuestion = deck[currentIndex];

    return (
        <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-2xl font-bold mb-4">Multiple Choice</h2>
            <p className="mb-8 text-lg">Score: {score} / {deck.length}</p>
            
            <div className="bg-base-200 p-8 rounded-lg mb-6">
                <p className="text-3xl font-bold">{currentQuestion.word.swedish}</p>
                <p className="text-gray-400 italic">{currentQuestion.word.swedishExample}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {currentQuestion.options.map(option => {
                    let buttonClass = "p-4 rounded-lg transition-colors bg-base-300 hover:bg-primary hover:text-primary-content";
                    if (selectedAnswer) {
                        if (option === currentQuestion.correctAnswer) {
                            buttonClass = "p-4 rounded-lg bg-accent text-accent-content";
                        } else if (option === selectedAnswer) {
                            buttonClass = "p-4 rounded-lg bg-red-600 text-white";
                        } else {
                             buttonClass = "p-4 rounded-lg bg-base-300 opacity-50";
                        }
                    }
                    return (
                        <button key={option} onClick={() => handleAnswer(option)} disabled={!!selectedAnswer} className={buttonClass}>
                            {option}
                        </button>
                    );
                })}
            </div>

            {selectedAnswer && (
                 <button onClick={handleNext} className="mt-8 bg-secondary text-secondary-content py-3 px-8 rounded-lg font-bold hover:bg-secondary-focus">
                    Next
                </button>
            )}
        </div>
    );
};

export default MultipleChoiceGameScreen;