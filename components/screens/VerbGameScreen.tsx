import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Screen, Word, TenseSrsData, SwipeDirection, SwipeAction } from '../../types';
import { useWords } from '../../contexts/WordsContext';
import { useSettings } from '../../contexts/SettingsContext';
import { useTranslation } from '../../hooks/useTranslation';
import { useModal } from '../../contexts/ModalContext';
import { useSwipeSettings } from '../../contexts/SwipeSettingsContext';
import { applySM2, nowISO } from '../../services/srsService';

import { ttsService } from '../../services/ttsService';
import NoteTooltip from '../NoteTooltip';
import UndoButton from '../UndoButton';
import { gradeInput } from '../../utils/stringUtils';

type TenseType = 'infinitiv' | 'present' | 'preteritum' | 'supinium';

interface VirtualCard {
    wordId: string;
    tense: TenseType;
    swedish: string;
    english: string;
    exampleSv: string;
    exampleEn: string;
    rating: number;
    scoreHistory: number[];
    shownCount: number;
    note?: string;
    isBlurredNext?: boolean;
    face?: 'swedish' | 'source';
}

interface VerbGameHistoryState {
    deck: VirtualCard[];
    removedStack: VirtualCard[];
    allActiveWordsPool: VirtualCard[];
    totalActiveWords: number;
    currentIndex: number;
    wordBeforeUpdate: Word;
    actionType: string;
    actionPayload?: any;
    status: 'done' | 'undone';
}

interface VerbGameScreenProps {
    setScreen: (screen: Screen) => void;
}

