import React, { useState, useMemo } from 'react';
import { Screen, Word, TenseSrsData } from '../../types';
import { useWords } from '../../contexts/WordsContext';
import { useSettings } from '../../contexts/SettingsContext';
import { useTranslation } from '../../hooks/useTranslation';

import { ttsService } from '../../services/ttsService';

interface VerbGameScreenProps {
    setScreen: (screen: Screen) => void;
}

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
}

const VerbGameScreen: React.FC<VerbGameScreenProps> = ({ setScreen }) => {
    const { words, updateWord } = useWords();
    const { currentSourceLanguage } = useSettings();
    const { t } = useTranslation();

    const [hasStarted, setHasStarted] = useState(false);
    const [intensityLimit, setIntensityLimit] = useState(20);
    const [initialVerbs, setInitialVerbs] = useState(1);
    const [startFace, setStartFace] = useState<'swedish' | 'english'>('swedish');
    
    const [activeStack, setActiveStack] = useState<VirtualCard[]>([]);
    const [currentCardIndex, setCurrentCardIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    
    // Build the pool of available tenses across all active verbs
    const availablePool = useMemo(() => {
        const pool: VirtualCard[] = [];
        words.forEach(w => {
            if (w.wordType?.toLowerCase() !== 'verb' || !w.verb_game_active) return;
            
            const addIfUnpromoted = (tense: TenseType, sv: string, en: string, exSv: string, exEn: string, rating: number) => {
                if (rating > 1 && sv) {
                    const scoreHistory = w[`verb_history_${tense}` as keyof Word] as number[] || [];
                    const shownCount = w[`verb_shown_${tense}` as keyof Word] as number || 0;
                    
                    pool.push({
                        wordId: w.id,
                        tense,
                        swedish: sv,
                        english: en,
                        exampleSv: exSv,
                        exampleEn: exEn,
                        rating: rating,
                        scoreHistory,
                        shownCount
                    });
                }
            };

            addIfUnpromoted('infinitiv', w.swedish, w.translations['en']?.word || '', w.swedishExample || '', w.translations['en']?.example || '', w.verb_rating_infinitiv ?? 5);
            addIfUnpromoted('present', w.present || '', w.presentTranslation || '', w.presentExample || '', w.presentExampleTranslation || '', w.verb_rating_present ?? 5);
            addIfUnpromoted('preteritum', w.preteritum || '', w.preteritumTranslation || '', w.preteritumExample || '', w.preteritumExampleTranslation || '', w.verb_rating_preteritum ?? 5);
            addIfUnpromoted('supinium', w.supinium || '', w.supiniumTranslation || '', w.supiniumExample || '', w.supiniumExampleTranslation || '', w.verb_rating_supinium ?? 5);
        });
        return pool;
    }, [words]);

    const startGame = () => {
        // Build initial stack
        let initialStack: VirtualCard[] = [];
        let usedWordIds = new Set<string>();
        
        // Group pool by wordId to pull full verbs initially
        const groupedByWord: Record<string, VirtualCard[]> = {};
        availablePool.forEach(c => {
            if (!groupedByWord[c.wordId]) groupedByWord[c.wordId] = [];
            groupedByWord[c.wordId].push(c);
        });
        
        const wordIds = Object.keys(groupedByWord).sort(() => 0.5 - Math.random());
        for (let i = 0; i < Math.min(initialVerbs, wordIds.length); i++) {
            const wid = wordIds[i];
            initialStack = [...initialStack, ...groupedByWord[wid]];
            usedWordIds.add(wid);
        }
        
        // Shuffle the initial stack
        initialStack.sort(() => 0.5 - Math.random());
        if (initialStack.length > 0) {
            initialStack[0].shownCount++;
            const first = initialStack[0];
            const w = words.find(x => x.id === first.wordId);
            if (w) {
                const shownField = `verb_shown_${first.tense}` as keyof Word;
                updateWord({ ...w, [shownField]: first.shownCount });
            }
        }
        setActiveStack(initialStack);
        setHasStarted(true);
        setIsFlipped(false);
        setCurrentCardIndex(0);
    };

    const handleRate = (rating: number) => {
        const currentCard = activeStack[currentCardIndex];
        const word = words.find(w => w.id === currentCard.wordId);
        if (!word) return;

        // 1. Update the rating on the Word object in context
        const ratingField = `verb_rating_${currentCard.tense}` as keyof Word;
        const historyField = `verb_history_${currentCard.tense}` as keyof Word;
        const shownField = `verb_shown_${currentCard.tense}` as keyof Word;

        const currentHistory = currentCard.scoreHistory || [];
        const updatedHistory = [...currentHistory, rating].slice(-3);

        const updatedWord: Word = { 
            ...word, 
            [ratingField]: rating,
            [historyField]: updatedHistory,
            [shownField]: currentCard.shownCount
        };
        
        let promoted = false;
        if (rating === 1) {
            // Promote to SRS
            promoted = true;
            if (currentCard.tense === 'infinitiv') {
                updatedWord.srs_active = true;
                if (!updatedWord.srs_added_at) updatedWord.srs_added_at = new Date().toISOString();
            } else {
                const srsField = `srs_${currentCard.tense}` as keyof Word;
                updatedWord[srsField] = { active: true, added_at: new Date().toISOString() } as TenseSrsData;
            }
        }
        
        updateWord(updatedWord);

        // 2. Update the active stack
        let newStack = [...activeStack];
        if (promoted) {
            // Remove from stack
            newStack.splice(currentCardIndex, 1);
        } else {
            // Update rating and history in the stack
            newStack[currentCardIndex] = { 
                ...currentCard, 
                rating,
                scoreHistory: updatedHistory
            };
        }

        // 3. Dynamic Injection: check if sum < intensityLimit
        const currentSum = newStack.reduce((sum, card) => sum + card.rating, 0);
        if (currentSum < intensityLimit) {
            // Find a tense from the pool that isn't in the stack
            const availableToInject = availablePool.filter(poolCard => 
                !newStack.some(stackCard => stackCard.wordId === poolCard.wordId && stackCard.tense === poolCard.tense) &&
                // Prevent injecting the card we just promoted (since availablePool might be stale)
                !(promoted && poolCard.wordId === currentCard.wordId && poolCard.tense === currentCard.tense)
            );
            
            if (availableToInject.length > 0) {
                // Pick a random tense
                const injectedCard = availableToInject[Math.floor(Math.random() * availableToInject.length)];
                newStack.push({ ...injectedCard });
            }
        }

        if (newStack.length === 0) {
            // Game Over or completely empty
            setActiveStack([]);
            return;
        }

        // 4. Determine next card (strict highest unfamiliarity / confidence first, but prioritize same verb stem)
        let candidates = newStack.map((c, i) => ({ card: c, idx: i }));
        // Only filter out the current card index if we didn't splice it out (if we spliced it, the card at currentCardIndex is already a different card!)
        if (!promoted && candidates.length > 1) {
            candidates = candidates.filter(c => c.idx !== currentCardIndex);
        }
        
        // Find if there are any remaining tenses for the same verb stem
        const sameWordCandidates = candidates.filter(c => c.card.wordId === currentCard.wordId);
        
        let chosen;
        if (sameWordCandidates.length > 0) {
            // Pick max rating among the same word candidates
            const maxRating = Math.max(...sameWordCandidates.map(c => c.card.rating));
            const topSameWordCandidates = sameWordCandidates.filter(c => c.card.rating === maxRating);
            chosen = topSameWordCandidates[Math.floor(Math.random() * topSameWordCandidates.length)];
        } else {
            // No more forms for the same verb stem, fallback to max rating in all candidates
            const maxRating = Math.max(...candidates.map(c => c.card.rating));
            const topCandidates = candidates.filter(c => c.card.rating === maxRating);
            chosen = topCandidates[Math.floor(Math.random() * topCandidates.length)];
        }
        
        const nextIdx = chosen.idx;
        const nxt = { ...newStack[nextIdx], shownCount: newStack[nextIdx].shownCount + 1 };
        newStack[nextIdx] = nxt;
        
        const wNxt = words.find(x => x.id === nxt.wordId);
        if (wNxt) {
            const nxtShownField = `verb_shown_${nxt.tense}` as keyof Word;
            updateWord({ ...wNxt, [nxtShownField]: nxt.shownCount });
        }

        setActiveStack(newStack);
        setCurrentCardIndex(nextIdx);
        setIsFlipped(false);
    };

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
                        <label className="block text-sm font-bold text-gray-400 mb-2">Initial Verbs in Stack ({initialVerbs})</label>
                        <input 
                            type="range" 
                            min="1" 
                            max="10" 
                            value={initialVerbs} 
                            onChange={(e) => {
                                const val = parseInt(e.target.value);
                                setInitialVerbs(val);
                                // Auto-adjust intensity limit if it's too low for the initial verbs
                                if (intensityLimit < val * 20) {
                                    setIntensityLimit(val * 20);
                                }
                            }}
                            className="range range-primary" 
                        />
                        <p className="text-xs text-gray-500 mt-1">1 verb = 4 tenses (forms).</p>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-400 mb-2">Intensity Limit (Sum: {intensityLimit})</label>
                        <input 
                            type="range" 
                            min="10" 
                            max="100" 
                            step="5"
                            value={intensityLimit} 
                            onChange={(e) => setIntensityLimit(parseInt(e.target.value))}
                            className="range range-secondary" 
                        />
                        <p className="text-xs text-gray-500 mt-1">Maximum allowed sum of unfamiliarity ratings. New tenses are injected when the stack's total sum falls below this limit.</p>
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

                    <div className="bg-base-300 p-4 rounded-lg">
                        <p className="text-sm text-center mb-2">Available unpromoted tenses: <strong className="text-blue-400">{availablePool.length}</strong></p>
                        {availablePool.length === 0 && (
                            <p className="text-xs text-red-400 text-center">No active verbs found. Go to Manage Words to enable the Verb Game for your verbs.</p>
                        )}
                    </div>

                    <button 
                        onClick={startGame} 
                        disabled={availablePool.length === 0}
                        className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-lg shadow-lg disabled:opacity-50 transition-all transform hover:scale-[1.02]"
                    >
                        Start Game
                    </button>
                </div>
            </div>
        );
    }

    if (activeStack.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh]">
                <h2 className="text-3xl font-bold text-green-500 mb-4">Stack Cleared!</h2>
                <p className="text-center text-gray-400 mb-6">You've promoted all active tenses to the SRS system.</p>
                <button onClick={() => setHasStarted(false)} className="px-6 py-2 bg-base-300 rounded-lg hover:bg-base-100 transition-colors">Play Again</button>
            </div>
        );
    }

    const currentCard = activeStack[currentCardIndex];
    const currentSum = activeStack.reduce((sum, c) => sum + c.rating, 0);
    const uniqueVerbsCount = new Set(activeStack.map(c => c.wordId)).size;

    return (
        <div className="max-w-2xl mx-auto flex flex-col items-center">
            {/* Header Stats */}
            <div className="w-full flex justify-between items-center mb-4 px-4 py-2 bg-base-200 rounded-lg shadow-sm border border-base-300">
                <div className="flex flex-col">
                    <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">Stack stats</span>
                    <span className="text-base font-bold">{activeStack.length} cards from {uniqueVerbsCount} {uniqueVerbsCount === 1 ? 'verb' : 'verbs'}</span>
                </div>
                <div className="flex flex-col items-end">
                    <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">Unfamiliarity Sum</span>
                    <span className="text-base font-bold text-blue-400">{currentSum} / {intensityLimit}</span>
                </div>
            </div>

            {/* In-Game intensityLimit modifier slider */}
            <div className="w-full mb-6 px-4 py-2 bg-base-200 rounded-lg shadow-sm border border-base-300 flex flex-col gap-1">
                <div className="flex justify-between items-center text-xs font-bold text-gray-400">
                    <span>Intensity Limit (Limit: {intensityLimit})</span>
                    <span>Adjust limit while playing</span>
                </div>
                <input 
                    type="range" 
                    min="10" 
                    max="100" 
                    step="5"
                    value={intensityLimit} 
                    onChange={(e) => setIntensityLimit(parseInt(e.target.value))}
                    className="range range-xs range-secondary" 
                />
            </div>

            {/* Flashcard — uses the same CSS classes as FlashcardGameScreen */}
            <div className="w-full aspect-video min-h-[300px] perspective-[1000px] cursor-pointer mb-8"
                onClick={() => setIsFlipped(!isFlipped)}
            >
                <div className={`card-inner w-full h-full relative shadow-xl rounded-2xl ${isFlipped ? 'is-flipped' : ''}`}>
                    
                    {/* FRONT — Swedish only, updated premium styling */}
                    <div className="card-face absolute inset-0 bg-gradient-to-br from-indigo-900/40 to-base-300 border border-indigo-500/20 rounded-2xl flex flex-col items-center justify-center p-8">
                        <span className="absolute top-4 left-4 px-3 py-1 bg-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-widest rounded-full">
                            {currentCard.tense}
                        </span>
                        <span className="absolute top-4 right-4 px-3 py-1 bg-base-100/50 text-gray-400 text-xs font-bold rounded-full flex gap-2">
                            <span>Rating: {currentCard.rating}</span>
                            {currentCard.scoreHistory.length > 0 && (
                                <span className="text-gray-500">• Scores: {currentCard.scoreHistory.join(', ')}</span>
                            )}
                            <span className="text-gray-500">• Views: {currentCard.shownCount}</span>
                        </span>
                        
                        {startFace === 'swedish' ? (
                            <>
                                <h2 className="text-5xl md:text-6xl font-bold text-center drop-shadow-md mb-4 text-indigo-100">{currentCard.swedish}</h2>
                                {currentCard.exampleSv && (
                                    <p className="text-base italic text-gray-400 text-center max-w-md">{currentCard.exampleSv}</p>
                                )}
                            </>
                        ) : (
                            <>
                                <h2 className="text-4xl md:text-5xl font-bold text-center drop-shadow-md mb-4 text-indigo-100 leading-tight">{currentCard.english || '---'}</h2>
                                {currentCard.exampleEn && (
                                    <p className="text-base italic text-gray-400 text-center max-w-md">{currentCard.exampleEn}</p>
                                )}
                            </>
                        )}
                        <p className="absolute bottom-4 left-0 right-0 text-sm text-gray-500 animate-pulse text-center">Click to flip</p>
                    </div>

                    {/* BACK — Complete Information */}
                    <div className="card-face card-back absolute inset-0 bg-gradient-to-br from-indigo-900/40 to-base-300 border border-indigo-500/20 rounded-2xl flex flex-col items-center justify-center p-8 text-center overflow-y-auto">
                        <span className="absolute top-4 left-4 px-3 py-1 bg-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-widest rounded-full">
                            {currentCard.tense}
                        </span>
                        <span className="absolute top-4 right-4 px-3 py-1 bg-base-100/50 text-gray-400 text-xs font-bold rounded-full flex gap-2">
                            <span>Rating: {currentCard.rating}</span>
                            {currentCard.scoreHistory.length > 0 && (
                                <span className="text-gray-500">• Scores: {currentCard.scoreHistory.join(', ')}</span>
                            )}
                            <span className="text-gray-500">• Views: {currentCard.shownCount}</span>
                        </span>
                        
                        <h2 
                            onClick={(e) => { e.stopPropagation(); ttsService.speak(currentCard.swedish, 'sv-SE'); }}
                            className="text-3xl md:text-4xl font-bold mb-1 text-indigo-100 leading-tight cursor-pointer hover:text-indigo-300 transition-colors"
                        >
                            {currentCard.swedish}
                        </h2>
                        <div className="w-16 h-0.5 bg-indigo-500/30 mb-2"></div>
                        <h2 
                            onClick={(e) => { e.stopPropagation(); ttsService.speak(currentCard.english || '', 'en-GB'); }}
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
                                        onClick={(e) => { e.stopPropagation(); ttsService.speak(currentCard.exampleEn || '', 'en-GB'); }}
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

            {/* Rating Controls — only visible after flip */}
            <div className={`w-full transition-all duration-300 ${isFlipped ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
                <h3 className="text-center text-sm font-bold text-gray-400 mb-3 uppercase tracking-widest">Rate your confidence</h3>
                <div className="flex gap-3 justify-center w-full">
                    {[
                        { val: 1, label: 'Fluent', color: 'bg-green-600 hover:bg-green-500 text-white', sub: 'Promote to SRS' },
                        { val: 2, label: 'Good', color: 'bg-emerald-600/50 hover:bg-emerald-500/60 text-emerald-100', sub: '' },
                        { val: 3, label: 'Okay', color: 'bg-yellow-600/50 hover:bg-yellow-500/60 text-yellow-100', sub: '' },
                        { val: 4, label: 'Hard', color: 'bg-orange-600/50 hover:bg-orange-500/60 text-orange-100', sub: '' },
                        { val: 5, label: 'Unknown', color: 'bg-red-600/50 hover:bg-red-500/60 text-red-100', sub: '' }
                    ].map(btn => (
                        <button
                            key={btn.val}
                            onClick={(e) => { e.stopPropagation(); handleRate(btn.val); }}
                            className={`flex-1 py-3 px-2 rounded-xl font-bold transition-all transform hover:scale-105 active:scale-95 shadow-md flex flex-col items-center justify-center ${btn.color}`}
                        >
                            <span className="text-lg mb-0.5">{btn.val}</span>
                            <span className="text-[10px] uppercase opacity-80">{btn.label}</span>
                            {btn.sub && <span className="text-[8px] mt-0.5 opacity-60 text-center leading-tight">{btn.sub}</span>}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default VerbGameScreen;
