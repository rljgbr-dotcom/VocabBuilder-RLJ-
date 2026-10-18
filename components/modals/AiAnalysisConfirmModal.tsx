import React from 'react';
import { detectOldSwedish } from '../../services/translationService';

interface AiAnalysisConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    targetWord: string;
    fullSentence: string;
    onConfirmAi: () => void;
    onConfirmNonAi: () => void;
    isLoading: boolean;
    loadingMode?: 'ai' | 'non-ai' | null;
}

export const AiAnalysisConfirmModal: React.FC<AiAnalysisConfirmModalProps> = ({
    isOpen,
    onClose,
    targetWord,
    fullSentence,
    onConfirmAi,
    onConfirmNonAi,
    isLoading,
    loadingMode,
}) => {
    if (!isOpen) return null;

    const archaicInfo = detectOldSwedish(targetWord);

    // Highlight targetWord inside the sentence for visual clarity
    const renderHighlightedSentence = () => {
        if (!fullSentence || !targetWord) return fullSentence;
        
        const cleanTarget = targetWord.replace(/^[.,!?;:()"“”'’—-]+|[.,!?;:()"“”'’—-]+$/g, '').trim();
        const escaped = cleanTarget.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`(\\b${escaped}\\b)`, 'gi');
        const parts = fullSentence.split(regex);

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
                if (e.target === e.currentTarget && !isLoading) onClose();
            }}
        >
            {/* Modal Box designed specifically for mobile screens (Pixel 9 Pro XL safe areas) */}
            <div 
                className="bg-base-100 rounded-t-[28px] sm:rounded-3xl w-full sm:max-w-md border-t sm:border border-white/10 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] sm:shadow-2xl flex flex-col max-h-[88dvh] sm:max-h-[82vh] overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                {/* Mobile Drag Indicator */}
                <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mt-3 mb-1 shrink-0 sm:hidden" />

                {/* Header */}
                <div className="flex justify-between items-center px-4 sm:px-6 pt-2 pb-3 border-b border-white/10 shrink-0">
                    <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-white shadow-md shrink-0">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                        </div>
                        <div className="min-w-0">
                            <span className="text-[10px] uppercase font-bold tracking-wider text-cyan-400 block">Translate Word</span>
                            <h2 className="text-lg sm:text-xl font-black text-white truncate">{targetWord}</h2>
                        </div>
                    </div>
                    {!isLoading && (
                        <button 
                            onClick={onClose} 
                            className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 active:scale-95 transition-all shrink-0"
                            aria-label="Close"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                        </button>
                    )}
                </div>

                {/* Scrollable Body */}
                <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-3.5 space-y-3 text-sm">
                    {/* Archaic Notice if detected */}
                    {archaicInfo.isArchaic && (
                        <div className="p-3 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-xs text-amber-200 leading-relaxed space-y-1">
                            <div className="flex items-center gap-1.5 font-bold text-amber-300">
                                <span>📜 Archaic Swedish:</span>
                            </div>
                            <p className="text-[11px] text-amber-100">{archaicInfo.note}</p>
                            {archaicInfo.modernEquivalent && (
                                <div className="text-[11px] font-semibold text-amber-300 pt-1">
                                    Modern form: <span className="underline font-bold text-white">{archaicInfo.modernEquivalent}</span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Context Sentence Preview */}
                    <div className="p-3 rounded-2xl bg-base-200/70 border border-white/5 space-y-1.5">
                        <span className="block text-[10px] font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                            </svg>
                            Full Sentence Context
                        </span>
                        <div className="text-xs text-gray-200 leading-relaxed italic bg-base-300/60 p-2.5 rounded-xl border-l-2 border-cyan-400 max-h-24 sm:max-h-28 overflow-y-auto">
                            "{renderHighlightedSentence()}"
                        </div>
                    </div>

                    {/* Choose Translation Method Options */}
                    <div className="space-y-2 pt-1">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block">
                            Select Translation Mode
                        </span>

                        {/* Option 1: Fast Free Dictionary */}
                        <button
                            type="button"
                            onClick={onConfirmNonAi}
                            disabled={isLoading}
                            className={`w-full p-3 rounded-2xl border text-left transition-all flex items-center gap-3 ${
                                loadingMode === 'non-ai'
                                    ? 'bg-emerald-500/20 border-emerald-500/50'
                                    : 'bg-white/5 hover:bg-white/10 border-white/10 active:scale-[0.99]'
                            }`}
                        >
                            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                                {isLoading && loadingMode === 'non-ai' ? (
                                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-emerald-400/30 border-t-emerald-400" />
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                    </svg>
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                    <span className="font-bold text-white text-xs sm:text-sm">Free Dictionary</span>
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">Unlimited Free</span>
                                </div>
                                <p className="text-[11px] text-gray-400 mt-0.5 truncate">Instant translation • Zero API key usage</p>
                            </div>
                        </button>

                        {/* Option 2: Gemini AI Context */}
                        <button
                            type="button"
                            onClick={onConfirmAi}
                            disabled={isLoading}
                            className={`w-full p-3 rounded-2xl border text-left transition-all flex items-center gap-3 ${
                                loadingMode === 'ai'
                                    ? 'bg-cyan-500/20 border-cyan-500/50'
                                    : 'bg-gradient-to-r from-cyan-950/40 to-indigo-950/40 hover:from-cyan-900/50 hover:to-indigo-900/50 border-cyan-500/30 active:scale-[0.99]'
                            }`}
                        >
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-white shrink-0 shadow-md">
                                {isLoading && loadingMode === 'ai' ? (
                                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white" />
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                                    </svg>
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                    <span className="font-bold text-white text-xs sm:text-sm">Gemini AI Context</span>
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-300 bg-cyan-500/20 px-2 py-0.5 rounded-full">Smart AI</span>
                                </div>
                                <p className="text-[11px] text-gray-300 mt-0.5 truncate">Understands tense, particles & sentence idioms</p>
                            </div>
                        </button>
                    </div>
                </div>

                {/* Footer with Mobile Safe Area Spacing */}
                <div className="px-4 sm:px-6 pt-2 pb-[max(1.25rem,env(safe-area-inset-bottom,1.25rem))] border-t border-white/10 shrink-0 text-center">
                    <p className="text-[10px] text-gray-400">
                        Translations are cached locally to keep your reading fast and fluid.
                    </p>
                </div>
            </div>
        </div>
    );
};
