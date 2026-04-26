
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useWords } from '../../contexts/WordsContext';
import { useSettings } from '../../contexts/SettingsContext';
import { useModal } from '../../contexts/ModalContext';
import { FlashcardWord, Word, SwipeDirection, SwipeAction, Screen } from '../../types';
import { ttsService } from '../../services/ttsService';
import { useSwipeSettings } from '../../contexts/SwipeSettingsContext';
import { useTranslation } from '../../hooks/useTranslation';
import { applySM2, nowISO } from '../../services/srsService';
import { WORD_TYPES } from '../../constants';
import MatchingGameScreen from './MatchingGameScreen';

type Difficulty = 'unmarked' | 'easy' | 'medium' | 'hard';
const difficultyLevels: Difficulty[] = ['unmarked', 'easy', 'medium', 'hard'];

const difficultyColors: Record<Difficulty, string> = {
    unmarked: 'bg-gray-500',
    easy: 'bg-green-500',
    medium: 'bg-yellow-500',
    hard: 'bg-red-600',
};


// FIX: Define the props interface for FlashcardGameScreen.
interface FlashcardGameScreenProps {
    setScreen: (screen: Screen) => void;
}

const FlashcardGameScreen: React.FC<FlashcardGameScreenProps> = ({ setScreen }) => {
    const { words, updateWord, toggleWordFlag } = useWords();
    const { currentLanguageInfo, currentSourceLanguage, disableAnimations, autoMatchGame } = useSettings();
    const { showModal, isModalOpen } = useModal();
    const { swipeSettings } = useSwipeSettings();
    const { t } = useTranslation();
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
    const [isTransitioning, setIsTransitioning] = useState(false);
    const [sessionCompleted, setSessionCompleted] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    
    // Auto-match break state
    const [recentWords, setRecentWords] = useState<Word[]>([]);
    const [showAutoMatch, setShowAutoMatch] = useState(false);

    const [difficultyFilters, setDifficultyFilters] = useState<Difficulty[]>(['unmarked', 'easy', 'medium', 'hard']);
    const availableWordTypes = useMemo(() => {
        const types = Array.from(new Set(words.map(w => w.wordType || '')));
        // Sort by canonical WORD_TYPES order; unknown types go to the end alphabetically
        return types.sort((a, b) => {
            const aIdx = WORD_TYPES.findIndex(t => t.toLowerCase() === a.toLowerCase());
            const bIdx = WORD_TYPES.findIndex(t => t.toLowerCase() === b.toLowerCase());
            if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
            if (aIdx !== -1) return -1;
            if (bIdx !== -1) return 1;
            return a.localeCompare(b);
        });
    }, [words]);
    const [wordTypeFilters, setWordTypeFilters] = useState<string[]>([]);
    
    useEffect(() => {
        if (wordTypeFilters.length === 0 && availableWordTypes.length > 0) {
            setWordTypeFilters(availableWordTypes);
        }
    }, [availableWordTypes, wordTypeFilters.length]);

    // Group filter — in-game only, does NOT touch word.active in manage words
    // Stored as Set of "source::subtopic1::subtopic2" path strings. Empty = all groups.
    const [groupFilters, setGroupFilters] = useState<Set<string>>(new Set());

    // Build a stable tree: { [source]: { [sub1]: Set<sub2> } }
    const groupTree = useMemo(() => {
        const tree: Record<string, Record<string, Set<string>>> = {};
        words.filter(w => w.active && w.translations[currentSourceLanguage]?.word).forEach(w => {
            const src = w.source || '';
            const s1 = w.subtopic1 || '';
            const s2 = w.subtopic2 || '';
            if (!tree[src]) tree[src] = {};
            if (!tree[src][s1]) tree[src][s1] = new Set();
            tree[src][s1].add(s2);
        });
        return tree;
    }, [words, currentSourceLanguage]);

    const stateRef = useRef({ deck, currentIndex });
    useEffect(() => {
        stateRef.current = { deck, currentIndex };
    }, [deck, currentIndex]);

    const currentWord = useMemo(() => {
        const deckWord = deck[currentIndex];
        if (!deckWord) return undefined;
        // Always get the latest data from the global words state for things like flags
        const globalWord = words.find(w => w.id === deckWord.id);
        return { ...deckWord, ...globalWord };
    }, [deck, currentIndex, words]);

    const showToast = useCallback((message: string) => {
        setToastMessage(message);
        setTimeout(() => {
            setToastMessage('');
        }, 3000);
    }, []);
    const recordAction = useCallback((word: Word, action: string) => {
        const history = [...(word.history || [])];
        history.push(action);
        if (history.length > 3) history.shift();
        const updatedWord = { 
            ...word, 
            history, 
            backCount: (word.backCount || 0) + 1 
        };
        updateWord(updatedWord);
        return updatedWord;
    }, [updateWord]);

    const recordActionNoPersist = useCallback((word: Word, action: string) => {
        const history = [...(word.history || [])];
        history.push(action);
        if (history.length > 3) history.shift();
        return { 
            ...word, 
            history, 
            backCount: (word.backCount || 0) + 1 
        };
    }, []);

    const initializeGame = useCallback(() => {
        const startFace = (localStorage.getItem('flashcard_start_face') as 'swedish' | 'source') || 'swedish';
        const filteredWords = words
            .filter(w => w.active && w.translations[currentSourceLanguage]?.word && difficultyFilters.includes(w.difficulty || 'unmarked'))
            .filter(w => wordTypeFilters.length === 0 || wordTypeFilters.includes(w.wordType || ''))
            // Group filter: if any group selected, word must match at least one
            .filter(w => {
                if (groupFilters.size === 0) return true;
                const src = w.source || '';
                const s1 = w.subtopic1 || '';
                const s2 = w.subtopic2 || '';
                // Check all three levels: source, source::s1, source::s1::s2
                return groupFilters.has(src) || groupFilters.has(`${src}::${s1}`) || groupFilters.has(`${src}::${s1}::${s2}`);
            })
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
    }, [words, currentSourceLanguage, difficultyFilters, wordTypeFilters, groupFilters]);

    const initializeGameRef = useRef(initializeGame);
    initializeGameRef.current = initializeGame;

    useEffect(() => {
        initializeGameRef.current();
    }, [currentSourceLanguage, difficultyFilters, wordTypeFilters, groupFilters]);
    
    useEffect(() => {
        if (autoMatchGame && recentWords.length >= 5 && !showAutoMatch) {
            setShowAutoMatch(true);
        }
    }, [recentWords, autoMatchGame, showAutoMatch]);

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
        if (deck.length < 2 || isTransitioning) return;
        setIsTransitioning(true);

        const cardToMove = recordAction(deck[currentIndex], `+${positions}`) as FlashcardWord;
        
        setRecentWords(prev => prev.some(w => w.id === cardToMove.id) ? prev : [...prev, cardToMove]);

        setIsFlipped(false);
        const delay = disableAnimations ? 0 : 300;

        setTimeout(() => {
            setDeck(prevDeck => {
                const newDeck = prevDeck.filter((_, i) => i !== currentIndex);
                const newIndex = Math.min(currentIndex + positions, newDeck.length);
                newDeck.splice(newIndex, 0, cardToMove);
                return newDeck;
            });
            if (currentIndex >= deck.length - 1) {
                setCurrentIndex(0);
            }
            setTimeout(() => setIsTransitioning(false), delay);
        }, delay);
    };
    
    const sendToBack = (reverse: boolean = false, blur: boolean = false) => {
        const { deck, currentIndex } = stateRef.current;
        if (deck.length < 2 || isTransitioning) return;
        setIsTransitioning(true);

        const baseAction = reverse ? t('game.flashcards.reverseBackAndBlur').split(' ')[0] : t('game.flashcards.back'); // 'Rev' or 'Back'
        const cardToMove = {
            ...(recordAction(deck[currentIndex], baseAction) as FlashcardWord),
            face: reverse ? (deck[currentIndex].face === 'swedish' ? 'source' : 'swedish') : deck[currentIndex].face,
            isBlurredNext: blur,
        };
        const wasLastCard = currentIndex === deck.length - 1;
        
        setIsFlipped(false);
        const delay = disableAnimations ? 0 : 300;

        setTimeout(() => {
            setDeck(prevDeck => {
                const newDeck = prevDeck.filter((_, i) => i !== currentIndex);
                newDeck.push(cardToMove);
                return newDeck;
            });
            if (wasLastCard) setCurrentIndex(0);
            setTimeout(() => setIsTransitioning(false), delay);
        }, delay);
    };

    const hideCard = () => {
        if(!currentWord || isTransitioning) return;
        setIsTransitioning(true);

        const wordToHide = {...recordActionNoPersist(currentWord, t('game.flashcards.hide')), active: false};
        updateWord(wordToHide);
        setLastHiddenWord(currentWord);
        setTotalActiveWords(t => t - 1);
        
        setIsFlipped(false);
        const delay = disableAnimations ? 0 : 300;

        setTimeout(() => {
            let newCard = removedStack.pop() || allActiveWordsPool.shift();
            setDeck(prevDeck => {
                const newDeck = [...prevDeck];
                if (newCard) {
                    newDeck[currentIndex] = newCard;
                    setRemovedStack(rs => rs.slice(0, -1));
                    if(allActiveWordsPool.length > 0) setAllActiveWordsPool(p => p.slice(1));
                } else {
                    newDeck.splice(currentIndex, 1);
                }
                return newDeck;
            });
            if (currentIndex >= deck.length - 1 && deck.length > 1) setCurrentIndex(0);
            setTimeout(() => setIsTransitioning(false), delay);
        }, delay);
    };
    
    const moveToSrs = () => {
        if(!currentWord || isTransitioning) return;
        setIsTransitioning(true);

        // Mark as SRS active and hide from regular active pool as requested
        const wordUpdate = {
            ...recordActionNoPersist(currentWord, 'SRS'),
            active: false,
            srs_active: true
        };
        // If it's never been in SRS, initialize it and make available IMMEDIATELY
        if (!wordUpdate.srs_next_review) {
            const initialSrs = applySM2(wordUpdate, 4);
            Object.assign(wordUpdate, { 
                ...initialSrs, 
                srs_next_review: nowISO() // Make due now instead of 1 day from now
            });
        }
        updateWord(wordUpdate);
        
        setIsFlipped(false);
        const delay = disableAnimations ? 0 : 300;

        setTimeout(() => {
            // Remove from current session (same logic as hideCard)
            setTotalActiveWords(t => t - 1);
            let newCard = removedStack.pop() || allActiveWordsPool.shift();
            setDeck(prevDeck => {
                const newDeck = [...prevDeck];
                if (newCard) {
                    newDeck[currentIndex] = newCard;
                    setRemovedStack(rs => rs.slice(0, -1));
                    if(allActiveWordsPool.length > 0) setAllActiveWordsPool(p => p.slice(1));
                } else {
                    newDeck.splice(currentIndex, 1);
                }
                return newDeck;
            });
            if (currentIndex >= deck.length - 1 && deck.length > 1) setCurrentIndex(0);
            showToast(t('game.flashcards.toast.movedToSrs'));
            setTimeout(() => setIsTransitioning(false), delay);
        }, delay);
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
        showToast(face === 'swedish' ? t('game.flashcards.toast.switchedAllSwedish') : t('game.flashcards.toast.switchedAllSource', { languageName: currentLanguageInfo.englishName }));
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
        showToast(shouldBlur ? t('game.flashcards.toast.setAllBlurred') : t('game.flashcards.toast.setAllUnblurred'));
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
        const label = difficulty === 'unmarked' ? 'Clr' : t(`game.difficulty.${difficulty}`);
        // Consolidate updates: difficulty + record history
        const updatedWord = { 
            ...recordActionNoPersist(currentWord, label), 
            difficulty 
        };
        updateWord(updatedWord);
        setDeck(prevDeck => {
            const newDeck = [...prevDeck];
            if (newDeck[currentIndex]?.id === updatedWord.id) {
                newDeck[currentIndex] = { ...updatedWord, face: currentWord.face, isBlurredNext: currentWord.isBlurredNext } as FlashcardWord;
            }
            return newDeck;
        });
        showToast(t('game.flashcards.toast.markedDifficulty', { difficulty: t(`game.difficulty.${difficulty}`) }));
    }, [currentWord, currentIndex, updateWord, showToast, t, recordActionNoPersist]);

    const handleToggleFilter = (difficulty: Difficulty) => {
        setDifficultyFilters(prevFilters => {
            const newFilters = [...prevFilters];
            const index = newFilters.indexOf(difficulty);
            if (index > -1) {
                if (newFilters.length > 1) {
                    newFilters.splice(index, 1);
                } else {
                    showToast(t('game.flashcards.toast.filterError'));
                    return prevFilters;
                }
            } else {
                newFilters.push(difficulty);
            }
            return newFilters;
        });
    };

    const handleToggleWordTypeFilter = (type: string) => {
        setWordTypeFilters(prevFilters => {
            const newFilters = prevFilters.length > 0 ? [...prevFilters] : [...availableWordTypes];
            const index = newFilters.indexOf(type);
            if (index > -1) {
                if (newFilters.length > 1) {
                    newFilters.splice(index, 1);
                } else {
                    showToast(t('game.flashcards.toast.filterError'));
                    return prevFilters;
                }
            } else {
                newFilters.push(type);
            }
            return newFilters;
        });
    };

    const handleResetAllFilters = () => {
        setDifficultyFilters(['unmarked', 'easy', 'medium', 'hard']);
        setWordTypeFilters([...availableWordTypes]);
        setGroupFilters(new Set());
    };

    // Fisher-Yates shuffle of the entire current pool + deck, then re-slice to current deck size
    const handleShuffleDeck = useCallback(() => {
        const { deck: currentDeck } = stateRef.current;
        setAllActiveWordsPool(prevPool => {
            const all = [...currentDeck, ...prevPool];
            for (let i = all.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [all[i], all[j]] = [all[j], all[i]];
            }
            setDeck(all.slice(0, currentDeck.length));
            setCurrentIndex(0);
            setIsFlipped(false);
            return all.slice(currentDeck.length);
        });
    }, [stateRef, setDeck, setAllActiveWordsPool, setCurrentIndex, setIsFlipped]);

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
            'moveToSrs': moveToSrs,
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

    if (showAutoMatch) {
        return (
            <div className="absolute inset-0 z-50 bg-base-100 flex items-center justify-center p-4">
                <div className="w-full max-w-4xl max-h-full overflow-y-auto">
                    <MatchingGameScreen 
                        setScreen={setScreen} 
                        overrideWords={recentWords} 
                        onComplete={() => {
                            setShowAutoMatch(false);
                            setRecentWords([]);
                        }} 
                    />
                </div>
            </div>
        );
    }

    if (totalActiveWords === 0) {
        return (
            <div className="text-center space-y-4">
                <h2 className="text-2xl font-bold">{t('game.flashcards.noWordsTitle')}</h2>
                <p>{t('game.flashcards.noWordsBody', { languageName: currentLanguageInfo.englishName })}</p>
                <button onClick={initializeGame} className="bg-primary text-primary-content py-2 px-4 rounded-md hover:bg-primary-focus">
                    {t('game.flashcards.resetFilters')}
                </button>
            </div>
        );
    }
    
    if (sessionCompleted) {
        return (
            <div className="text-center space-y-4">
                <h2 className="text-2xl font-bold">{t('game.flashcards.deckCompleteTitle')}</h2>
                <p>{t('game.flashcards.deckCompleteBody')}</p>
                <div className="flex justify-center gap-4">
                    <button onClick={initializeGame} className="bg-primary text-primary-content py-2 px-4 rounded-md hover:bg-primary-focus">
                        {t('game.flashcards.restartGame')}
                    </button>
                    <button onClick={() => setScreen('game-selection')} className="bg-secondary text-secondary-content py-2 px-4 rounded-md hover:bg-secondary-focus">
                        {t('game.flashcards.chooseNewGame')}
                    </button>
                </div>
            </div>
        );
    }

    if (!currentWord) {
        return <div className="text-center"><h2 className="text-2xl font-bold">{t('game.flashcards.loading')}</h2></div>
    }
    
    const currentDifficulty = currentWord.difficulty || 'unmarked';

    return (
        <div className="max-w-4xl mx-auto flex flex-col h-full">
            {toastMessage && (
                <div className="fixed top-20 left-1/2 -translate-x-1/2 bg-accent text-accent-content py-2 px-6 rounded-full shadow-lg z-50 animate-fade-in-out">
                    {toastMessage}
                </div>
            )}
            <div className="w-full max-w-xl mx-auto mb-4 shrink-0">
                <div className="aspect-[16/9] perspective-[1000px]">
                    <div className={`card-inner swipe-area relative w-full h-full cursor-pointer ${isFlipped ? 'is-flipped' : ''} ${isBlurred ? 'is-blurred' : ''}`} onClick={handleFlip} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
                        {/* Front Face */}
                        <div className="card-face absolute w-full h-full bg-base-200 rounded-xl flex flex-col items-center justify-center p-4 text-center">
                            <span className="text-2xl md:text-4xl font-bold">{frontText}</span>
                            {frontExample && <p className="text-sm italic text-gray-400 mt-2">{frontExample}</p>}
                            <button onClick={e => {e.stopPropagation(); ttsService.speak(frontAudioText, frontLang);}} className="speaker-btn absolute bottom-3 right-3 p-2 rounded-full hover:bg-base-300/50">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.858 12h.001M10 12h.001M14 12h.001" /></svg>
                            </button>
                            <div className="absolute bottom-3 left-3 flex flex-col items-start gap-1 max-w-[70%]">
                                <div className="text-[10px] text-gray-500 font-medium truncate" title={`${currentWord.source} > ${currentWord.subtopic1} > ${currentWord.subtopic2}`}>
                                    {[currentWord.source, currentWord.subtopic1, currentWord.subtopic2].filter(Boolean).join(' > ')}
                                </div>
                                {currentWord.wordType && (
                                    <span className="px-1.5 py-0.5 bg-base-300/80 text-[10px] text-primary font-bold rounded border border-primary/20 uppercase tracking-wide">
                                        {currentWord.wordType}
                                    </span>
                                )}
                            </div>
                            <div className={`absolute top-3 left-3 h-4 w-4 rounded-full ${difficultyColors[currentDifficulty]}`} title={`Difficulty: ${currentDifficulty}`}></div>
                            <button 
                                onClick={e => { e.stopPropagation(); toggleWordFlag(currentWord.id); }}
                                className={`absolute top-2 left-9 p-1.5 rounded-full transition-colors ${currentWord.flagged ? 'text-red-500 bg-red-500/10' : 'text-gray-400 hover:bg-base-300'}`}
                                title="Flag translation"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill={currentWord.flagged ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
                                </svg>
                            </button>
                            <div className="absolute top-2 right-3 flex items-center gap-1.5">
                                {currentWord.history && currentWord.history.length > 0 && (
                                    <div className="flex gap-1">
                                        {currentWord.history.map((act, i) => (
                                            <span key={i} className="px-1.5 py-0.5 bg-base-300/80 text-[10px] text-gray-400 rounded-md font-medium border border-gray-700/30">
                                                {act}
                                            </span>
                                        ))}
                                    </div>
                                )}
                                <div className="bg-primary text-primary-content text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full" title="Times seen">
                                    {currentWord.backCount || 0}
                                </div>
                            </div>
                        </div>
                        {/* Back Face */}
                        <div className="card-face card-back absolute w-full h-full bg-base-300 rounded-xl flex flex-col items-center justify-center p-4 text-center">
                            <span className="text-2xl md:text-4xl font-bold">{backText}</span>
                            {backExample && <p className="text-sm italic text-gray-400 mt-2">{backExample}</p>}
                             <button onClick={e => {e.stopPropagation(); ttsService.speak(backAudioText, backLang);}} className="speaker-btn absolute bottom-3 right-3 p-2 rounded-full hover:bg-base-100/50">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.858 12h.001M10 12h.001M14 12h.001" /></svg>
                            </button>
                            <div className="absolute bottom-3 left-3 flex flex-col items-start gap-1 max-w-[70%]">
                                <div className="text-[10px] text-gray-500 font-medium truncate" title={`${currentWord.source} > ${currentWord.subtopic1} > ${currentWord.subtopic2}`}>
                                    {[currentWord.source, currentWord.subtopic1, currentWord.subtopic2].filter(Boolean).join(' > ')}
                                </div>
                                {currentWord.wordType && (
                                    <span className="px-1.5 py-0.5 bg-base-200/80 text-[10px] text-primary font-bold rounded border border-primary/20 uppercase tracking-wide">
                                        {currentWord.wordType}
                                    </span>
                                )}
                            </div>
                            <div className={`absolute top-3 left-3 h-4 w-4 rounded-full ${difficultyColors[currentDifficulty]}`} title={`Difficulty: ${currentDifficulty}`}></div>
                            <button 
                                onClick={e => { e.stopPropagation(); toggleWordFlag(currentWord.id); }}
                                className={`absolute top-2 left-9 p-1.5 rounded-full transition-colors ${currentWord.flagged ? 'text-red-500 bg-red-500/10' : 'text-gray-400 hover:bg-base-100'}`}
                                title="Flag translation"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill={currentWord.flagged ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
                                </svg>
                            </button>
                            <div className="absolute top-2 right-3 flex items-center gap-1.5">
                                {currentWord.history && currentWord.history.length > 0 && (
                                    <div className="flex gap-1">
                                        {currentWord.history.map((act, i) => (
                                            <span key={i} className="px-1.5 py-0.5 bg-base-100/80 text-[10px] text-gray-500 rounded-md font-medium border border-gray-700/20">
                                                {act}
                                            </span>
                                        ))}
                                    </div>
                                )}
                                <div className="bg-primary text-primary-content text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full" title="Times seen">
                                    {currentWord.backCount || 0}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-xl mx-auto space-y-3 mt-2 w-full shrink-0">
                <form onSubmit={handleSelfAssessment} className="relative">
                    <input value={selfAssessment} onChange={e => setSelfAssessment(e.target.value)} type="text" placeholder={t('game.flashcards.typeAnswer')} className="w-full bg-base-200 border border-base-300 rounded-lg p-3 text-center focus:ring-2 ring-primary focus:outline-none pr-12" disabled={isListening}/>
                    {recognitionRef.current && (
                        <button type="button" onClick={handleToggleListening} className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full transition-colors ${isListening ? 'bg-red-500 text-white animate-pulse' : 'hover:bg-base-300'}`} title="Use Voice Input">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                        </button>
                    )}
                </form>
                
                <div>
                    <div className="grid grid-cols-3 gap-2">
                        <button onClick={() => handleSetDifficulty(currentDifficulty === 'easy' ? 'unmarked' : 'easy')} className={`py-3 rounded-lg text-white font-bold transition-all ${difficultyColors['easy']} hover:opacity-80 ${currentDifficulty === 'easy' ? 'ring-2 ring-offset-2 ring-offset-base-100 ring-white' : ''}`}>{t('game.difficulty.easy')}</button>
                        <button onClick={() => handleSetDifficulty(currentDifficulty === 'medium' ? 'unmarked' : 'medium')} className={`py-3 rounded-lg text-black font-bold transition-all ${difficultyColors['medium']} hover:opacity-80 ${currentDifficulty === 'medium' ? 'ring-2 ring-offset-2 ring-offset-base-100 ring-white' : ''}`}>{t('game.difficulty.medium')}</button>
                        <button onClick={() => handleSetDifficulty(currentDifficulty === 'hard' ? 'unmarked' : 'hard')} className={`py-3 rounded-lg text-white font-bold transition-all ${difficultyColors['hard']} hover:opacity-80 ${currentDifficulty === 'hard' ? 'ring-2 ring-offset-2 ring-offset-base-100 ring-white' : ''}`}>{t('game.difficulty.hard')}</button>
                    </div>
                </div>

                <button onClick={() => ttsService.speak(isFlipped ? backAudioText : frontAudioText, isFlipped ? backLang : frontLang)} className="w-full p-3 bg-accent text-accent-content font-bold rounded-lg hover:bg-accent-focus transition-colors flex items-center justify-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.858 12h.001M10 12h.001M14 12h.001" /></svg>
                    <span>{t('game.flashcards.readAloud')}</span>
                </button>

                <div className={`grid grid-cols-6 gap-2 transition-opacity ${isActionDelayed ? 'opacity-50 pointer-events-none' : ''}`}>
                    {[1, 2, 3, 4].map(n => (
                        <button key={n} onClick={() => delayedAction(() => moveCard(n))} className="p-2 bg-base-300 rounded-md hover:bg-primary hover:text-primary-content text-sm">+{n}</button>
                    ))}
                    <button onClick={moveToSrs} className="p-2 bg-base-300 rounded-md hover:bg-purple-600 hover:text-white text-sm font-bold text-purple-400 border border-base-300 hover:border-purple-600 flex flex-col items-center justify-center -gap-1" title={t('game.flashcards.moveToSrs')}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                        <span className="text-[10px]">SRS</span>
                    </button>
                    <button onClick={hideCard} className="p-2 bg-base-300 rounded-md hover:bg-red-600 hover:text-white text-sm font-bold text-red-500 border border-base-300 hover:border-red-600">{t('game.flashcards.hide')}</button>
                </div>

                <div className={`w-full grid grid-cols-6 gap-2 transition-opacity ${isActionDelayed ? 'opacity-50 pointer-events-none' : ''}`}>
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
                            <span className="text-xs mt-1">{t('game.flashcards.back')}</span>
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
                            <span className="text-xs mt-1">{t('game.flashcards.changeAll')}</span>
                        </button>
                    </div>
                    <div className="relative">
                        <button
                            onClick={() => showModal('flashcardFilter', {
                                difficultyFilters,
                                wordTypeFilters: wordTypeFilters.length > 0 ? wordTypeFilters : availableWordTypes,
                                availableWordTypes,
                                onToggleDifficultyFilter: handleToggleFilter,
                                onToggleWordTypeFilter: handleToggleWordTypeFilter,
                                onResetAllFilters: handleResetAllFilters,
                                onShowToast: showToast,
                                // Group filter props
                                groupFilters,
                                groupTree,
                                onSetGroupFilters: setGroupFilters,
                            })}
                            className="w-full h-full flex flex-col items-center justify-center p-2 bg-base-300 rounded-md hover:bg-primary hover:text-primary-content"
                            title="Filter & Deck Options"
                        >
                           <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
                           <span className="text-xs mt-1">{t('game.flashcards.filter')}</span>
                        </button>
                    </div>
                    <button onClick={() => showModal('swipeSettings')} className="w-full h-full flex flex-col items-center justify-center p-2 bg-base-300 rounded-md hover:bg-primary hover:text-primary-content" title="Swipe Actions">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 18.657l-5.657-5.657 5.657-5.657m-6.343 11.314l-5.657-5.657 5.657-5.657" />
                        </svg>
                        <span className="text-xs mt-1">{t('game.flashcards.swipes')}</span>
                    </button>
                    {/* Shuffle deck button */}
                    <button
                        onClick={handleShuffleDeck}
                        className="w-full h-full flex flex-col items-center justify-center p-2 bg-base-300 rounded-md hover:bg-primary hover:text-primary-content"
                        title="Randomise deck order"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4h4l2 4-4 2 2 4h4m4-10h4v4m0 0l-4 4m4-4l-4-4M4 20h4l2-4-4-2 2-4h4" />
                        </svg>
                        <span className="text-xs mt-1">Shuffle</span>
                    </button>
                    <button onClick={() => showModal('setStackSize', { currentSize: deck.length, maxSize: totalActiveWords, onSet: handleSetStackSize })} className="w-full h-full flex flex-col items-center justify-center p-2 bg-base-300 rounded-md hover:bg-primary hover:text-primary-content" title="Set Deck Size">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                        <span className="text-xs mt-1">{deck.length}/{totalActiveWords}</span>
                    </button>
                </div>
            </div>

            {/* Mobile-only Swipe Area */}
            <div
                className="block md:hidden swipe-area my-4 max-w-xl mx-auto w-full flex-grow min-h-[80px] bg-base-200 p-4 rounded-lg text-center cursor-pointer border-2 border-dashed border-base-300 active:bg-base-300 transition-colors flex items-center justify-center"
                onClick={handleFlip}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
            >
                <div className="flex justify-center items-center text-gray-400">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 18.657l-5.657-5.657 5.657-5.657m-6.343 11.314l-5.657-5.657 5.657-5.657" />
                    </svg>
                    <p className="text-sm ml-2">{t('game.flashcards.swipeArea')}</p>
                </div>
            </div>

            <div className="max-w-xl mx-auto flex justify-center pt-2 w-full shrink-0">
                <button onClick={() => showModal('flashcardHelp')} className="text-xs text-blue-400 hover:underline">{t('game.flashcards.howToUse')}</button>
            </div>
        </div>
    );
};

export default FlashcardGameScreen;