const VerbGameScreen: React.FC<VerbGameScreenProps> = ({ setScreen }) => {
    const { words, updateWord, toggleWordFlag } = useWords();
    const { currentSourceLanguage, gradingSystem, currentLanguageInfo, typingTarget, disableAnimations } = useSettings();
    const { t } = useTranslation();
    const { showModal, showToast } = useModal();
    const { swipeSettings } = useSwipeSettings();

    const [hasStarted, setHasStarted] = useState(false);
    const [initialStackSize, setInitialStackSize] = useState(10);
    const [startFace, setStartFace] = useState<'swedish' | 'english'>('swedish');
    
    const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set(['1', '2', '3', '4']));
    const [selectedTenses, setSelectedTenses] = useState<Set<TenseType>>(new Set(['infinitiv', 'present', 'preteritum', 'supinium']));
    
    const [deck, setDeck] = useState<VirtualCard[]>([]);
    const [allActiveWordsPool, setAllActiveWordsPool] = useState<VirtualCard[]>([]);
    const [removedStack, setRemovedStack] = useState<VirtualCard[]>([]);
    const [totalActiveWords, setTotalActiveWords] = useState(0);
    
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [isBlurred, setIsBlurred] = useState(false);
    
    const [isTransitioning, setIsTransitioning] = useState(false);
    const [isActionDelayed, setIsActionDelayed] = useState(false);
    
    const [history, setHistory] = useState<VerbGameHistoryState | null>(null);

    // Typing assessment & Voice States
    const [typedAnswer, setTypedAnswer] = useState('');
    const [gradingResult, setGradingResult] = useState<'correct' | 'incorrect' | 'almost' | null>(null);
    const [isListening, setIsListening] = useState(false);
    const recognitionRef = useRef<any>(null);

    const stateRef = useRef({ deck, currentIndex });
    useEffect(() => { stateRef.current = { deck, currentIndex }; }, [deck, currentIndex]);

    // Build the pool of available tenses across all active verbs
    const availablePool = useMemo(() => {
        const pool: VirtualCard[] = [];
        words.forEach(w => {
            if (w.wordType?.toLowerCase() !== 'verb' || !w.verb_game_active) return;
            
            let group = 'unknown';
            const noteMatch = w.swedishNote?.match(/GROUP:\s*([^#\s]+)/i);
            if (noteMatch) {
                const g = noteMatch[1].toLowerCase();
                if (g.startsWith('1')) group = '1';
                else if (g.startsWith('2')) group = '2';
                else if (g.startsWith('3')) group = '3';
                else if (g.startsWith('4')) group = '4';
            }

            if (!selectedGroups.has(group)) return;
            
            const addIfUnpromoted = (tense: TenseType, sv: string, en: string, exSv: string, exEn: string, rating: number, note?: string) => {
                if (!selectedTenses.has(tense)) return;
                
                if (rating > 1 && sv) {
                    const scoreHistory = w[`verb_history_${tense}` as keyof Word] as number[] || [];
                    const shownCount = w[`verb_shown_${tense}` as keyof Word] as number || 0;
                    
                    pool.push({
                        wordId: w.id, tense, swedish: sv, english: en, exampleSv: exSv, exampleEn: exEn, rating, scoreHistory, shownCount, note, face: startFace === 'swedish' ? 'swedish' : 'source'
                    });
                }
            };

            addIfUnpromoted('infinitiv', w.swedish, w.translations['en']?.word || '', w.swedishExample || '', w.translations['en']?.example || '', w.verb_rating_infinitiv ?? 5, w.swedishNote);
            addIfUnpromoted('present', w.present || '', w.presentTranslation || '', w.presentExample || '', w.presentExampleTranslation || '', w.verb_rating_present ?? 5, w.presentNote);
            addIfUnpromoted('preteritum', w.preteritum || '', w.preteritumTranslation || '', w.preteritumExample || '', w.preteritumExampleTranslation || '', w.verb_rating_preteritum ?? 5, w.preteritumNote);
            addIfUnpromoted('supinium', w.supinium || '', w.supiniumTranslation || '', w.supiniumExample || '', w.supiniumExampleTranslation || '', w.verb_rating_supinium ?? 5, w.supiniumNote);
        });
        return pool;
    }, [words, selectedGroups, selectedTenses, startFace]);

    const startGame = useCallback(() => {
        const pool = [...availablePool];
        pool.sort(() => 0.5 - Math.random());
        
        setTotalActiveWords(pool.length);
        const startSize = Math.min(initialStackSize, pool.length);
        
        const initialDeck = pool.slice(0, startSize).map(card => ({...card, shownCount: card.shownCount + 1}));
        setDeck(initialDeck);
        setAllActiveWordsPool(pool.slice(startSize));
        setCurrentIndex(0);
        setRemovedStack([]);
        setIsFlipped(false);
        setHasStarted(true);
        
        // Update shown count for the initial deck in the main word object
        initialDeck.forEach(card => {
            const w = words.find(x => x.id === card.wordId);
            if (w) {
                const shownField = `verb_shown_${card.tense}` as keyof Word;
                updateWord({ ...w, [shownField]: card.shownCount });
            }
        });
    }, [availablePool, initialStackSize, words, updateWord]);

    const handleUndo = useCallback(() => {
        if (!history || history.status !== 'done') return;
        updateWord(history.wordBeforeUpdate);
        setDeck(history.deck);
        setRemovedStack(history.removedStack);
        setAllActiveWordsPool(history.allActiveWordsPool);
        setTotalActiveWords(history.totalActiveWords);
        setCurrentIndex(history.currentIndex);
        setIsFlipped(false);
        setHistory(prev => prev ? { ...prev, status: 'undone' } : null);
    }, [history, updateWord]);

    const delayedAction = (action: () => void) => {
        setIsActionDelayed(true);
        setTimeout(() => {
            action();
        }, 150);
    };

    const recordActionStats = (card: VirtualCard) => {
        const w = words.find(x => x.id === card.wordId);
        if (w) {
            const shownField = `verb_shown_${card.tense}` as keyof Word;
            updateWord({ ...w, [shownField]: card.shownCount + 1 });
        }
        return { ...card, shownCount: card.shownCount + 1 };
    };

    const moveCard = (positions: number) => {
        const { deck: d, currentIndex: idx } = stateRef.current;
        if (d.length < 2 || isTransitioning) return;
        setIsTransitioning(true);

        const currentCard = d[idx];
        const word = words.find(w => w.id === currentCard.wordId);
        setHistory({
            deck: [...d], removedStack: [...removedStack], allActiveWordsPool: [...allActiveWordsPool], totalActiveWords, currentIndex: idx, wordBeforeUpdate: { ...word } as Word, actionType: 'move', actionPayload: { positions }, status: 'done'
        });

        const cardToMove = recordActionStats(currentCard);
        
        setIsFlipped(false);
        const delay = disableAnimations ? 0 : 300;

        setTimeout(() => {
            setDeck(prevDeck => {
                const newDeck = prevDeck.filter((_, i) => i !== idx);
                const newIndex = Math.min(idx + positions, newDeck.length);
                newDeck.splice(newIndex, 0, cardToMove);
                return newDeck;
            });
            if (idx >= d.length - 1) setCurrentIndex(0);
            setTimeout(() => setIsTransitioning(false), delay);
        }, delay);
    };

    const sendToBack = (reverse: boolean = false, blur: boolean = false) => {
        const { deck: d, currentIndex: idx } = stateRef.current;
        if (d.length < 2 || isTransitioning) return;
        setIsTransitioning(true);

        const currentCard = d[idx];
        const word = words.find(w => w.id === currentCard.wordId);
        setHistory({
            deck: [...d], removedStack: [...removedStack], allActiveWordsPool: [...allActiveWordsPool], totalActiveWords, currentIndex: idx, wordBeforeUpdate: { ...word } as Word, actionType: 'back', actionPayload: { reverse, blur }, status: 'done'
        });

        const cardToMove = {
            ...recordActionStats(currentCard),
            face: reverse ? (currentCard.face === 'swedish' ? 'source' : 'swedish') : currentCard.face,
            isBlurredNext: blur,
        } as VirtualCard;

        const wasLastCard = idx === d.length - 1;
        setIsFlipped(false);
        const delay = disableAnimations ? 0 : 300;

        setTimeout(() => {
            setDeck(prevDeck => {
                const newDeck = prevDeck.filter((_, i) => i !== idx);
                newDeck.push(cardToMove);
                return newDeck;
            });
            if (wasLastCard) setCurrentIndex(0);
            setTimeout(() => setIsTransitioning(false), delay);
        }, delay);
    };

    const hideCard = () => {
        const { deck: d, currentIndex: idx } = stateRef.current;
        if (d.length === 0 || isTransitioning) return;
        setIsTransitioning(true);

        const currentCard = d[idx];
        const word = words.find(w => w.id === currentCard.wordId);
        setHistory({
            deck: [...d], removedStack: [...removedStack], allActiveWordsPool: [...allActiveWordsPool], totalActiveWords, currentIndex: idx, wordBeforeUpdate: { ...word } as Word, actionType: 'hide', status: 'done'
        });

        if (word) {
            const ratingField = `verb_rating_${currentCard.tense}` as keyof Word;
            updateWord({ ...word, [ratingField]: 1 }); // Mark as rating 1 so it's not pulled anymore
        }
        setTotalActiveWords(t => t - 1);
        
        setIsFlipped(false);
        const delay = disableAnimations ? 0 : 300;

        setTimeout(() => {
            let newCard = removedStack.pop() || allActiveWordsPool.shift();
            setDeck(prevDeck => {
                const newDeck = [...prevDeck];
                if (newCard) {
                    newDeck[idx] = recordActionStats(newCard);
                    setRemovedStack(rs => rs.slice(0, -1));
                    if(allActiveWordsPool.length > 0) setAllActiveWordsPool(p => p.slice(1));
                } else {
                    newDeck.splice(idx, 1);
                }
                return newDeck;
            });
            if (idx >= d.length - 1 && d.length > 1) setCurrentIndex(0);
            setTimeout(() => setIsTransitioning(false), delay);
        }, delay);
    };
    
    const moveToSrs = () => {
        const { deck: d, currentIndex: idx } = stateRef.current;
        if (d.length === 0 || isTransitioning) return;
        setIsTransitioning(true);

        const currentCard = d[idx];
        const word = words.find(w => w.id === currentCard.wordId);
        setHistory({
            deck: [...d], removedStack: [...removedStack], allActiveWordsPool: [...allActiveWordsPool], totalActiveWords, currentIndex: idx, wordBeforeUpdate: { ...word } as Word, actionType: 'srs', status: 'done'
        });

        if (word) {
            const ratingField = `verb_rating_${currentCard.tense}` as keyof Word;
            const updatedWord = { ...word, [ratingField]: 1 } as Word;

            if (currentCard.tense === 'infinitiv') {
                updatedWord.srs_active = true;
                if (!updatedWord.srs_added_at) updatedWord.srs_added_at = nowISO();
                if (!updatedWord.srs_next_review) {
                    const initialSrs = applySM2(updatedWord, 4);
                    Object.assign(updatedWord, { ...initialSrs, srs_next_review: nowISO() });
                }
            } else {
                const srsField = `srs_${currentCard.tense}` as keyof Word;
                let srsData = updatedWord[srsField] as TenseSrsData;
                if (!srsData) srsData = { active: true, added_at: nowISO() } as TenseSrsData;
                else srsData.active = true;
                
                if (!srsData.next_review) {
                    const mockWord = { ...srsData } as any;
                    const initialSrs = applySM2(mockWord, 4);
                    srsData = { ...srsData, ...initialSrs, next_review: nowISO() };
                }
                updatedWord[srsField] = srsData as any;
            }
            updateWord(updatedWord);
        }

        setTotalActiveWords(t => t - 1);
        setIsFlipped(false);
        const delay = disableAnimations ? 0 : 300;

        setTimeout(() => {
            let newCard = removedStack.pop() || allActiveWordsPool.shift();
            setDeck(prevDeck => {
                const newDeck = [...prevDeck];
                if (newCard) {
                    newDeck[idx] = recordActionStats(newCard);
                    setRemovedStack(rs => rs.slice(0, -1));
                    if(allActiveWordsPool.length > 0) setAllActiveWordsPool(p => p.slice(1));
                } else {
                    newDeck.splice(idx, 1);
                }
                return newDeck;
            });
            if (idx >= d.length - 1 && d.length > 1) setCurrentIndex(0);
            setTimeout(() => setIsTransitioning(false), delay);
        }, delay);
    };

    const handleSetStackSize = (newSize: number) => {
        const clampedSize = Math.max(1, Math.min(newSize, totalActiveWords));
        const currentSize = deck.length;
        const delta = clampedSize - currentSize;
        if (delta === 0) return;

        setIsFlipped(false);

        if (delta > 0) {
            const cardsToAdd: VirtualCard[] = [];
            const tempRemoved = [...removedStack];
            const tempPool = [...allActiveWordsPool];
            for (let i = 0; i < delta; i++) {
                const card = tempRemoved.pop() || tempPool.shift();
                if (card) cardsToAdd.push(card); else break;
            }
            setDeck(d => [...d, ...cardsToAdd]);
            setRemovedStack(tempRemoved);
            setAllActiveWordsPool(tempPool);
            showToast(`Added ${cardsToAdd.length} cards to deck`);
        } else {
            const cardsToRemove = Math.abs(delta);
            const numCardsAfterIndex = deck.length - 1 - currentIndex;
            const removeAfterCount = Math.min(cardsToRemove, numCardsAfterIndex);
            const removeBeforeCount = cardsToRemove - removeAfterCount;

            const cardsToMoveToRemoved: VirtualCard[] = [];
            const cardsToMoveToPool: VirtualCard[] = [];

            const newDeck = [...deck];
            
            if (removeAfterCount > 0) {
                const removedAfter = newDeck.splice(currentIndex + 1, removeAfterCount);
                cardsToMoveToPool.push(...removedAfter);
            }
            if (removeBeforeCount > 0) {
                const removedBefore = newDeck.splice(0, removeBeforeCount);
                cardsToMoveToRemoved.push(...removedBefore);
                setCurrentIndex(prev => prev - removeBeforeCount);
            }

            setDeck(newDeck);
            setRemovedStack(prev => [...prev, ...cardsToMoveToRemoved]);
            setAllActiveWordsPool(prev => [...cardsToMoveToPool, ...prev]);
            showToast(`Removed ${cardsToRemove} cards from deck`);
        }
    };

    const bulkSwitchFace = (face: 'swedish' | 'source') => {
        const updateCards = (cards: VirtualCard[]) => cards.map(c => ({...c, face}));
        setDeck(updateCards);
        setRemovedStack(updateCards);
        setAllActiveWordsPool(updateCards);
        showToast(face === 'swedish' ? 'All cards set to Swedish front' : 'All cards set to English front');
    };

    const bulkSetBlur = (shouldBlur: boolean) => {
        const updateCards = (cards: VirtualCard[]) => cards.map(c => ({...c, isBlurredNext: shouldBlur}));
        setDeck(updateCards);
        setRemovedStack(updateCards);
        setAllActiveWordsPool(updateCards);
        showToast(shouldBlur ? 'All cards blurred' : 'All cards unblurred');
    };

    const handleShuffleDeck = () => {
        const d = [...deck];
        const current = d.splice(currentIndex, 1)[0];
        d.sort(() => 0.5 - Math.random());
        d.splice(0, 0, current);
        setDeck(d);
        setCurrentIndex(0);
        showToast("Deck shuffled (current card kept in place)");
    };

    // Keyboard controls
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (['input', 'textarea'].includes((e.target as HTMLElement).tagName.toLowerCase())) return;
            if (deck.length === 0 || isTransitioning) return;
            
            switch(e.key) {
                case ' ':
                case 'Enter':
                    e.preventDefault();
                    if (!isFlipped) setIsFlipped(true);
                    break;
                case '1': if (isFlipped) delayedAction(() => moveCard(1)); break;
                case '2': if (isFlipped) delayedAction(() => moveCard(2)); break;
                case '3': if (isFlipped) delayedAction(() => moveCard(3)); break;
                case '4': if (isFlipped) delayedAction(() => moveCard(4)); break;
                case '5': if (isFlipped) delayedAction(() => moveCard(5)); break;
                case 's': if (isFlipped) delayedAction(moveToSrs); break;
                case 'h': if (isFlipped) delayedAction(hideCard); break;
                case 'b': if (isFlipped) delayedAction(() => sendToBack()); break;
                case 'z': if (e.ctrlKey) handleUndo(); break;
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [deck.length, isFlipped, isTransitioning, history, handleUndo]);

    // Swipe handlers
    const executeSwipeAction = useCallback((action: SwipeAction) => {
        if (!isFlipped || isTransitioning) return;
        switch(action) {
            case '+1': delayedAction(() => moveCard(1)); break;
            case '+2': delayedAction(() => moveCard(2)); break;
            case '+3': delayedAction(() => moveCard(3)); break;
            case '+4': delayedAction(() => moveCard(4)); break;
            case 'back': delayedAction(() => sendToBack()); break;
            case 'srs': delayedAction(moveToSrs); break;
            case 'hide': delayedAction(hideCard); break;
            case 'none': break;
        }
    }, [isFlipped, isTransitioning, deck, currentIndex]);

    // Touch handlers for swiping
    const touchStartRef = useRef<{x: number, y: number} | null>(null);
    useEffect(() => {
        const handleTouchStart = (e: TouchEvent) => {
            if (!isFlipped || isTransitioning) return;
            touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        };
        
        const handleTouchEnd = (e: TouchEvent) => {
            if (!touchStartRef.current || !isFlipped || isTransitioning) return;
            
            const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
            const dy = e.changedTouches[0].clientY - touchStartRef.current.y;
            const absDx = Math.abs(dx);
            const absDy = Math.abs(dy);
            
            if (Math.max(absDx, absDy) > 50) {
                let direction: SwipeDirection;
                if (absDx > absDy) {
                    direction = dx > 0 ? 'right' : 'left';
                } else {
                    direction = dy > 0 ? 'down' : 'up';
                }
                const action = swipeSettings[direction];
                executeSwipeAction(action);
            }
            touchStartRef.current = null;
        };

        document.addEventListener('touchstart', handleTouchStart);
        document.addEventListener('touchend', handleTouchEnd);
        return () => {
            document.removeEventListener('touchstart', handleTouchStart);
            document.removeEventListener('touchend', handleTouchEnd);
        };
    }, [isFlipped, isTransitioning, executeSwipeAction, swipeSettings]);

    // Initialize Speech Recognition
    useEffect(() => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (SpeechRecognition) {
            const recognition = new SpeechRecognition();
            recognition.continuous = false;
            recognition.interimResults = true;
            recognition.onresult = (event: any) => {
                let interimTranscript = '';
                let finalTranscript = '';
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript;
                    else interimTranscript += event.results[i][0].transcript;
                }
                setTypedAnswer(finalTranscript.trim() || interimTranscript.trim());
            };
            recognition.onend = () => setIsListening(false);
            recognition.onerror = () => setIsListening(false);
            recognitionRef.current = recognition;
        }
    }, []);

    const currentCard = deck[currentIndex];

    useEffect(() => {
        setTypedAnswer('');
        setGradingResult(null);
        if (currentCard) {
            setIsBlurred(currentCard.isBlurredNext || false);
        }
    }, [currentCard?.wordId, currentCard?.tense]);

    if (currentSourceLanguage !== 'en') {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh]">
                <p className="text-xl font-bold text-red-500 mb-4">Unsupported Language</p>
                <p className="text-center text-gray-400 max-w-md">The Verb Game is currently only supported in English. Please switch your active language in the Settings menu.</p>
            </div>
        );
    }

    if (!hasStarted) {
        return (
            <div className="max-w-md mx-auto p-6 bg-base-200 rounded-xl shadow-xl mt-12">
                <h2 className="text-3xl font-bold text-center mb-6 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-500">Verb Game</h2>
                
                <div className="space-y-6">
                    <div>
                        <label className="block text-sm font-bold text-gray-400 mb-2">Initial Stack Size ({initialStackSize})</label>
                        <input 
                            type="range" 
                            min="5" 
                            max="50" 
                            step="5"
                            value={initialStackSize} 
                            onChange={(e) => setInitialStackSize(parseInt(e.target.value))}
                            className="range range-primary" 
                        />
                        <p className="text-xs text-gray-500 mt-1">Number of active tense cards in your deck.</p>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-400 mb-2">Starting Card Face</label>
                        <div className="grid grid-cols-2 gap-2">
                            <button 
                                type="button"
                                onClick={() => setStartFace('swedish')} 
                                className={`py-2 text-sm font-bold rounded-lg border-2 transition-all ${startFace === 'swedish' ? 'bg-blue-600 border-blue-500 text-white' : 'bg-base-300 border-transparent text-gray-300 hover:bg-base-100'}`}
                            >
                                Swedish
                            </button>
                            <button 
                                type="button"
                                onClick={() => setStartFace('english')} 
                                className={`py-2 text-sm font-bold rounded-lg border-2 transition-all ${startFace === 'english' ? 'bg-blue-600 border-blue-500 text-white' : 'bg-base-300 border-transparent text-gray-300 hover:bg-base-100'}`}
                            >
                                English
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-400 mb-2">Verb Groups to Include</label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            {['1', '2', '3', '4'].map(g => (
                                <label key={g} className="flex items-center gap-2 bg-base-300 p-2 rounded-lg cursor-pointer hover:bg-base-100 transition-colors">
                                    <input 
                                        type="checkbox" 
                                        className="checkbox checkbox-primary checkbox-sm"
                                        checked={selectedGroups.has(g)}
                                        onChange={(e) => {
                                            const newSet = new Set(selectedGroups);
                                            if (e.target.checked) newSet.add(g);
                                            else newSet.delete(g);
                                            setSelectedGroups(newSet);
                                        }}
                                    />
                                    <span className="text-sm font-bold text-gray-300 whitespace-nowrap">Group {g}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-400 mb-2">Tenses to Practice</label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            {(['infinitiv', 'present', 'preteritum', 'supinium'] as TenseType[]).map(t => (
                                <label key={t} className="flex items-center gap-2 bg-base-300 p-2 rounded-lg cursor-pointer hover:bg-base-100 transition-colors">
                                    <input 
                                        type="checkbox" 
                                        className="checkbox checkbox-secondary checkbox-sm"
                                        checked={selectedTenses.has(t)}
                                        onChange={(e) => {
                                            const newSet = new Set(selectedTenses);
                                            if (e.target.checked) newSet.add(t);
                                            else newSet.delete(t);
                                            setSelectedTenses(newSet);
                                        }}
                                    />
                                    <span className="text-sm font-bold text-gray-300 capitalize whitespace-nowrap">{t}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <button 
                        onClick={startGame}
                        disabled={selectedGroups.size === 0 || selectedTenses.size === 0 || availablePool.length === 0}
                        className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-xl hover:from-blue-500 hover:to-indigo-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                    >
                        {availablePool.length === 0 ? "No verbs available" : "Start Verb Game"}
                    </button>
                </div>
            </div>
        );
    }

    if (deck.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh]">
                <h2 className="text-3xl font-bold text-green-500 mb-4">Stack Cleared!</h2>
                <p className="text-center text-gray-400 mb-6">You've finished all active tense cards.</p>
                <button onClick={() => setHasStarted(false)} className="px-6 py-2 bg-base-300 rounded-lg hover:bg-base-100 transition-colors">Play Again</button>
            </div>
        );
    }

    const uniqueVerbsCount = new Set(deck.map(c => c.wordId)).size;

    const currentFace = currentCard.face || 'swedish';
    const frontText = currentFace === 'swedish' ? currentCard.swedish : currentCard.english;
    const backText  = currentFace === 'swedish' ? currentCard.english : currentCard.swedish;
    const backLang  = currentFace === 'swedish' ? currentLanguageInfo.ttsCode : 'sv-SE';
    const frontLang = currentFace === 'swedish' ? 'sv-SE' : currentLanguageInfo.ttsCode;

    const backExample = currentFace === 'swedish' ? currentCard.exampleEn : currentCard.exampleSv;
    const targetText = typingTarget === 'word' ? backText : backExample;

    const handleCheckAnswer = (e: React.FormEvent) => {
        e.preventDefault();
        if (isListening) recognitionRef.current?.stop();
        
        if (typedAnswer.trim() && currentCard) {
            const result = gradeInput(typedAnswer, targetText || '', gradingSystem === 'none' ? 'loose' : gradingSystem);
            setGradingResult(result);
        }
        
        if (!isFlipped) setIsFlipped(true);
    };

    const handleToggleListening = () => {
        if (!recognitionRef.current || !currentCard) return;
        if (isListening) {
            recognitionRef.current.stop();
        } else {
            recognitionRef.current.lang = backLang;
            setTypedAnswer('');
            recognitionRef.current.start();
            setIsListening(true);
        }
    };

    return (
        <div className="max-w-2xl mx-auto flex flex-col items-center pb-12">
            {/* Header Stats */}
            <div className="w-full flex justify-between items-center mb-6 px-4 py-3 bg-base-200 rounded-xl shadow-sm border border-base-300">
                <div className="flex flex-col">
                    <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">Stack stats</span>
                    <span className="text-base font-bold text-indigo-300">{deck.length} cards ({uniqueVerbsCount} {uniqueVerbsCount === 1 ? 'verb' : 'verbs'})</span>
                </div>
                <UndoButton 
                    canUndo={history?.status === 'done'} 
                    canRedo={history?.status === 'undone'} 
                    onUndo={handleUndo} 
                    onRedo={() => {}} 
                    className="p-2.5 rounded-xl bg-base-300/80 border border-white/10 text-gray-400 hover:text-white transition-all shadow-sm flex items-center justify-center relative select-none"
                />
                <div className="flex flex-col items-end">
                    <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">Remaining</span>
                    <span className="text-base font-bold text-blue-400">{allActiveWordsPool.length} in pool</span>
                </div>
            </div>

            {/* Flashcard */}
            <div className="w-full aspect-video min-h-[300px] perspective-[1000px] cursor-pointer mb-8 relative"
                onClick={() => {
                    if (isBlurred) setIsBlurred(false);
                    else setIsFlipped(!isFlipped);
                }}
            >
                <div className={`card-inner w-full h-full relative shadow-xl rounded-2xl ${isFlipped ? 'is-flipped' : ''}`}>
                    
                    {/* FRONT */}
                    <div className={`card-face absolute inset-0 bg-gradient-to-br from-indigo-900/40 to-base-300 border border-indigo-500/20 rounded-2xl flex flex-col items-center justify-center p-8 transition-all ${isBlurred ? 'blur-md hover:blur-sm' : ''}`}>
                        <span className="absolute top-4 left-4 px-3 py-1 bg-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-widest rounded-full">
                            {currentCard.tense}
                        </span>
                        <span className="absolute top-4 right-4 px-3 py-1 bg-base-100/50 text-gray-400 text-xs font-bold rounded-full flex gap-2 items-center">
                            <span className="text-gray-500 hidden sm:inline">Views: {currentCard.shownCount}</span>
                            <button 
                                onClick={e => { e.stopPropagation(); toggleWordFlag(currentCard.wordId); }}
                                className={`ml-2 p-1.5 rounded-full transition-colors ${words.find(w => w.id === currentCard.wordId)?.flagged ? 'text-red-500 bg-red-500/20' : 'text-gray-400 hover:bg-base-300'}`}
                                title="Flag word"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill={words.find(w => w.id === currentCard.wordId)?.flagged ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
                                </svg>
                            </button>
                        </span>
                        
                        <h2 className={`text-4xl md:text-5xl font-bold text-center drop-shadow-md mb-4 text-indigo-100 leading-tight ${currentFace === 'swedish' ? 'text-5xl md:text-6xl' : ''}`}>
                            {frontText || '---'}
                        </h2>
                        {(currentFace === 'swedish' ? currentCard.exampleSv : currentCard.exampleEn) && (
                            <p className="text-base italic text-gray-400 text-center max-w-md">
                                {currentFace === 'swedish' ? currentCard.exampleSv : currentCard.exampleEn}
                            </p>
                        )}
                        {!isBlurred && <p className="absolute bottom-4 left-0 right-0 text-sm text-gray-500 animate-pulse text-center">Click to flip</p>}
                    </div>

                    {/* BACK */}
                    <div className="card-face card-back absolute inset-0 bg-gradient-to-br from-indigo-900/40 to-base-300 border border-indigo-500/20 rounded-2xl flex flex-col items-center justify-center p-8 text-center overflow-y-auto">
                        <span className="absolute top-4 left-4 px-3 py-1 bg-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-widest rounded-full">
                            {currentCard.tense}
                        </span>
                        <span className="absolute top-4 right-4 px-3 py-1 bg-base-100/50 text-gray-400 text-xs font-bold rounded-full flex gap-2 items-center">
                            <span className="text-gray-500 hidden sm:inline">Views: {currentCard.shownCount}</span>
                            <button 
                                onClick={e => { e.stopPropagation(); toggleWordFlag(currentCard.wordId); }}
                                className={`ml-2 p-1.5 rounded-full transition-colors ${words.find(w => w.id === currentCard.wordId)?.flagged ? 'text-red-500 bg-red-500/20' : 'text-gray-400 hover:bg-base-300'}`}
                                title="Flag word"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill={words.find(w => w.id === currentCard.wordId)?.flagged ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
                                </svg>
                            </button>
                        </span>
                        
                        <h2 
                            onClick={(e) => { e.stopPropagation(); ttsService.speak(currentCard.swedish, 'sv-SE'); }}
                            className="text-3xl md:text-4xl font-bold mb-1 text-indigo-100 leading-tight cursor-pointer hover:text-indigo-300 transition-colors"
                        >
                            {currentCard.swedish}<NoteTooltip note={currentCard.note} />
                        </h2>
                        <div className="w-16 h-0.5 bg-indigo-500/30 mb-2"></div>
                        <h2 
                            onClick={(e) => { e.stopPropagation(); ttsService.speak(currentCard.english || '', currentLanguageInfo.ttsCode); }}
                            className="text-3xl md:text-4xl font-bold mb-4 text-indigo-200 leading-tight cursor-pointer hover:text-indigo-300 transition-colors"
                        >
                            {currentCard.english || '---'}
                        </h2>
                        
                        {(currentCard.exampleSv || currentCard.exampleEn) && (
                            <div className="bg-base-100/40 p-4 rounded-xl w-full max-w-md border border-white/5 space-y-2">
                                {currentCard.exampleSv && (
                                    <p 
                                        onClick={(e) => { e.stopPropagation(); ttsService.speak(currentCard.exampleSv || '', 'sv-SE'); }}
                                        className="text-lg italic text-gray-300 cursor-pointer hover:text-indigo-300 transition-colors"
                                    >
                                        {currentCard.exampleSv}
                                    </p>
                                )}
                                {currentCard.exampleEn && (
                                    <p 
                                        onClick={(e) => { e.stopPropagation(); ttsService.speak(currentCard.exampleEn || '', currentLanguageInfo.ttsCode); }}
                                        className="text-sm text-gray-500 cursor-pointer hover:text-indigo-300 transition-colors"
                                    >
                                        {currentCard.exampleEn}
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Lower Controls Section */}
            <div className="w-full max-w-xl mx-auto shrink-0 px-4">
                <form onSubmit={handleCheckAnswer} className="relative mb-4">
                    <input 
                        value={typedAnswer} 
                        onChange={e => {
                            setTypedAnswer(e.target.value);
                            setGradingResult(null);
                        }} 
                        type="text" 
                        placeholder={t('game.flashcards.typeAnswer')} 
                        className={`w-full border rounded-2xl p-4 text-center focus:outline-none pr-14 transition-all duration-300 text-lg font-medium
                            ${gradingResult === 'correct' ? 'border-green-500 bg-green-500/10 text-green-400' :
                              gradingResult === 'incorrect' ? 'border-red-500 bg-red-500/10 text-red-400' :
                              gradingResult === 'almost' ? 'border-yellow-500 bg-yellow-500/10 text-yellow-500' :
                              'bg-base-200 border-white/10 text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 shadow-lg'}`} 
                        disabled={isListening}
                    />
                    {recognitionRef.current && (
                        <button 
                            type="button" 
                            onClick={handleToggleListening} 
                            className={`absolute right-3 top-1/2 -translate-y-1/2 p-2.5 rounded-xl transition-colors ${isListening ? 'bg-red-500 text-white animate-pulse' : 'text-gray-400 hover:bg-white/10 hover:text-white'}`} 
                            title="Use Voice Input"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                        </button>
                    )}
                </form>

                <button onClick={() => ttsService.speak(isFlipped ? targetText || '' : frontText || '', isFlipped ? backLang : frontLang)} className="w-full p-3 bg-accent text-accent-content font-bold rounded-lg hover:bg-accent-focus transition-colors flex items-center justify-center gap-2 mb-4 shadow-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.858 12h.001M10 12h.001M14 12h.001" /></svg>
                    <span>{t('game.flashcards.readAloud')}</span>
                </button>

                <div className={`grid grid-cols-7 gap-2 transition-opacity mb-4 ${isActionDelayed ? 'opacity-50 pointer-events-none' : ''}`}>
                    {[1, 2, 3, 4, 5].map(n => (
                        <button key={n} onClick={() => delayedAction(() => moveCard(n))} className="p-2 bg-base-200 border border-white/5 shadow-sm rounded-xl hover:bg-primary hover:text-primary-content font-medium transition-colors">+{n}</button>
                    ))}
                    <button onClick={moveToSrs} className="p-2 bg-base-200 border border-purple-500/30 rounded-xl hover:bg-purple-600 hover:text-white font-bold text-purple-400 flex flex-col items-center justify-center -gap-1 transition-colors" title={t('game.flashcards.moveToSrs')}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                        <span className="text-[10px]">SRS</span>
                    </button>
                    <button onClick={hideCard} className="p-2 bg-base-200 border border-red-500/30 rounded-xl hover:bg-red-600 hover:text-white text-sm font-bold text-red-500 transition-colors">{t('game.flashcards.hide')}</button>
                </div>

                <div className={`w-full grid grid-cols-5 gap-2 transition-opacity ${isActionDelayed ? 'opacity-50 pointer-events-none' : ''}`}>
                    <div className="relative">
                        <button
                            onClick={() => showModal('flashcardBack', {
                                onSendToBack: () => delayedAction(() => sendToBack()),
                                onReverseAndBack: () => delayedAction(() => sendToBack(true)),
                                onBackAndBlur: () => delayedAction(() => sendToBack(false, true)),
                                onReverseBackAndBlur: () => delayedAction(() => sendToBack(true, true)),
                            })}
                            className="w-full h-full flex flex-col items-center justify-center p-2 bg-base-300 rounded-md hover:bg-primary hover:text-primary-content"
                            title="Back Options"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
                            <span className="text-xs mt-1 text-center leading-tight">{t('game.flashcards.back')}</span>
                        </button>
                    </div>
                    <div className="relative">
                        <button
                            onClick={() => showModal('flashcardBulk', {
                                languageName: currentLanguageInfo.englishName,
                                onAllSwedish: () => bulkSwitchFace('swedish'),
                                onAllSource: () => bulkSwitchFace('source'),
                                onAllBlurred: () => bulkSetBlur(true),
                                onAllUnblurred: () => bulkSetBlur(false),
                            })}
                            className="w-full h-full flex flex-col items-center justify-center p-2 bg-base-300 rounded-md hover:bg-primary hover:text-primary-content"
                            title="Bulk Actions"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                            <span className="text-xs mt-1 text-center leading-tight">{t('game.flashcards.changeAll')}</span>
                        </button>
                    </div>
                    <button onClick={() => showModal('swipeSettings')} className="w-full h-full flex flex-col items-center justify-center p-2 bg-base-300 rounded-md hover:bg-primary hover:text-primary-content" title="Swipe Actions">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 18.657l-5.657-5.657 5.657-5.657m-6.343 11.314l-5.657-5.657 5.657-5.657" />
                        </svg>
                        <span className="text-xs mt-1 text-center leading-tight">{t('game.flashcards.swipes')}</span>
                    </button>
                    <button
                        onClick={handleShuffleDeck}
                        className="w-full h-full flex flex-col items-center justify-center p-2 bg-base-300 rounded-md hover:bg-primary hover:text-primary-content"
                        title="Randomise deck order"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4h4l2 4-4 2 2 4h4m4-10h4v4m0 0l-4 4m4-4l-4-4M4 20h4l2-4-4-2 2-4h4" />
                        </svg>
                        <span className="text-xs mt-1 text-center leading-tight">Shuffle</span>
                    </button>
                    <button 
                        onClick={() => showModal('setStackSize', { currentSize: deck.length, maxSize: totalActiveWords, onSet: handleSetStackSize })} 
                        className="w-full h-full flex flex-col items-center justify-center p-2 bg-base-300 rounded-md hover:bg-primary hover:text-primary-content" 
                        title="Set Deck Size"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                        <span className="text-xs mt-1 text-center leading-tight">Stack Size</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default VerbGameScreen;
