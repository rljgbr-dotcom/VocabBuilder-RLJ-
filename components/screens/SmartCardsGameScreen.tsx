import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useWords } from '../../contexts/WordsContext';
import { useSettings } from '../../contexts/SettingsContext';
import { Screen, Word } from '../../types';
import { ttsService } from '../../services/ttsService';
import { useTranslation } from '../../hooks/useTranslation';
import { applySM2, isDueToday, todayISO } from '../../services/srsService';

interface SmartCardsGameScreenProps {
    setScreen: (screen: Screen) => void;
}

const SmartCardsGameScreen: React.FC<SmartCardsGameScreenProps> = ({ setScreen }) => {
    const { words, updateWord } = useWords();
    const { currentLanguageInfo, currentSourceLanguage } = useSettings();
    const { t } = useTranslation();

    // The session queue is a flat array; we work through index 0 each time,
    // and push "Again" cards to the back.
    const [sessionQueue, setSessionQueue] = useState<Word[]>([]);
    const [isFlipped, setIsFlipped]       = useState(false);
    const [sessionDone, setSessionDone]   = useState(false);
    const [reviewedCount, setReviewedCount] = useState(0);
    const totalDueRef = useRef(0);

    // ── Initialise ─────────────────────────────────────────────────────────────
    useEffect(() => {
        const due = words.filter(
            w => w.active && w.translations[currentSourceLanguage]?.word && isDueToday(w)
        );
        totalDueRef.current = due.length;
        if (due.length === 0) {
            setSessionDone(true);
        } else {
            setSessionQueue(due);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // only on mount

    const currentWord: Word | undefined = sessionQueue[0];

    // ── Rate card ──────────────────────────────────────────────────────────────
    const handleRateCard = useCallback((q: number) => {
        if (!currentWord) return;

        const srsResult = applySM2(currentWord, q);
        const updatedWord: Word = { ...currentWord, ...srsResult };
        updateWord(updatedWord);

        setReviewedCount(c => c + 1);
        setIsFlipped(false);

        setSessionQueue(prev => {
            // Remove the card we just rated from the front
            const remaining = prev.slice(1);

            // If the user failed (q < 3), push it to the back so they see it again
            const next = q < 3 ? [...remaining, updatedWord] : remaining;

            if (next.length === 0) {
                setSessionDone(true);
            }
            return next;
        });
    }, [currentWord, updateWord]);

    // ── Text/audio helpers ──────────────────────────────────────────────────────
    const startFace = (localStorage.getItem('flashcard_start_face') as 'swedish' | 'source') || 'swedish';
    const translation  = currentWord?.translations[currentSourceLanguage] ?? { word: '—', example: '' };
    const frontText    = startFace === 'swedish' ? currentWord?.swedish        : translation.word;
    const backText     = startFace === 'swedish' ? translation.word            : currentWord?.swedish;
    const frontExample = startFace === 'swedish' ? currentWord?.swedishExample : translation.example;
    const backExample  = startFace === 'swedish' ? translation.example         : currentWord?.swedishExample;
    const frontLang    = startFace === 'swedish' ? 'sv-SE'                     : currentLanguageInfo.ttsCode;
    const backLang     = startFace === 'swedish' ? currentLanguageInfo.ttsCode : 'sv-SE';

    // Estimated next interval preview for button subtitles
    const previewInterval = (q: number): string => {
        if (!currentWord) return '';
        const { srs_interval: i } = applySM2(currentWord, q);
        if (i === 0) return '<1d';
        if (i === 1) return '1d';
        return `~${i}d`;
    };

    // ── Deck mastered ──────────────────────────────────────────────────────────
    if (sessionDone) {
        return (
            <div className="flex flex-col items-center justify-center text-center space-y-6 py-12">
                <div className="text-6xl">🎉</div>
                <h2 className="text-3xl font-bold">{t('game.smartCards.deckMastered')}</h2>
                <p className="text-gray-400 max-w-sm">{t('game.smartCards.deckMasteredSub')}</p>
                <div className="bg-base-200 rounded-xl p-5 text-sm text-gray-400">
                    {t('game.smartCards.reviewed', { count: String(reviewedCount) })}
                </div>
                <button
                    onClick={() => setScreen('game-selection')}
                    className="bg-primary text-primary-content py-2 px-8 rounded-lg font-bold hover:bg-primary-focus transition-colors"
                >
                    {t('game.backToGames')}
                </button>
            </div>
        );
    }

    if (!currentWord) {
        return <div className="text-center py-12"><p className="text-xl">{t('game.flashcards.loading')}</p></div>;
    }

    const progressPct = totalDueRef.current > 0
        ? Math.min((reviewedCount / totalDueRef.current) * 100, 100)
        : 0;

    const isNewCard = !currentWord.srs_next_review;
    const intervalBadge = isNewCard ? t('game.smartCards.newCard') : `${currentWord.srs_interval ?? 0}d`;

    return (
        <div className="max-w-4xl mx-auto flex flex-col h-full">
            {/* Progress bar */}
            <div className="w-full max-w-xl mx-auto mb-4 shrink-0">
                <div className="flex justify-between text-xs text-gray-400 mb-1.5">
                    <span>{t('game.smartCards.reviewed', { count: String(reviewedCount) })}</span>
                    <span>{t('game.smartCards.dueToday', { count: String(totalDueRef.current) })}</span>
                </div>
                <div className="w-full h-1.5 bg-base-300 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-primary rounded-full transition-all duration-500"
                        style={{ width: `${progressPct}%` }}
                    />
                </div>
            </div>

            {/* Card */}
            <div className="w-full max-w-xl mx-auto mb-5 shrink-0">
                <div className="aspect-[16/9] perspective-[1000px]">
                    <div
                        className={`card-inner relative w-full h-full cursor-pointer ${isFlipped ? 'is-flipped' : ''}`}
                        onClick={() => !isFlipped && setIsFlipped(true)}
                    >
                        {/* Front */}
                        <div className="card-face absolute w-full h-full bg-base-200 rounded-xl flex flex-col items-center justify-center p-6 text-center">
                            <div className="text-xs text-gray-500 mb-3 uppercase tracking-wider font-medium">
                                {startFace === 'swedish' ? 'Svenska' : currentLanguageInfo.englishName}
                            </div>
                            <span className="text-2xl md:text-4xl font-bold">{frontText}</span>
                            {frontExample && <p className="text-sm italic text-gray-400 mt-3 leading-relaxed">{frontExample}</p>}
                            <button
                                onClick={e => { e.stopPropagation(); ttsService.speak(`${frontText} ${frontExample ?? ''}`, frontLang); }}
                                className="speaker-btn absolute bottom-3 right-3 p-2 rounded-full hover:bg-base-300/50 transition-colors"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728" />
                                </svg>
                            </button>
                            {/* SRS badge */}
                            <div className="absolute top-3 left-3 text-xs text-gray-500 bg-base-300 px-2 py-0.5 rounded-full">
                                {intervalBadge}
                            </div>
                        </div>

                        {/* Back */}
                        <div className="card-face card-back absolute w-full h-full bg-base-300 rounded-xl flex flex-col items-center justify-center p-6 text-center">
                            <div className="text-xs text-gray-500 mb-3 uppercase tracking-wider font-medium">
                                {startFace === 'swedish' ? currentLanguageInfo.englishName : 'Svenska'}
                            </div>
                            <span className="text-2xl md:text-4xl font-bold">{backText}</span>
                            {backExample && <p className="text-sm italic text-gray-400 mt-3 leading-relaxed">{backExample}</p>}
                            <button
                                onClick={e => { e.stopPropagation(); ttsService.speak(`${backText} ${backExample ?? ''}`, backLang); }}
                                className="speaker-btn absolute bottom-3 right-3 p-2 rounded-full hover:bg-base-100/50 transition-colors"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Controls */}
            <div className="w-full max-w-xl mx-auto shrink-0 space-y-3">
                {!isFlipped ? (
                    <button
                        onClick={() => setIsFlipped(true)}
                        className="w-full py-4 bg-primary text-primary-content font-bold rounded-xl hover:bg-primary-focus transition-colors text-lg"
                    >
                        {t('game.smartCards.showAnswer')}
                    </button>
                ) : (
                    <>
                        <p className="text-center text-xs text-gray-400 uppercase tracking-wider">
                            {t('game.smartCards.howWell')}
                        </p>
                        <div className="grid grid-cols-4 gap-2">
                            <button
                                onClick={() => handleRateCard(0)}
                                className="flex flex-col items-center py-3 px-1 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold transition-colors"
                            >
                                <span className="text-sm">{t('game.smartCards.again')}</span>
                                <span className="text-xs opacity-70 mt-0.5">{previewInterval(0)}</span>
                            </button>
                            <button
                                onClick={() => handleRateCard(3)}
                                className="flex flex-col items-center py-3 px-1 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold transition-colors"
                            >
                                <span className="text-sm">{t('game.smartCards.hard')}</span>
                                <span className="text-xs opacity-70 mt-0.5">{previewInterval(3)}</span>
                            </button>
                            <button
                                onClick={() => handleRateCard(4)}
                                className="flex flex-col items-center py-3 px-1 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold transition-colors"
                            >
                                <span className="text-sm">{t('game.smartCards.good')}</span>
                                <span className="text-xs opacity-70 mt-0.5">{previewInterval(4)}</span>
                            </button>
                            <button
                                onClick={() => handleRateCard(5)}
                                className="flex flex-col items-center py-3 px-1 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-colors"
                            >
                                <span className="text-sm">{t('game.smartCards.easy')}</span>
                                <span className="text-xs opacity-70 mt-0.5">{previewInterval(5)}</span>
                            </button>
                        </div>
                    </>
                )}
            </div>

            {/* Remaining count + back link */}
            <div className="max-w-xl mx-auto flex justify-between items-center pt-4 w-full shrink-0 text-xs text-gray-500">
                <span>{t('game.smartCards.remaining', { count: String(sessionQueue.length) })}</span>
                <button onClick={() => setScreen('game-selection')} className="hover:underline">
                    {t('game.backToGames')}
                </button>
            </div>
        </div>
    );
};

export default SmartCardsGameScreen;
