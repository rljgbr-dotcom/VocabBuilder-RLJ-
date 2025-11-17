
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useWords } from '../../contexts/WordsContext';
import { useSettings } from '../../contexts/SettingsContext';
import { useModal } from '../../contexts/ModalContext';
import { FlashcardWord, Word, SwipeDirection, SwipeAction } from '../../types';
import { ttsService } from '../../services/ttsService';
import { Screen } from '../../App';
import { useSwipeSettings } from '../../contexts/SwipeSettingsContext';

type Difficulty = 'unmarked' | 'easy' | 'medium' | 'hard';
const difficultyLevels: Difficulty[] = ['unmarked', 'easy', 'medium', 'hard'];

const difficultyColors: Record<Difficulty, string> = {
    unmarked: 'bg-gray-500',
    easy: 'bg-green-500',
    medium: 'bg-yellow-500',
    hard: 'bg-red-600',
};

const PopupMenu: React.FC<{
    children: React.ReactNode;
    onClose: () => void;
}> = ({ children, onClose }) => {
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [onClose]);

    return (
        <div ref={menuRef} className="absolute bottom-full mb-2 w-full bg-base-300 rounded-lg shadow-xl z-20 p-2 space-y-1">
            {children}
        </div>
    );
};

// FIX: Define the props interface for FlashcardGameScreen.
interface FlashcardGameScreenProps {
    setScreen: (screen: Screen) => void;
}

