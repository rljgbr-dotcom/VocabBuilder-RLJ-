import React, { useState } from 'react';
import { AnalyzedWordContext } from '../../types';

interface WordDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    data: AnalyzedWordContext | null;
    onSaveToDeck: (chosenWord: string, addToSrs: boolean) => void;
    onUpgradeWithAi?: (word: string, sentence: string) => void;
    onSpeak?: (text: string) => void;
}

export const WordDetailModal: React.FC<WordDetailModalProps> = ({
    isOpen,
    onClose,
    data,
    onSaveToDeck,
    onUpgradeWithAi,
    onSpeak,
}) => {
    if (!isOpen || !data) return null;

    const [saveWordChoice, setSaveWordChoice] = useState<'base' | 'exact' | 'modern'>(
        data.isArchaic && data.modernEquivalent ? 'modern' : 'base'
    );
    const [addToSrs, setAddToSrs] = useState(true);

    const handleSpeakInternal = (text: string) => {
        if (onSpeak) {
            onSpeak(text);
        } else if (text) {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'sv-SE';
            window.speechSynthesis.speak(utterance);
        }
    };

    // Determine actual word to save based on user's choice
    let wordToSave = data.targetWord;
    if (saveWordChoice === 'modern' && data.modernEquivalent) {
        wordToSave = data.modernEquivalent;
    } else if (saveWordChoice === 'base' && data.baseForm) {
        wordToSave = data.baseForm;
    }

    const hasAlternativeForms = Boolean(
        (data.baseForm && data.baseForm.toLowerCase() !== data.targetWord.toLowerCase()) ||
        (data.isArchaic && data.modernEquivalent)
    );

    // Highlight targetWord inside the sentence for visual clarity
    const renderHighlightedSentence = () => {
        if (!data.sentenceSwedish || !data.targetWord) return data.sentenceSwedish || '';
        
        const cleanTarget = data.targetWord.replace(/^[.,!?;:()"“”'’—-]+|[.,!?;:()"“”'’—-]+$/g, '').trim();
        const escaped = cleanTarget.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`(\\b${escaped}\\b)`, 'gi');
        const parts = data.sentenceSwedish.split(regex);

        return parts.map((part, index) => {
            if (part.toLowerCase() === cleanTarget.toLowerCase()) {
                return (
                    <mark key={index} className="bg-primary/30 text-primary font-bold px-1 py-0.5 rounded border-b-2 border-primary">
                        {part}
                    </mark>
                );
            }
            return <span key={index}>{part}</span>;
        });
    };

    return (
        <div 
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4 animate-fade-in"
            onClick={e => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            {/* Modal Box matching the exact styling of the translate modal for phone screens */}
            <div 
                className="bg-base-100 rounded-t-[28px] sm:rounded-3xl w-full sm:max-w-md border-t sm:border border-white/10 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] sm:shadow-2xl flex flex-col max-h-[88dvh] sm:max-h-[82vh] overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                {/* Mobile Drag Indicator */}
                <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mt-3 mb-1 shrink-0 sm:hidden" />

                {/* Header */}
                <div className="flex justify-between items-center px-4 sm:px-6 pt-2 pb-3 border-b border-white/10 shrink-0">
                    <div className="flex items-center gap-2.5 min-w-0">
                        {data.isLibrary ? (
                            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-md shrink-0">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                        ) : data.isAi ? (
                            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-white shadow-md shrink-0">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                            </div>
                        ) : (
                            <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-md shrink-0">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                </svg>
                            </div>
                        )}

                        <div className="min-w-0">
                            <span className={`text-[10px] uppercase font-bold tracking-wider block ${
                                data.isLibrary ? 'text-emerald-400' : data.isAi ? 'text-cyan-400' : 'text-amber-400'
                            }`}>
                                {data.isLibrary ? 'In Library' : data.isAi ? 'AI Context' : 'Dictionary Word'}
                            </span>
                            <div className="flex items-center gap-1.5">
                                <h2 className="text-lg sm:text-xl font-black text-white truncate">{data.targetWord}</h2>
                                {data.baseForm && data.baseForm.toLowerCase() !== data.targetWord.toLowerCase() && (
                                    <span className="text-[11px] text-gray-400 font-semibold truncate">({data.baseForm})</span>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                        <button
                            onClick={() => handleSpeakInternal(data.targetWord)}
                            className="w-9 h-9 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary flex items-center justify-center active:scale-95 transition-colors"
                            title="Listen to Swedish pronunciation"
                            aria-label="Listen"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                            </svg>
                        </button>
                        <button 
                            onClick={onClose} 
                            className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 active:scale-95 transition-all shrink-0"
                            aria-label="Close"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Scrollable Body */}
                <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-3.5 space-y-3 text-sm">
                    {/* Primary Translation Card */}
                    <div className="p-3.5 rounded-2xl bg-base-200/80 border border-white/5 space-y-1">
                        <div className="flex items-center justify-between">
                            <span className="block text-[10px] font-bold uppercase tracking-wider text-gray-400">
                                {data.isLibrary ? 'Saved Flashcard Meaning' : 'Translation Meaning'}
                            </span>
                            {!data.isAi && !data.isLibrary && (
                                <span className="text-[10px] text-amber-400 font-semibold italic">
                                    (Non-AI draft translation)
                                </span>
                            )}
                        </div>

                        <div className={`text-base sm:text-lg font-black text-white ${!data.isAi && !data.isLibrary ? 'italic text-amber-100' : ''}`}>
                            {data.contextMeaning || data.literalMeaning || 'No translation available'}
                        </div>

                        {data.literalMeaning && data.literalMeaning !== data.contextMeaning && (
                            <div className="pt-1 mt-1 border-t border-white/5 text-xs text-gray-300">
                                <span className="text-[10px] uppercase font-bold text-gray-400 mr-1.5">Literal:</span>
                                {data.literalMeaning}
                            </div>
                        )}

                        {data.dependencies && data.dependencies.length > 0 && (
                            <div className="pt-1 mt-1 border-t border-white/5 text-xs text-amber-300 flex items-center gap-1.5">
                                <span>🔗 Phrasal particle:</span>
                                <span className="font-bold underline">{data.dependencies.join(', ')}</span>
                            </div>
                        )}
                    </div>

                    {/* Synonyms Section */}
                    {data.synonyms && data.synonyms.length > 0 && (
                        <div className="p-3 rounded-2xl bg-base-200/80 border border-white/5 space-y-1.5">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                </svg>
                                Synonyms (Synonymer)
                            </span>
                            <div className="flex flex-wrap gap-1.5 pt-0.5">
                                {data.synonyms.map((syn, idx) => (
                                    <button
                                        key={idx}
                                        type="button"
                                        onClick={() => handleSpeakInternal(syn)}
                                        className="px-2.5 py-1 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 active:scale-95 text-cyan-300 border border-cyan-500/25 text-xs font-medium flex items-center gap-1.5 transition-all shadow-sm"
                                        title={`Listen to "${syn}"`}
                                    >
                                        <span>{syn}</span>
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072M12 5v14l-5-5H4V10h3l5-5z" />
                                        </svg>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Archaic Notice if detected */}
                    {data.isArchaic && (
                        <div className="p-3 rounded-2xl bg-purple-500/15 border border-purple-500/30 text-xs text-purple-200 leading-relaxed space-y-1">
                            <div className="flex items-center gap-1.5 font-bold text-purple-300">
                                <span>📜 Archaic Swedish:</span>
                            </div>
                            {data.archaicNote && <p className="text-[11px] text-purple-100">{data.archaicNote}</p>}
                            {data.modernEquivalent && (
                                <div className="text-[11px] font-semibold text-purple-300 pt-0.5">
                                    Modern form: <span className="underline font-bold text-white">{data.modernEquivalent}</span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Grammar Notes if any */}
                    {data.grammarNotes && !data.isArchaic && (
                        <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 text-xs text-gray-300 italic">
                            📝 {data.grammarNotes}
                        </div>
                    )}

                    {/* Context Sentence Preview & Sentence Translation */}
                    {data.sentenceSwedish && (
                        <div className="p-3 rounded-2xl bg-base-200/70 border border-white/5 space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                                    </svg>
                                    Sentence Context
                                </span>
                                <button
                                    onClick={() => handleSpeakInternal(data.sentenceSwedish)}
                                    className="p-1 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                                    title="Listen to full sentence"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072M12 5v14l-5-5H4V10h3l5-5z" />
                                    </svg>
                                </button>
                            </div>

                            {/* Swedish Sentence */}
                            <div className="text-xs text-gray-200 leading-relaxed italic bg-base-300/60 p-2.5 rounded-xl border-l-2 border-cyan-400 max-h-24 sm:max-h-28 overflow-y-auto">
                                "{renderHighlightedSentence()}"
                            </div>

                            {/* Sentence Translation Underneath */}
                            {data.sentenceTranslation ? (
                                <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 space-y-1">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-2.5 w-2.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                                        </svg>
                                        Sentence Meaning
                                    </span>
                                    <p className="text-xs text-gray-300 leading-relaxed">
                                        {data.sentenceTranslation}
                                    </p>
                                </div>
                            ) : (
                                <div className="text-[11px] text-gray-500 italic px-1">
                                    Translating sentence meaning...
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer with Mobile Safe Area Spacing */}
                <div className="px-4 sm:px-6 pt-2.5 pb-[max(1.25rem,env(safe-area-inset-bottom,1.25rem))] border-t border-white/10 shrink-0 flex flex-col gap-2.5 bg-base-100">
                    {/* Alternative forms choice selector */}
                    {hasAlternativeForms && (
                        <div className="flex items-center justify-between text-xs gap-2">
                            <span className="text-gray-400 text-[11px] shrink-0 font-medium">Save form:</span>
                            <div className="flex items-center gap-1.5 flex-wrap">
                                {data.isArchaic && data.modernEquivalent && (
                                    <button
                                        type="button"
                                        onClick={() => setSaveWordChoice('modern')}
                                        className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all ${
                                            saveWordChoice === 'modern'
                                                ? 'bg-purple-600 text-white shadow-md'
                                                : 'bg-white/5 hover:bg-white/10 text-gray-300'
                                        }`}
                                    >
                                        {data.modernEquivalent} (Modern)
                                    </button>
                                )}
                                {data.baseForm && data.baseForm.toLowerCase() !== data.targetWord.toLowerCase() && (
                                    <button
                                        type="button"
                                        onClick={() => setSaveWordChoice('base')}
                                        className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all ${
                                            saveWordChoice === 'base'
                                                ? 'bg-primary text-white shadow-md'
                                                : 'bg-white/5 hover:bg-white/10 text-gray-300'
                                        }`}
                                    >
                                        {data.baseForm} (Base)
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={() => setSaveWordChoice('exact')}
                                    className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all ${
                                        saveWordChoice === 'exact'
                                            ? 'bg-primary text-white shadow-md'
                                            : 'bg-white/5 hover:bg-white/10 text-gray-300'
                                    }`}
                                >
                                    {data.targetWord}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* SRS Checkbox and Upgrade Link */}
                    <div className="flex items-center justify-between text-xs">
                        <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={addToSrs}
                                onChange={(e) => setAddToSrs(e.target.checked)}
                                className="rounded border-white/20 text-primary focus:ring-0 w-4 h-4"
                            />
                            <span>Add to SRS flashcards</span>
                        </label>

                        {(!data.isAi || data.isLibrary) && onUpgradeWithAi && (
                            <button
                                type="button"
                                onClick={() => onUpgradeWithAi(data.targetWord, data.sentenceSwedish)}
                                className="text-[11px] font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 shrink-0 underline underline-offset-2"
                                title="Analyze full context with Gemini AI"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                                <span>AI Context</span>
                            </button>
                        )}
                    </div>

                    {/* Primary Action Button */}
                    <button
                        type="button"
                        onClick={() => onSaveToDeck(wordToSave, addToSrs)}
                        className={`w-full py-3 px-4 rounded-2xl font-bold text-xs sm:text-sm shadow-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${
                            data.isLibrary
                                ? 'bg-emerald-600/90 hover:bg-emerald-600 text-white shadow-emerald-600/20'
                                : 'bg-gradient-to-r from-primary to-indigo-600 hover:opacity-90 text-white shadow-primary/30'
                        }`}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                            {data.isLibrary ? (
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            ) : (
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                            )}
                        </svg>
                        <span>{data.isLibrary ? '✓ In Library (Tap to Update)' : 'Save to Flashcards'}</span>
                    </button>
                </div>
            </div>
        </div>
    );
};
