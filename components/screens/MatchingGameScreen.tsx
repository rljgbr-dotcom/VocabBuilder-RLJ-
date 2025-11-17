import React, { useState, useEffect, useMemo } from 'react';
import { Screen, Word } from '../../types';
import { useWords } from '../../contexts/WordsContext';
import { useSettings } from '../../contexts/SettingsContext';

const shuffleArray = <T,>(array: T[]): T[] => [...array].sort(() => Math.random() - 0.5);

interface Card {
  id: string;
  wordId: string;
  text: string;
  type: 'swedish' | 'source';
}

const MatchingGameScreen: React.FC<{ setScreen: (screen: Screen) => void }> = ({ setScreen }) => {
    const { words } = useWords();
    const { currentSourceLanguage } = useSettings();
    const [cards, setCards] = useState<Card[]>([]);
    const [selected, setSelected] = useState<Card[]>([]);
    const [matchedIds, setMatchedIds] = useState<string[]>([]);
    const [isChecking, setIsChecking] = useState(false);

    const activeWords = useMemo(() => {
        return words.filter(w => w.active && w.translations[currentSourceLanguage]?.word);
    }, [words, currentSourceLanguage]);

    useEffect(() => {
        if (activeWords.length >= 6) {
            const gameWords = shuffleArray(activeWords).slice(0, 6);
            const gameCards: Card[] = [];
            // FIX: Explicitly type 'word' to 'Word' to resolve 'unknown' type error.
            gameWords.forEach((word: Word) => {
                gameCards.push({ id: `${word.id}-sv`, wordId: word.id, text: word.swedish, type: 'swedish' });
                gameCards.push({ id: `${word.id}-src`, wordId: word.id, text: word.translations[currentSourceLanguage].word, type: 'source' });
            });
            setCards(shuffleArray(gameCards));
            setSelected([]);
            setMatchedIds([]);
        }
    }, [activeWords, currentSourceLanguage]);

    useEffect(() => {
        if (selected.length === 2) {
            setIsChecking(true);
            if (selected[0].wordId === selected[1].wordId) {
                setMatchedIds(prev => [...prev, selected[0].wordId]);
                setSelected([]);
                setIsChecking(false);
            } else {
                setTimeout(() => {
                    setSelected([]);
                    setIsChecking(false);
                }, 1000);
            }
        }
    }, [selected]);

    const handleCardClick = (card: Card) => {
        if (isChecking || selected.includes(card) || matchedIds.includes(card.wordId)) {
            return;
        }
        setSelected(prev => [...prev, card]);
    };

    const isFlipped = (card: Card) => selected.includes(card) || matchedIds.includes(card.wordId);
    
    const allMatched = matchedIds.length === 6;

    if (cards.length === 0) return <div className="text-center">Loading game...</div>;

    if (allMatched) {
         return (
            <div className="text-center space-y-4">
                <h2 className="text-2xl font-bold">You Win!</h2>
                <p className="text-xl">You matched all the pairs.</p>
                <button onClick={() => setScreen('game-selection')} className="bg-primary text-primary-content py-2 px-4 rounded-md hover:bg-primary-focus">
                    Play Again
                </button>
            </div>
        );
    }
    
    return (
        <div className="max-w-3xl mx-auto text-center">
             <h2 className="text-2xl font-bold mb-4">Matching Game</h2>
             <p className="mb-6">Find the matching pairs.</p>
             <div className="grid grid-cols-3 md:grid-cols-4 gap-4">
                {cards.map(card => (
                    <div key={card.id} className="aspect-square" onClick={() => handleCardClick(card)}>
                       <div className={`w-full h-full rounded-lg transition-transform duration-300 ${isFlipped(card) ? '[transform:rotateY(180deg)]' : ''}`} style={{ transformStyle: 'preserve-3d' }}>
                            <div className="absolute w-full h-full bg-primary rounded-lg [backface-visibility:hidden]"></div>
                            <div className={`absolute w-full h-full rounded-lg flex items-center justify-center p-2 text-center font-semibold [transform:rotateY(180deg)] [backface-visibility:hidden] ${matchedIds.includes(card.wordId) ? 'bg-accent text-accent-content' : 'bg-base-300'}`}>
                                {card.text}
                            </div>
                       </div>
                    </div>
                ))}
             </div>
        </div>
    );
};

export default MatchingGameScreen;