const FlashcardGameScreen: React.FC<FlashcardGameScreenProps> = ({ setScreen }) => {
    const { words, updateWord } = useWords();
    const { currentLanguageInfo, currentSourceLanguage } = useSettings();
    const { showModal, isModalOpen } = useModal();
    const { swipeSettings } = useSwipeSettings();
    const touchStartRef = useRef<{ x: number; y: number } | null>(null);
    
    const [deck, setDeck] = useState<FlashcardWord[]>([]);
    const [removedStack, setRemovedStack] = useState<FlashcardWord[]>([]);
    const [allActiveWordsPool, setAllActiveWordsPool] = useState<FlashcardWord[]>([]);
    const [totalActiveWords, setTotalActiveWords] = useState(0);

    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [isBlurred, setIsBlurred] = useState(false);
    const [lastHiddenWord, setLastHiddenWord] = useState<FlashcardWord | null>(null);
    const [selfAssessment, setSelfAssessment] = useState('');
    const [isListening, setIsListening] = useState(false);
    const recognitionRef = useRef<any>(null);

    const [isActionDelayed, setIsActionDelayed] = useState(false);
    const [sessionCompleted, setSessionCompleted] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    
    const [difficultyFilters, setDifficultyFilters] = useState<Difficulty[]>(['unmarked', 'easy', 'medium', 'hard']);
    const [activeMenu, setActiveMenu] = useState<string | null>(null);

    const stateRef = useRef({ deck, currentIndex });
    useEffect(() => {
        stateRef.current = { deck, currentIndex };
    }, [deck, currentIndex]);

    const currentWord = useMemo(() => deck[currentIndex], [deck, currentIndex]);

    const showToast = useCallback((message: string) => {
        setToastMessage(message);
        setTimeout(() => {
            setToastMessage('');
        }, 3000);
    }, []);

    const initializeGame = useCallback(() => {
        const startFace = (localStorage.getItem('flashcard_start_face') as 'swedish' | 'source') || 'swedish';
        const filteredWords = words
            .filter(w => w.active && w.translations[currentSourceLanguage]?.word && difficultyFilters.includes(w.difficulty || 'unmarked'))
            .map((w): FlashcardWord => ({ ...w, face: startFace, isBlurredNext: w.isBlurredNext || false }));

        setTotalActiveWords(filteredWords.length);
        
        if (filteredWords.length === 0) {
            setDeck([]);
            return;
        }

        const initialDeckSize = Math.min(10, filteredWords.length);
        setDeck(filteredWords.slice(0, initialDeckSize));
        setAllActiveWordsPool(filteredWords.slice(initialDeckSize));
        setCurrentIndex(0);
        setRemovedStack([]);
        setIsFlipped(false);
        setLastHiddenWord(null);
        setSessionCompleted(false);
    }, [words, currentSourceLanguage, difficultyFilters]);

    const initializeGameRef = useRef(initializeGame);
    initializeGameRef.current = initializeGame;

    useEffect(() => {
        initializeGameRef.current();
    }, [currentSourceLanguage, difficultyFilters]);
    
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
                    if (event.results[i].isFinal) {
                        finalTranscript += event.results[i][0].transcript;
                    } else {
                        interimTranscript += event.results[i][0].transcript;
                    }
                }
                setSelfAssessment(finalTranscript.trim() || interimTranscript.trim());
            };
            recognition.onend = () => setIsListening(false);
            recognition.onerror = (event: any) => {
                console.error('Speech recognition error:', event.error);
                setIsListening(false);
            };
            recognitionRef.current = recognition;
        }
    }, []);

    useEffect(() => {
        if (!currentWord) {
            if (deck.length === 0 && totalActiveWords > 0) {
                setSessionCompleted(true);
            }
            return;
        }
        setIsFlipped(false);
        setIsActionDelayed(false);
        setActiveMenu(null);
        if (currentWord.isBlurredNext) {
            setIsBlurred(true);
        } else {
            setIsBlurred(false);
        }
    }, [currentWord, deck.length, totalActiveWords]);

    const handleFlip = () => {
        if (isBlurred) {
            setIsBlurred(false);
            if (currentWord?.isBlurredNext) {
                const updatedWord = { ...currentWord, isBlurredNext: false };
                updateWord(updatedWord);
                setDeck(d => {
                    const newDeck = [...d];
                    if (newDeck[currentIndex]?.id === updatedWord.id) {
                        newDeck[currentIndex] = updatedWord;
                    }
                    return newDeck;
                });
            }
            return;
        }
        setIsFlipped(!isFlipped);
    };
    
    const delayedAction = (actionFn: () => void) => {
        if (isActionDelayed) return;
        if (isFlipped) {
            actionFn();
            return;
        }
        setIsActionDelayed(true);
        if (isBlurred) {
            handleFlip();
            setTimeout(() => {
                setIsFlipped(true);
                setTimeout(actionFn, 2000);
            }, 2000);
        } else {
            setIsFlipped(true);
            setTimeout(actionFn, 2000);
        }
    };

    const moveCard = (positions: number) => {
        const { deck, currentIndex } = stateRef.current;
        if (deck.length < 2) return;
        const cardToMove = deck[currentIndex];
        const newDeck = deck.filter((_, i) => i !== currentIndex);
        const newIndex = Math.min(currentIndex + positions, newDeck.length);
        newDeck.splice(newIndex, 0, cardToMove);
        setIsFlipped(false);
        setDeck(newDeck);
        if (currentIndex >= newDeck.length) {
            setCurrentIndex(0);
        }
    };
    
    const sendToBack = (reverse: boolean = false, blur: boolean = false) => {
        const { deck, currentIndex } = stateRef.current;
        if (deck.length < 2) return;
        const cardToMove = {
            ...deck[currentIndex],
            backCount: (deck[currentIndex].backCount || 0) + 1,
            face: reverse ? (deck[currentIndex].face === 'swedish' ? 'source' : 'swedish') : deck[currentIndex].face,
            isBlurredNext: blur,
        };
        updateWord(cardToMove);
        const wasLastCard = currentIndex === deck.length - 1;
        const newDeck = deck.filter((_, i) => i !== currentIndex);
        newDeck.push(cardToMove);
        setIsFlipped(false);
        setDeck(newDeck);
        if (wasLastCard) setCurrentIndex(0);
    };

    const hideCard = () => {
        if(!currentWord) return;
        const wordToHide = {...currentWord, active: false};
        updateWord(wordToHide);
        setLastHiddenWord(currentWord);
        setTotalActiveWords(t => t - 1);
        let newCard = removedStack.pop() || allActiveWordsPool.shift();
        const newDeck = [...deck];
        if (newCard) {
            newDeck[currentIndex] = newCard;
            setRemovedStack(rs => rs.slice(0, -1));
            if(allActiveWordsPool.length > 0) setAllActiveWordsPool(p => p.slice(1));
        } else {
            newDeck.splice(currentIndex, 1);
        }
        setIsFlipped(false);
        if (currentIndex >= newDeck.length && newDeck.length > 0) setCurrentIndex(0);
        setDeck(newDeck);
    };

    const handleSelfAssessment = (e: React.FormEvent) => {
        e.preventDefault();
        if (isListening) recognitionRef.current?.stop();
        if (selfAssessment === '..') delayedAction(() => sendToBack());
        else handleFlip();
        setSelfAssessment('');
    };
    
    const handleToggleListening = () => {
        if (!recognitionRef.current || !currentWord) return;
        if (isListening) {
            recognitionRef.current.stop();
        } else {
            const cardFace = currentWord.face;
            const answerLang = cardFace === 'swedish' ? currentLanguageInfo.ttsCode : 'sv-SE';
            recognitionRef.current.lang = answerLang;
            setSelfAssessment('');
            recognitionRef.current.start();
            setIsListening(true);
        }
    };

    const bulkSwitchFace = (face: 'swedish' | 'source') => {
        const updateFace = (w: FlashcardWord): FlashcardWord => ({ ...w, face });
        setDeck(d => d.map(updateFace));
        setRemovedStack(rs => rs.map(updateFace));
        setAllActiveWordsPool(p => p.map(updateFace));
        showToast(`Switched all cards to show ${face === 'swedish' ? 'Swedish' : currentLanguageInfo.englishName} first.`);
    };

    const bulkSetBlur = (shouldBlur: boolean) => {
        const updateAndPersist = (wordsList: FlashcardWord[]) => {
            return wordsList.map(w => {
                const updatedWord = { ...w, isBlurredNext: shouldBlur };
                updateWord(updatedWord);
                return updatedWord;
            });
        };
        setDeck(updateAndPersist);
        setRemovedStack(updateAndPersist);
        setAllActiveWordsPool(updateAndPersist);
        showToast(shouldBlur ? 'Set all cards to be blurred on next view.' : 'Set all cards to be unblurred.');
    };
    
    const handleSetStackSize = (newSize: number) => {
        const clampedSize = Math.max(1, Math.min(newSize, totalActiveWords));
        const currentSize = deck.length;
        const delta = clampedSize - currentSize;
        if (delta === 0) return;

        setIsFlipped(false);

        if (delta > 0) {
            const cardsToAdd: FlashcardWord[] = [];
            const tempRemoved = [...removedStack];
            const tempPool = [...allActiveWordsPool];
            for (let i = 0; i < delta; i++) {
                const card = tempRemoved.pop() || tempPool.shift();
                if (card) cardsToAdd.push(card); else break;
            }
            setDeck(d => [...d, ...cardsToAdd]);
            setRemovedStack(tempRemoved);
            setAllActiveWordsPool(tempPool);
        } else {
            const numToRemove = Math.abs(delta);
            const tempDeck = [...deck];
            const movedToStack: FlashcardWord[] = [];
            let nextIndex = currentIndex;
            for (let i = 0; i < numToRemove; i++) {
                if (tempDeck.length <= 1) break;
                if(nextIndex >= tempDeck.length -1) {
                     const [removed] = tempDeck.splice(0, 1);
                     movedToStack.push(removed);
                     nextIndex--;
                } else {
                    const removed = tempDeck.pop();
                    if(removed) movedToStack.push(removed);
                }
            }
            setDeck(tempDeck);
            setRemovedStack(rs => [...rs, ...movedToStack]);
            if(nextIndex < 0) nextIndex = 0;
            if (nextIndex >= tempDeck.length) nextIndex = 0;
            setCurrentIndex(nextIndex);
        }
    };

    const handleSetDifficulty = useCallback((difficulty: Difficulty) => {
        if (!currentWord) return;
        const updatedCard = { ...currentWord, difficulty };
        updateWord(updatedCard as Word);
        setDeck(prevDeck => {
            const newDeck = [...prevDeck];
            if (newDeck[currentIndex]?.id === updatedCard.id) newDeck[currentIndex] = updatedCard;
            return newDeck;
        });
        showToast(`Card marked as ${difficulty}.`);
    }, [currentWord, currentIndex, updateWord, showToast]);

    const handleToggleFilter = (difficulty: Difficulty) => {
        setDifficultyFilters(prevFilters => {
            const newFilters = [...prevFilters];
            const index = newFilters.indexOf(difficulty);
            if (index > -1) {
                if (newFilters.length > 1) {
                    newFilters.splice(index, 1);
                } else {
                    showToast("At least one difficulty filter must be selected.");
                    return prevFilters;
                }
            } else {
                newFilters.push(difficulty);
            }
            return newFilters;
        });
    };
    
    const toggleMenu = (menu: string) => {
        setActiveMenu(prev => (prev === menu ? null : menu));
    };

    const cardFace = currentWord?.face;
    const translation = currentWord?.translations[currentSourceLanguage] || { word: 'N/A', example: '' };
    const frontText = cardFace === 'swedish' ? currentWord?.swedish : translation.word;
    const backText = cardFace === 'swedish' ? translation.word : currentWord?.swedish;
    const frontExample = cardFace === 'swedish' ? currentWord?.swedishExample : translation.example;
    const backExample = cardFace === 'swedish' ? translation.example : currentWord?.swedishExample;
    const frontAudioText = `${frontText} ${frontExample || ''}`;
    const backAudioText = `${backText} ${backExample || ''}`;
    const frontLang = cardFace === 'swedish' ? 'sv-SE' : currentLanguageInfo.ttsCode;
    const backLang = cardFace === 'swedish' ? currentLanguageInfo.ttsCode : 'sv-SE';

    const executeSwipeAction = useCallback((action: SwipeAction) => {
        if (action === 'none') return;
    
        const simpleActions: { [key in SwipeAction]?: () => void } = {
            'flip': handleFlip,
            'readAloud': () => ttsService.speak(isFlipped ? backAudioText : frontAudioText, isFlipped ? backLang : frontLang),
            'hide': hideCard,
            'markEasy': () => handleSetDifficulty('easy'),
            'markMedium': () => handleSetDifficulty('medium'),
            'markHard': () => handleSetDifficulty('hard'),
        };
    
        if (simpleActions[action]) {
            simpleActions[action]!();
            return;
        }
    
        const performDelayedAction = (act: () => void) => {
            if (isActionDelayed) return;
            if (isFlipped) {
                act();
            } else {
                delayedAction(act);
            }
        };
    
        const delayedActions: { [key in SwipeAction]?: () => void } = {
            'move-1': () => moveCard(1),
            'move-2': () => moveCard(2),
            'move-3': () => moveCard(3),
            'move-4': () => moveCard(4),
            'move-5': () => moveCard(5),
            'sendToBack': () => sendToBack(false, false),
            'reverseAndBack': () => sendToBack(true, false),
            'backAndBlur': () => sendToBack(false, true),
            'reverseBackAndBlur': () => sendToBack(true, true),
        };
    
        if (delayedActions[action]) {
            performDelayedAction(delayedActions[action]!);
        }
    
    }, [
        isFlipped, isActionDelayed, backAudioText, frontAudioText, backLang, frontLang,
        handleFlip, hideCard, handleSetDifficulty, delayedAction, moveCard, sendToBack
    ]);
    
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (isModalOpen || (e.target as HTMLElement).tagName === 'INPUT') return;
            let direction: SwipeDirection | null = null;
            switch (e.key) {
                case 'ArrowUp': direction = 'up'; break;
                case 'ArrowDown': direction = 'down'; break;
                case 'ArrowLeft': direction = 'left'; break;
                case 'ArrowRight': direction = 'right'; break;
                default: return;
            }
            e.preventDefault();
            if (direction) {
                const action = swipeSettings[direction];
                executeSwipeAction(action);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [swipeSettings, executeSwipeAction, isModalOpen]);

    const handleTouchStart = (e: React.TouchEvent) => {
        touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        if (!touchStartRef.current) return;

        const touchEnd = { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
        const dx = touchEnd.x - touchStartRef.current.x;
        const dy = touchEnd.y - touchStartRef.current.y;
        const absDx = Math.abs(dx);
        const absDy = Math.abs(dy);
        const minSwipeDistance = 50;
        let direction: SwipeDirection | null = null;

        if (Math.max(absDx, absDy) > minSwipeDistance) {
            if (absDx > absDy) {
                direction = dx > 0 ? 'right' : 'left';
            } else {
                direction = dy > 0 ? 'down' : 'up';
            }
        }
        
        touchStartRef.current = null;

        if (direction) {
            e.preventDefault();
            const action = swipeSettings[direction];
            executeSwipeAction(action);
        }
    };


    if (totalActiveWords === 0) {
        return (
            <div className="text-center space-y-4">
                <h2 className="text-2xl font-bold">No Words Found</h2>
                <p>No active words match your current difficulty filters for {currentLanguageInfo.englishName}.</p>
                <button onClick={initializeGame} className="bg-primary text-primary-content py-2 px-4 rounded-md hover:bg-primary-focus">
                    Reset Filters and Restart
                </button>
            </div>
        );
    }
    
    if (sessionCompleted) {
        return (
            <div className="text-center space-y-4">
                <h2 className="text-2xl font-bold">Deck Complete!</h2>
                <p>You've gone through all the cards in this session.</p>
                <div className="flex justify-center gap-4">
                    <button onClick={initializeGame} className="bg-primary text-primary-content py-2 px-4 rounded-md hover:bg-primary-focus">
                        Restart Game
                    </button>
                    <button onClick={() => setScreen('game-selection')} className="bg-secondary text-secondary-content py-2 px-4 rounded-md hover:bg-secondary-focus">
                        Choose New Game
                    </button>
                </div>
            </div>
        );
    }

    if (!currentWord) {
        return <div className="text-center"><h2 className="text-2xl font-bold">Loading...</h2></div>
    }
    
    const currentDifficulty = currentWord.difficulty || 'unmarked';

    return (
        <div className="max-w-4xl mx-auto">
            {toastMessage && (
                <div className="fixed top-20 left-1/2 -translate-x-1/2 bg-accent text-accent-content py-2 px-6 rounded-full shadow-lg z-50 animate-fade-in-out">
                    {toastMessage}
                </div>
            )}
            <div className="w-full max-w-xl mx-auto mb-4">
                <div className="aspect-[16/9] perspective-[1000px]">
                    <div className={`card-inner relative w-full h-full cursor-pointer ${isFlipped ? 'is-flipped' : ''} ${isBlurred ? 'is-blurred' : ''}`} onClick={handleFlip} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
                        {/* Front Face */}
                        <div className="card-face absolute w-full h-full bg-base-200 rounded-xl flex flex-col items-center justify-center p-4 text-center">
                            <span className="text-2xl md:text-4xl font-bold">{frontText}</span>
                            {frontExample && <p className="text-sm italic text-gray-400 mt-2">{frontExample}</p>}
                            <button onClick={e => {e.stopPropagation(); ttsService.speak(frontAudioText, frontLang);}} className="speaker-btn absolute bottom-3 right-3 p-2 rounded-full hover:bg-base-300/50">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.858 12h.001M10 12h.001M14 12h.001" /></svg>
                            </button>
                            <div className={`absolute top-3 left-3 h-4 w-4 rounded-full ${difficultyColors[currentDifficulty]}`} title={`Difficulty: ${currentDifficulty}`}></div>
                            <div className="absolute top-2 right-3 bg-primary text-primary-content text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full">{currentWord.backCount}</div>
                        </div>
                        {/* Back Face */}
                        <div className="card-face card-back absolute w-full h-full bg-base-300 rounded-xl flex flex-col items-center justify-center p-4 text-center">
                            <span className="text-2xl md:text-4xl font-bold">{backText}</span>
                            {backExample && <p className="text-sm italic text-gray-400 mt-2">{backExample}</p>}
                             <button onClick={e => {e.stopPropagation(); ttsService.speak(backAudioText, backLang);}} className="speaker-btn absolute bottom-3 right-3 p-2 rounded-full hover:bg-base-100/50">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.858 12h.001M10 12h.001M14 12h.001" /></svg>
                            </button>
                            <div className={`absolute top-3 left-3 h-4 w-4 rounded-full ${difficultyColors[currentDifficulty]}`} title={`Difficulty: ${currentDifficulty}`}></div>
                             <div className="absolute top-2 right-3 bg-primary text-primary-content text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full">{currentWord.backCount}</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-xl mx-auto space-y-3">
                <form onSubmit={handleSelfAssessment} className="relative">
                    <input value={selfAssessment} onChange={e => setSelfAssessment(e.target.value)} type="text" placeholder="Type or use mic to answer, press Enter to flip" className="w-full bg-base-200 border border-base-300 rounded-lg p-3 text-center focus:ring-2 ring-primary focus:outline-none pr-12" disabled={isListening}/>
                    {recognitionRef.current && (
                        <button type="button" onClick={handleToggleListening} className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full transition-colors ${isListening ? 'bg-red-500 text-white animate-pulse' : 'hover:bg-base-300'}`} title="Use Voice Input">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                        </button>
                    )}
                </form>
                
                <div>
                    <div className="grid grid-cols-3 gap-2">
                        <button onClick={() => handleSetDifficulty('easy')} className={`py-3 rounded-lg text-white font-bold transition-all ${difficultyColors['easy']} hover:opacity-80 ${currentDifficulty === 'easy' ? 'ring-2 ring-offset-2 ring-offset-base-100 ring-white' : ''}`}>Easy</button>
                        <button onClick={() => handleSetDifficulty('medium')} className={`py-3 rounded-lg text-black font-bold transition-all ${difficultyColors['medium']} hover:opacity-80 ${currentDifficulty === 'medium' ? 'ring-2 ring-offset-2 ring-offset-base-100 ring-white' : ''}`}>Medium</button>
                        <button onClick={() => handleSetDifficulty('hard')} className={`py-3 rounded-lg text-white font-bold transition-all ${difficultyColors['hard']} hover:opacity-80 ${currentDifficulty === 'hard' ? 'ring-2 ring-offset-2 ring-offset-base-100 ring-white' : ''}`}>Hard</button>
                    </div>
                     <div className="h-6 flex justify-center items-center">
                        {currentDifficulty !== 'unmarked' && <button onClick={() => handleSetDifficulty('unmarked')} className="text-xs text-gray-400 hover:bg-base-300 px-2 py-0.5 rounded-md" title="Clear difficulty mark">Clear</button>}
                    </div>
                </div>

                <button onClick={() => ttsService.speak(isFlipped ? backAudioText : frontAudioText, isFlipped ? backLang : frontLang)} className="w-full p-3 bg-accent text-accent-content font-bold rounded-lg hover:bg-accent-focus transition-colors flex items-center justify-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.858 12h.001M10 12h.001M14 12h.001" /></svg>
                    <span>Read Aloud</span>
                </button>

                <div className={`grid grid-cols-5 gap-2 transition-opacity ${isActionDelayed ? 'opacity-50 pointer-events-none' : ''}`}>
                    {[1, 2, 3, 4, 5].map(n => (
                        <button key={n} onClick={() => delayedAction(() => moveCard(n))} className="p-2 bg-base-300 rounded-md hover:bg-primary hover:text-primary-content text-sm">+{n}</button>
                    ))}
                </div>

                <div className={`w-full grid grid-cols-5 gap-2 transition-opacity ${isActionDelayed ? 'opacity-50 pointer-events-none' : ''}`}>
                    <div className="relative">
                        <button onClick={() => toggleMenu('back')} className="w-full flex flex-col items-center justify-center p-2 bg-base-300 rounded-md hover:bg-primary hover:text-primary-content" title="Back Options">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
                            <span className="text-xs mt-1">Back</span>
                        </button>
                        {activeMenu === 'back' && (
                            <PopupMenu onClose={() => setActiveMenu(null)}>
                                <button onClick={() => delayedAction(() => sendToBack())} className="w-full text-left p-2 rounded hover:bg-primary hover:text-primary-content text-sm">Send to Back</button>
                                <button onClick={() => delayedAction(() => sendToBack(true))} className="w-full text-left p-2 rounded hover:bg-primary hover:text-primary-content text-sm">Reverse & Back</button>
                                <button onClick={() => delayedAction(() => sendToBack(false, true))} className="w-full text-left p-2 rounded hover:bg-primary hover:text-primary-content text-sm">Back & Blur</button>
                                <button onClick={() => delayedAction(() => sendToBack(true, true))} className="w-full text-left p-2 rounded hover:bg-primary hover:text-primary-content text-sm">Reverse, Back & Blur</button>
                            </PopupMenu>
                        )}
                    </div>
                    <div className="relative">
                        <button onClick={() => toggleMenu('bulk')} className="w-full flex flex-col items-center justify-center p-2 bg-base-300 rounded-md hover:bg-primary hover:text-primary-content" title="Bulk Actions">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                            <span className="text-xs mt-1">Change All</span>
                        </button>
                        {activeMenu === 'bulk' && (
                            <PopupMenu onClose={() => setActiveMenu(null)}>
                                <button onClick={() => bulkSwitchFace('swedish')} className="w-full text-left p-2 rounded hover:bg-primary hover:text-primary-content text-sm">All Swedish</button>
                                <button onClick={() => bulkSwitchFace('source')} className="w-full text-left p-2 rounded hover:bg-primary hover:text-primary-content text-sm">All {currentLanguageInfo.englishName}</button>
                                <button onClick={() => bulkSetBlur(true)} className="w-full text-left p-2 rounded hover:bg-primary hover:text-primary-content text-sm">All Blurred</button>
                                <button onClick={() => bulkSetBlur(false)} className="w-full text-left p-2 rounded hover:bg-primary hover:text-primary-content text-sm">All Unblurred</button>
                            </PopupMenu>
                        )}
                    </div>
                    <div className="relative">
                        <button onClick={() => toggleMenu('filter')} className="w-full flex flex-col items-center justify-center p-2 bg-base-300 rounded-md hover:bg-primary hover:text-primary-content" title="Filter & Deck Options">
                           <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
                           <span className="text-xs mt-1">Filter</span>
                        </button>
                        {activeMenu === 'filter' && (
                           <PopupMenu onClose={() => setActiveMenu(null)}>
                                <button onClick={() => showModal('setStackSize', { currentSize: deck.length, maxSize: totalActiveWords, onSet: handleSetStackSize })} className="w-full p-2 text-left bg-base-100 rounded hover:bg-primary hover:text-primary-content mb-2 text-sm">
                                    Cards: {deck.length}/{totalActiveWords}
                                </button>
                                <div className="space-y-1">
                                    {difficultyLevels.map(diff => (
                                        <button
                                            key={diff}
                                            onClick={() => handleToggleFilter(diff)}
                                            className={`w-full flex items-center justify-between p-2 rounded text-sm transition-colors ${difficultyFilters.includes(diff) ? 'bg-primary/30' : 'hover:bg-base-100'}`}
                                        >
                                            <div className="flex items-center gap-2">
                                                <div className={`h-4 w-4 rounded-full ${difficultyColors[diff]}`}></div>
                                                <span className="capitalize">{diff}</span>
                                            </div>
                                            {difficultyFilters.includes(diff) && (
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" viewBox="0 0 20 20" fill="currentColor">
                                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                </svg>
                                            )}
                                        </button>
                                    ))}
                                </div>
                           </PopupMenu>
                        )}
                    </div>
                    <button onClick={() => showModal('swipeSettings')} className="w-full flex flex-col items-center justify-center p-2 bg-base-300 rounded-md hover:bg-primary hover:text-primary-content" title="Swipe Actions">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 18.657l-5.657-5.657 5.657-5.657m-6.343 11.314l-5.657-5.657 5.657-5.657" />
                        </svg>
                        <span className="text-xs mt-1">Swipes</span>
                    </button>
                    <button onClick={hideCard} className="flex flex-col items-center justify-center p-2 bg-base-300 rounded-md hover:bg-red-600 hover:text-white" title="Hide Card">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a9.97 9.97 0 01-1.563 3.029m0 0l-2.145-2.145" /></svg>
                        <span className="text-xs mt-1">Hide</span>
                    </button>
                </div>
            </div>
            <div className="max-w-xl mx-auto flex justify-center pt-2">
                <button onClick={() => showModal('flashcardHelp')} className="text-xs text-blue-400 hover:underline">How to use Flashcards?</button>
            </div>
        </div>
    );
};

export default FlashcardGameScreen;