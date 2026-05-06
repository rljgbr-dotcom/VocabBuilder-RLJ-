import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useWords } from '../../contexts/WordsContext';
import { useSettings } from '../../contexts/SettingsContext';
import { Screen, Word, SrsVirtualCard, TenseSrsData } from '../../types';
import { ttsService } from '../../services/ttsService';
import { useTranslation } from '../../hooks/useTranslation';
import { applySM2, isDueToday } from '../../services/srsService';
import NoteTooltip from '../NoteTooltip';
import UndoButton from '../UndoButton';

interface SrsGameHistoryState {
    sessionQueue: SrsVirtualCard[];
    reviewedCount: number;
    wordBeforeUpdate: Word;
    ratedQuality?: number;
    actionType: 'rate' | 'retire';
    status: 'done' | 'undone';
}

interface SmartCardsGameScreenProps {
    setScreen: (screen: Screen) => void;
}

const SmartCardsGameScreen: React.FC<SmartCardsGameScreenProps> = ({ setScreen }) => {
    const { words, updateWord, toggleWordFlag } = useWords();
    const { currentLanguageInfo, currentSourceLanguage, disableAnimations } = useSettings();
    const { t } = useTranslation();

    const [gameStarted, setGameStarted] = useState(false);
    const [startFace, setStartFace] = useState<'swedish' | 'source'>(() => {
        return (localStorage.getItem('smartcards_start_face') as 'swedish' | 'source') || 'swedish';
    });

    const [sessionQueue, setSessionQueue] = useState<SrsVirtualCard[]>([]);
    const [isFlipped, setIsFlipped]       = useState(false);
    const [sessionDone, setSessionDone]   = useState(false);
    const [noSrsWords, setNoSrsWords]     = useState(false);
    const [reviewedCount, setReviewedCount] = useState(0);
    const totalDueRef = useRef(0);
    const touchStartRef = useRef<{ x: number, y: number } | null>(null);
    const [isTransitioning, setIsTransitioning] = useState(false);
    
    const [history, setHistory] = useState<SrsGameHistoryState | null>(null);

    // Initial load logic
    useEffect(() => {
        const srsVirtualCards: SrsVirtualCard[] = [];
        words.forEach(w => {
            if (w.srs_active && w.translations[currentSourceLanguage]?.word) {
                srsVirtualCards.push({
                    id: `${w.id}|infinitiv`,
                    wordId: w.id,
                    tense: 'infinitiv',
                    swedish: w.swedish,
                    english: w.translations[currentSourceLanguage]?.word || '',
                    exampleSv: w.swedishExample || '',
                    exampleEn: w.translations[currentSourceLanguage]?.example || '',
                    note: w.swedishNote,
                    srs_interval: w.srs_interval || 0,
                    srs_repetition: w.srs_repetition || 0,
                    srs_efactor: w.srs_efactor || 2.5,
                    srs_next_review: w.srs_next_review,
                    srs_last_reviewed_at: w.srs_last_reviewed_at,
                    srs_last_quality: w.srs_last_quality
                });
            }

            const addTense = (tense: 'present'|'preteritum'|'supinium', sv: string, en: string, exSv: string, exEn: string, srs: any, note?: string) => {
                if (srs?.active && sv) {
                    srsVirtualCards.push({
                        id: `${w.id}|${tense}`,
                        wordId: w.id,
                        tense,
                        swedish: sv,
                        english: en,
                        exampleSv: exSv,
                        exampleEn: exEn,
                        note,
                        srs_interval: srs.interval || 0,
                        srs_repetition: srs.repetition || 0,
                        srs_efactor: srs.efactor || 2.5,
                        srs_next_review: srs.next_review,
                        srs_last_reviewed_at: srs.last_reviewed_at,
                        srs_last_quality: srs.last_quality
                    });
                }
            };

            if (w.wordType?.toLowerCase() === 'verb') {
                addTense('present', w.present || '', w.presentTranslation || '', w.presentExample || '', w.presentExampleTranslation || '', w.srs_present, w.presentNote);
                addTense('preteritum', w.preteritum || '', w.preteritumTranslation || '', w.preteritumExample || '', w.preteritumExampleTranslation || '', w.srs_preteritum, w.preteritumNote);
                addTense('supinium', w.supinium || '', w.supiniumTranslation || '', w.supiniumExample || '', w.supiniumExampleTranslation || '', w.srs_supinium, w.supiniumNote);
            }
        });

        if (srsVirtualCards.length === 0) {
            setNoSrsWords(true);
            return;
        }
        const due = srsVirtualCards.filter(c => isDueToday(c.srs_next_review));
        totalDueRef.current = due.length;
        if (due.length === 0) {
            setSessionDone(true);
        } else {
            setSessionQueue(due);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleStartGame = () => {
        localStorage.setItem('smartcards_start_face', startFace);
        setGameStarted(true);
    };

    const currentCard: SrsVirtualCard | undefined = sessionQueue[0];

    const handleRateCard = useCallback((q: number) => {
        if (!currentCard || isTransitioning) return;
        setIsTransitioning(true);

        const word = words.find(w => w.id === currentCard.wordId);
        
        setHistory({
            sessionQueue: [...sessionQueue],
            reviewedCount,
            wordBeforeUpdate: word ? { ...word } : {} as Word,
            ratedQuality: q,
            actionType: 'rate',
            status: 'done'
        });

        const srsResult = applySM2(currentCard, q);
        const updatedCard: SrsVirtualCard = { ...currentCard, ...srsResult };
        
        if (word) {
            let updatedWord = { ...word };
            if (currentCard.tense === 'infinitiv') {
                updatedWord = { ...updatedWord, ...srsResult };
            } else {
                const tenseField = `srs_${currentCard.tense}` as keyof Word;
                const currentTenseData = (updatedWord[tenseField] as TenseSrsData) || { active: true };
                updatedWord[tenseField] = {
                    ...currentTenseData,
                    interval: srsResult.srs_interval,
                    repetition: srsResult.srs_repetition,
                    efactor: srsResult.srs_efactor,
                    next_review: srsResult.srs_next_review,
                    last_reviewed_at: srsResult.srs_last_reviewed_at,
                    last_quality: srsResult.srs_last_quality
                } as TenseSrsData;
            }
            updateWord(updatedWord);
        }

        setReviewedCount(c => c + 1);
        setIsFlipped(false);

        const delay = disableAnimations ? 0 : 300;

        setTimeout(() => {
            setSessionQueue(prev => {
                const remaining = prev.slice(1);
                const next = q < 3 ? [...remaining, updatedCard] : remaining;
                if (next.length === 0) setSessionDone(true);
                return next;
            });
            setTimeout(() => setIsTransitioning(false), delay);
        }, delay);
    }, [currentCard, words, updateWord, isTransitioning, disableAnimations]);

    const handleRetireFromSrs = useCallback(() => {
        if (!currentCard || isTransitioning) return;
        setIsTransitioning(true);
        
        const word = words.find(w => w.id === currentCard.wordId);
        
        setHistory({
            sessionQueue: [...sessionQueue],
            reviewedCount,
            wordBeforeUpdate: word ? { ...word } : {} as Word,
            actionType: 'retire',
            status: 'done'
        });

        if (word) {
            let updatedWord = { ...word };
            if (currentCard.tense === 'infinitiv') {
                updatedWord.srs_active = false;
            } else {
                const tenseField = `srs_${currentCard.tense}` as keyof Word;
                const currentTenseData = (updatedWord[tenseField] as TenseSrsData) || {};
                updatedWord[tenseField] = { ...currentTenseData, active: false };
            }
            updateWord(updatedWord);
        }

        setIsFlipped(false);
        const delay = disableAnimations ? 0 : 300;

        setTimeout(() => {
            setSessionQueue(prev => {
                const next = prev.slice(1);
                if (next.length === 0) setSessionDone(true);
                return next;
            });
            setTimeout(() => setIsTransitioning(false), delay);
        }, delay);
    }, [currentCard, words, updateWord, isTransitioning, disableAnimations, sessionQueue, reviewedCount]);

    const handleUndo = useCallback(() => {
        if (!history || history.status !== 'done') return;
        updateWord(history.wordBeforeUpdate);
        setSessionQueue(history.sessionQueue);
        setReviewedCount(history.reviewedCount);
        setSessionDone(false);
        setIsFlipped(false);
        setHistory(prev => prev ? { ...prev, status: 'undone' } : null);
    }, [history, updateWord]);

    const handleRedo = useCallback(() => {
        if (!history || history.status !== 'undone') return;
        if (history.actionType === 'rate' && history.ratedQuality !== undefined) {
            handleRateCard(history.ratedQuality);
        } else if (history.actionType === 'retire') {
            handleRetireFromSrs();
        }
    }, [history, handleRateCard, handleRetireFromSrs]);

    // Keyboard bindings
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!gameStarted) return;
            if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') return;
            const systemKeys = ['Tab', 'Control', 'Alt', 'Meta', 'Shift', 'CapsLock', 'Escape'];
            if (systemKeys.includes(e.key)) return;

            if (e.key === '5' || e.key.toLowerCase() === 'p') {
                handleRetireFromSrs();
                return;
            }

            if (e.key === ' ') {
                e.preventDefault();
            }

            if (!isFlipped) {
                if (e.key === ' ' || e.key === 'Enter') {
                    setIsFlipped(true);
                }
            } else {
                switch (e.key) {
                    case '1': handleRateCard(0); break;
                    case '2': handleRateCard(3); break;
                    case '3': handleRateCard(4); break;
                    case '4': handleRateCard(5); break;
                    case ' ': handleRateCard(4); break;
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isFlipped, handleRateCard, gameStarted, handleRetireFromSrs]);

    // Touch Gestures
    const handleTouchStart = (e: React.TouchEvent) => {
        touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        if (!touchStartRef.current || !gameStarted) return;
        const touchEnd = { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
        const dx = touchEnd.x - touchStartRef.current.x;
        const dy = touchEnd.y - touchStartRef.current.y;
        const absDx = Math.abs(dx);
        const absDy = Math.abs(dy);
        const minSwipeDistance = 50;

        if (Math.max(absDx, absDy) > minSwipeDistance) {
            if (!isFlipped) return;
            if (absDx > absDy) {
                if (dx > 0) handleRateCard(4); // Right swipe -> Good
                else handleRateCard(0); // Left swipe -> Again
            } else {
                if (dy > 0) handleRateCard(3); // Down swipe -> Hard
                else handleRateCard(5); // Up swipe -> Easy
            }
        } else {
            if (!isFlipped) setIsFlipped(true);
        }
        touchStartRef.current = null;
    };

    const sourceWord = words.find(w => w.id === currentCard?.wordId);
    const frontText    = startFace === 'swedish' ? currentCard?.swedish        : currentCard?.english;
    const backText     = startFace === 'swedish' ? currentCard?.english            : currentCard?.swedish;
    const frontExample = startFace === 'swedish' ? currentCard?.exampleSv : currentCard?.exampleEn;
    const backExample  = startFace === 'swedish' ? currentCard?.exampleEn         : currentCard?.exampleSv;
    const frontLang    = startFace === 'swedish' ? 'sv-SE'                     : currentLanguageInfo.ttsCode;
    const backLang     = startFace === 'swedish' ? currentLanguageInfo.ttsCode : 'sv-SE';

    const formatRelativeTime = (isoString: string | undefined): string => {
        if (!isoString) return '';
        const past = new Date(isoString).getTime();
        const now = new Date().getTime();
        const diffInSeconds = Math.floor((now - past) / 1000);
        if (diffInSeconds < 60) return t('game.smartCards.justNow');
        const units = [
            { name: 'years',   seconds: 31536000 },
            { name: 'months',  seconds: 2592000 },
            { name: 'weeks',   seconds: 604800 },
            { name: 'days',    seconds: 86400 },
            { name: 'hours',   seconds: 3600 },
            { name: 'minutes', seconds: 60 }
        ];
        for (const unit of units) {
            const count = Math.floor(diffInSeconds / unit.seconds);
            if (count >= 1) return t(`game.smartCards.${unit.name}Ago`, { count: String(count) });
        }
        return t('game.smartCards.justNow');
    };

    const getLastQualityLabel = (q: number | undefined): string => {
        if (q === undefined) return '';
        const map: Record<number, string> = { 0: t('game.smartCards.again'), 3: t('game.smartCards.hard'), 4: t('game.smartCards.good'), 5: t('game.smartCards.easy') };
        return map[q] || '';
    };

    const previewInterval = (q: number): string => {
        if (!currentCard) return '';
        const { srs_interval: i } = applySM2(currentCard, q);
        if (i === 0) return '<1d';
        if (i === 1) return '1d';
        return `~${i}d`;
    };

    // Pre-Game Setup Screen
    if (!gameStarted) {
        if (noSrsWords) {
            return (
                <div className="flex flex-col items-center justify-center text-center space-y-6 py-12">
                    <div className="text-6xl">🧠</div>
                    <h2 className="text-3xl font-bold">{t('game.smartCards.noSrsWords')}</h2>
                    <p className="text-gray-400 max-w-sm">{t('game.smartCards.noSrsWordsSub')}</p>
                    <button onClick={() => setScreen('manage-words')} className="bg-purple-600 text-white py-2 px-8 rounded-lg font-bold hover:bg-purple-700 transition-colors">
                        {t('game.smartCards.goToManageWords')}
                    </button>
                    <button onClick={() => setScreen('game-selection')} className="text-sm text-gray-400 hover:underline">
                        {t('game.backToGames')}
                    </button>
                </div>
            );
        }

        return (
            <div className="max-w-md mx-auto flex flex-col h-full justify-center p-4 pt-12 md:pt-20 fade-in">
                <div className="bg-base-200/50 backdrop-blur-md rounded-3xl p-8 border border-white/5 shadow-2xl relative overflow-hidden text-center">
                    <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-purple-500 to-indigo-500"></div>
                    
                    <div className="w-20 h-20 mx-auto bg-purple-500/20 rounded-2xl flex items-center justify-center mb-6 border border-purple-500/30">
                        <span className="text-4xl">🧠</span>
                    </div>

                    <h2 className="text-2xl font-bold mb-2">Smart Cards Setup</h2>
                    <p className="text-gray-400 text-sm mb-8">
                        You have <strong className="text-white">{totalDueRef.current}</strong> cards due for review today.
                    </p>

                    <div className="space-y-4 mb-8 text-left">
                        <label className="block text-sm font-semibold text-gray-300 uppercase tracking-wider mb-2">Show first</label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => setStartFace('swedish')}
                                className={`py-3 px-4 rounded-xl border text-sm font-bold transition-all ${startFace === 'swedish' ? 'bg-purple-600 border-purple-500 text-white shadow-[0_0_15px_rgba(147,51,234,0.3)]' : 'bg-base-300 border-white/5 text-gray-400 hover:bg-base-300/80'}`}
                            >
                                Svenska
                            </button>
                            <button
                                onClick={() => setStartFace('source')}
                                className={`py-3 px-4 rounded-xl border text-sm font-bold transition-all ${startFace === 'source' ? 'bg-purple-600 border-purple-500 text-white shadow-[0_0_15px_rgba(147,51,234,0.3)]' : 'bg-base-300 border-white/5 text-gray-400 hover:bg-base-300/80'}`}
                            >
                                {currentLanguageInfo.englishName}
                            </button>
                        </div>
                    </div>

                    <button
                        onClick={handleStartGame}
                        disabled={totalDueRef.current === 0}
                        className="w-full py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold rounded-xl hover:from-purple-500 hover:to-indigo-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                    >
                        {totalDueRef.current === 0 ? "All caught up!" : "Start Review Session"}
                    </button>

                    <button onClick={() => setScreen('game-selection')} className="mt-6 text-sm text-gray-500 hover:text-gray-300 transition-colors">
                        {t('game.backToGames')}
                    </button>
                </div>
            </div>
        );
    }

    if (sessionDone) {
        return (
            <div className="flex flex-col items-center justify-center text-center space-y-6 py-12">
                <div className="text-6xl">🎉</div>
                <h2 className="text-3xl font-bold">{t('game.smartCards.deckMastered')}</h2>
                <p className="text-gray-400 max-w-sm">{t('game.smartCards.deckMasteredSub')}</p>
                <div className="bg-base-200/50 backdrop-blur rounded-xl p-5 text-sm text-gray-400 border border-white/5">
                    {t('game.smartCards.reviewed', { count: String(reviewedCount) })}
                </div>
                <button onClick={() => setScreen('game-selection')} className="bg-purple-600 text-white py-2 px-8 rounded-xl font-bold hover:bg-purple-500 transition-colors shadow-lg">
                    {t('game.backToGames')}
                </button>
            </div>
        );
    }

    if (!currentCard) {
        return <div className="text-center py-12"><p className="text-xl">{t('game.flashcards.loading')}</p></div>;
    }

    const progressPct = totalDueRef.current > 0 ? Math.min((reviewedCount / totalDueRef.current) * 100, 100) : 0;
    const isNewCard = !currentCard.srs_next_review;
    const intervalBadge = isNewCard ? t('game.smartCards.newCard') : `${currentCard.srs_interval ?? 0}d`;

    return (
        <div className="max-w-4xl mx-auto flex flex-col h-full pt-4 pb-20 relative">
            <UndoButton 
                canUndo={history?.status === 'done'} 
                canRedo={history?.status === 'undone'} 
                onUndo={handleUndo} 
                onRedo={handleRedo} 
            />

            {/* Progress */}
            <div className="w-full max-w-xl mx-auto mb-6 shrink-0 px-4">
                <div className="flex justify-between text-xs text-gray-500 font-medium mb-2">
                    <span>{reviewedCount} reviewed</span>
                    <span>{totalDueRef.current} total due</span>
                </div>
                <div className="w-full h-2 bg-base-300/50 rounded-full overflow-hidden border border-white/5">
                    <div className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(147,51,234,0.5)]" style={{ width: `${progressPct}%` }} />
                </div>
            </div>

            {/* Main Card Area */}
            <div className="w-full max-w-xl mx-auto mb-8 shrink-0 swipe-area touch-none px-4" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
                <div className="aspect-[4/3] md:aspect-[16/10] perspective-[1200px]">
                    <div className={`card-inner relative w-full h-full cursor-pointer ${isFlipped ? 'is-flipped' : ''}`} onClick={() => setIsFlipped(!isFlipped)}>
                        
                        {/* Front Face */}
                        <div className="card-face absolute w-full h-full rounded-3xl p-8 text-center bg-gradient-to-b from-base-200 to-base-300 border border-white/10 shadow-[0_20px_40px_rgba(0,0,0,0.4)] flex flex-col items-center justify-center">
                            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-blue-500 to-purple-500 rounded-t-3xl opacity-50"></div>
                            
                            <div className="text-xs text-blue-400/80 mb-4 uppercase tracking-widest font-bold">
                                {startFace === 'swedish' ? 'Svenska' : currentLanguageInfo.englishName}
                            </div>
                            <span className="text-3xl md:text-5xl font-bold text-white drop-shadow-md">{frontText}</span>
                            {frontExample && <p className="text-base md:text-lg text-gray-400 mt-6 leading-relaxed max-w-sm">{frontExample}</p>}
                            
                            {/* Meta & Breadcrumbs */}
                            <div className="absolute top-4 left-4 flex gap-2">
                                <div className="text-[10px] md:text-xs text-white/80 bg-white/10 backdrop-blur px-3 py-1 rounded-full border border-white/5 font-semibold">
                                    {intervalBadge}
                                </div>
                            </div>

                            <button 
                                onClick={e => { e.stopPropagation(); toggleWordFlag(sourceWord?.id || ''); }}
                                className={`absolute top-4 right-4 p-2 rounded-full transition-all ${sourceWord?.flagged ? 'text-red-400 bg-red-400/20 shadow-[0_0_15px_rgba(248,113,113,0.3)]' : 'text-gray-500 hover:text-white hover:bg-white/10'}`}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill={sourceWord?.flagged ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
                                </svg>
                            </button>

                            <button onClick={e => { e.stopPropagation(); ttsService.speak(`${frontText} ${frontExample ?? ''}`, frontLang); }} className="absolute bottom-4 right-4 p-3 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728" /></svg>
                            </button>
                        </div>

                        {/* Back Face */}
                        <div className="card-face card-back absolute w-full h-full rounded-3xl p-8 text-center bg-gradient-to-b from-base-100 to-base-200 border border-white/10 shadow-[0_20px_40px_rgba(0,0,0,0.6)] flex flex-col items-center justify-center">
                            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-t-3xl opacity-50"></div>

                            <div className="text-xs text-emerald-400/80 mb-4 uppercase tracking-widest font-bold">
                                {startFace === 'swedish' ? currentLanguageInfo.englishName : 'Svenska'}
                            </div>
                            
                            <div className="flex items-center justify-center gap-3">
                                <span className="text-3xl md:text-5xl font-bold text-white drop-shadow-md">{backText}</span>
                                <div onClick={e => e.stopPropagation()}><NoteTooltip note={currentCard.note} /></div>
                            </div>
                            
                            {backExample && <p className="text-base md:text-lg text-gray-400 mt-6 leading-relaxed max-w-sm">{backExample}</p>}
                            
                            {/* Promote / Retire Button */}
                            <button 
                                onClick={e => { e.stopPropagation(); handleRetireFromSrs(); }}
                                className="absolute top-4 left-4 p-2 px-3 rounded-full bg-white/5 border border-white/10 hover:bg-yellow-500/20 hover:border-yellow-500/40 hover:text-yellow-400 text-gray-400 text-xs font-bold transition-all flex items-center gap-2"
                                title="Promote card (Mastered) [Shortcut: 5]"
                            >
                                👑 <span className="hidden sm:inline">Promote</span>
                            </button>

                            <button 
                                onClick={e => { e.stopPropagation(); toggleWordFlag(sourceWord?.id || ''); }}
                                className={`absolute top-4 right-4 p-2 rounded-full transition-all ${sourceWord?.flagged ? 'text-red-400 bg-red-400/20 shadow-[0_0_15px_rgba(248,113,113,0.3)]' : 'text-gray-500 hover:text-white hover:bg-white/10'}`}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill={sourceWord?.flagged ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
                                </svg>
                            </button>

                            <button onClick={e => { e.stopPropagation(); ttsService.speak(`${backText} ${backExample ?? ''}`, backLang); }} className="absolute bottom-4 right-4 p-3 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728" /></svg>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* SRS Controls */}
            <div className="w-full max-w-xl mx-auto shrink-0 px-4 pb-8">
                {!isFlipped ? (
                    <button onClick={() => setIsFlipped(true)} className="w-full py-4 md:py-5 bg-white/10 backdrop-blur-md border border-white/20 text-white font-bold rounded-2xl hover:bg-white/20 transition-all text-lg shadow-xl">
                        Tap to flip or press Space
                    </button>
                ) : (
                    <div className="grid grid-cols-4 gap-2 md:gap-3">
                        <button onClick={() => handleRateCard(0)} className="group relative flex flex-col items-center justify-center py-4 rounded-2xl bg-gradient-to-b from-red-900/50 to-red-950/80 border border-red-500/30 hover:border-red-400 hover:shadow-[0_0_20px_rgba(248,113,113,0.3)] transition-all overflow-hidden">
                            <span className="text-red-400 text-[10px] md:text-xs font-bold uppercase tracking-wider mb-1">Again</span>
                            <span className="text-white text-base md:text-lg font-bold">{previewInterval(0)}</span>
                            <div className="absolute inset-x-0 bottom-0 h-1 bg-red-500 opacity-50 group-hover:opacity-100 transition-opacity"></div>
                        </button>
                        <button onClick={() => handleRateCard(3)} className="group relative flex flex-col items-center justify-center py-4 rounded-2xl bg-gradient-to-b from-orange-900/50 to-orange-950/80 border border-orange-500/30 hover:border-orange-400 hover:shadow-[0_0_20px_rgba(251,146,60,0.3)] transition-all overflow-hidden">
                            <span className="text-orange-400 text-[10px] md:text-xs font-bold uppercase tracking-wider mb-1">Hard</span>
                            <span className="text-white text-base md:text-lg font-bold">{previewInterval(3)}</span>
                            <div className="absolute inset-x-0 bottom-0 h-1 bg-orange-500 opacity-50 group-hover:opacity-100 transition-opacity"></div>
                        </button>
                        <button onClick={() => handleRateCard(4)} className="group relative flex flex-col items-center justify-center py-4 rounded-2xl bg-gradient-to-b from-green-900/50 to-green-950/80 border border-green-500/30 hover:border-green-400 hover:shadow-[0_0_20px_rgba(74,222,128,0.3)] transition-all overflow-hidden">
                            <span className="text-green-400 text-[10px] md:text-xs font-bold uppercase tracking-wider mb-1">Good</span>
                            <span className="text-white text-base md:text-lg font-bold">{previewInterval(4)}</span>
                            <div className="absolute inset-x-0 bottom-0 h-1 bg-green-500 opacity-50 group-hover:opacity-100 transition-opacity"></div>
                        </button>
                        <button onClick={() => handleRateCard(5)} className="group relative flex flex-col items-center justify-center py-4 rounded-2xl bg-gradient-to-b from-blue-900/50 to-blue-950/80 border border-blue-500/30 hover:border-blue-400 hover:shadow-[0_0_20px_rgba(96,165,250,0.3)] transition-all overflow-hidden">
                            <span className="text-blue-400 text-[10px] md:text-xs font-bold uppercase tracking-wider mb-1">Easy</span>
                            <span className="text-white text-base md:text-lg font-bold">{previewInterval(5)}</span>
                            <div className="absolute inset-x-0 bottom-0 h-1 bg-blue-500 opacity-50 group-hover:opacity-100 transition-opacity"></div>
                        </button>
                    </div>
                )}
            </div>

            <div className="text-center text-sm text-gray-500 mt-2">
                <button onClick={() => setScreen('game-selection')} className="hover:text-white transition-colors">Exit Session</button>
            </div>
        </div>
    );
};

export default SmartCardsGameScreen;
