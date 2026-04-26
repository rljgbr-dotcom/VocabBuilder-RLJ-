import React, { useState, useEffect, useMemo } from 'react';
import { Screen, Word } from '../../types';
import { useWords } from '../../contexts/WordsContext';
import { useSettings } from '../../contexts/SettingsContext';
import { useTranslation } from '../../hooks/useTranslation';

const shuffleArray = <T,>(array: T[]): T[] => [...array].sort(() => Math.random() - 0.5);

interface Card {
  id: string;
  wordId: string;
  text: string;
  type: 'swedish' | 'source';
}

interface MatchingGameScreenProps {
    setScreen: (screen: Screen) => void;
    overrideWords?: Word[];
    onComplete?: () => void;
}

const MatchingGameScreen: React.FC<MatchingGameScreenProps> = ({ setScreen, overrideWords, onComplete }) => {
    const { words, toggleWordFlag } = useWords();
    const { currentSourceLanguage } = useSettings();
    const [cards, setCards] = useState<Card[]>([]);
    const [selected, setSelected] = useState<Card[]>([]);
    const [matchedIds, setMatchedIds] = useState<string[]>([]);
    const [isChecking, setIsChecking] = useState(false);
    const { t } = useTranslation();

    const activeWords = useMemo(() => {
        return words.filter(w => w.active && w.translations[currentSourceLanguage]?.word);
    }, [words, currentSourceLanguage]);

    useEffect(() => {
        const pool = overrideWords && overrideWords.length > 0 ? overrideWords : activeWords;
        const targetCount = overrideWords ? overrideWords.length : 6;
        
        if (pool.length >= targetCount && targetCount > 0) {
            const gameWords = overrideWords ? pool : shuffleArray(pool).slice(0, 6);
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
    
    const targetMatchCount = overrideWords ? overrideWords.length : 6;
    const allMatched = matchedIds.length === targetMatchCount && targetMatchCount > 0;

    if (cards.length === 0) return <div className="text-center">{t('game.loading')}</div>;

    if (allMatched) {
         return (
            <div className="text-center space-y-4">
                <h2 className="text-2xl font-bold">{t('game.matching.youWin')}</h2>
                <p className="text-xl">{t('game.matching.matchedAll')}</p>
                {onComplete ? (
                    <button onClick={onComplete} className="bg-primary text-primary-content py-2 px-6 font-bold rounded-lg hover:bg-primary-focus transition-all shadow-md mt-4 animate-bounce-subtle">
                        Continue Flashcards →
                    </button>
                ) : (
                    <button onClick={() => setScreen('game-selection')} className="bg-primary text-primary-content py-2 px-4 rounded-md hover:bg-primary-focus">
                        {t('game.playAgain')}
                    </button>
                )}
            </div>
        );
    }
    
    return (
        <div className="max-w-3xl mx-auto text-center">
             <h2 className="text-2xl font-bold mb-4">{t('gameSelection.matchingGame')}</h2>
             <p className="mb-6">{t('game.matching.findPairs')}</p>
             <div className="grid grid-cols-3 md:grid-cols-4 gap-4">
                {cards.map(card => (
                    <div key={card.id} className="aspect-square" onClick={() => handleCardClick(card)}>
                       <div className={`w-full h-full rounded-lg transition-transform duration-300 ${isFlipped(card) ? '[transform:rotateY(180deg)]' : ''}`} style={{ transformStyle: 'preserve-3d' }}>
                            <div className="absolute w-full h-full bg-primary rounded-lg [backface-visibility:hidden]"></div>
                            <div className={`absolute w-full h-full rounded-lg flex items-center justify-center p-2 text-center font-semibold [transform:rotateY(180deg)] [backface-visibility:hidden] ${matchedIds.includes(card.wordId) ? 'bg-accent text-accent-content' : 'bg-base-300'} relative`}>
                                {card.text}
                                <button 
                                    onClick={(e) => { e.stopPropagation(); toggleWordFlag(card.wordId); }}
                                    className={`absolute top-1 right-1 p-1 rounded-full transition-colors ${words.find(w => w.id === card.wordId)?.flagged ? 'text-red-500 bg-red-500/10' : 'text-gray-400 hover:bg-base-200'}`}
                                    title="Flag translation"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill={words.find(w => w.id === card.wordId)?.flagged ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
                                    </svg>
                                </button>
                            </div>
                       </div>
                    </div>
                ))}
             </div>
        </div>
    );
};

export default MatchingGameScreen;