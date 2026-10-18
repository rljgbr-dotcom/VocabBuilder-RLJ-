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
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-2 sm:p-4 animate-fade-in">
            {/* Modal Box styled for mobile (Pixel 9 Pro XL & all screens) */}
            <div className="bg-base-100 rounded-3xl sm:rounded-3xl max-w-lg w-full p-4 sm:p-6 shadow-2xl border border-white/10 flex flex-col max-h-[88dvh] overflow-hidden">
                {/* Header */}
                <div className="flex justify-between items-center pb-3 border-b border-white/10 shrink-0">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-500 flex items-center justify-center shadow-md">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-base sm:text-lg font-bold text-white">Translate Word</h2>
                            <p className="text-[11px] text-gray-400">Choose AI Context or Fast Free Dictionary</p>
                        </div>
                    </div>
                    {!isLoading && (
                        <button 
                            onClick={onClose} 
                            className="p-1.5 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                        </button>
                    )}
                </div>

                {/* Scrollable Body */}
                <div className="flex-1 overflow-y-auto py-3 space-y-3 pr-1 text-sm">
                    {/* Selected Word Card */}
                    <div className="p-3 rounded-2xl bg-base-200/80 border border-white/5 flex items-center justify-between">
                        <div>
                            <span className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-0.5">
                                Selected Target Word
                            </span>
                            <div className="text-xl font-black text-primary">
                                {targetWord}
                            </div>
                        </div>

                        {archaicInfo.isArchaic && (
                            <span className="text-[11px] font-extrabold px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                📜 Old Swedish
                            </span>
                        )}
                    </div>

                    {/* Archaic Notice if detected */}
                    {archaicInfo.isArchaic && (
                        <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200 leading-relaxed">
                            <span className="font-bold">Historical Note:</span> {archaicInfo.note}
                            {archaicInfo.modernEquivalent && (
                                <div className="mt-1 font-semibold text-amber-300">
                                    Modern Swedish form: <span className="underline font-bold">{archaicInfo.modernEquivalent}</span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Full Context Sentence */}
                    <div className="p-3 rounded-2xl bg-base-200/50 border border-cyan-500/20">
                        <span className="block text-[10px] font-bold uppercase tracking-wider text-cyan-400 mb-1.5 flex items-center gap-1">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                            </svg>
                            Full Context Sentence
                        </span>
                        <p className="text-xs sm:text-sm text-gray-200 leading-relaxed italic bg-base-300/40 p-2.5 rounded-xl border-l-4 border-cyan-500 max-h-32 overflow-y-auto">
                            "{renderHighlightedSentence()}"
                        </p>
                    </div>

                    {/* Explanation */}
                    <div className="text-[11px] text-gray-400 bg-white/5 p-2.5 rounded-xl border border-white/5 flex gap-2 items-start">
                        <span className="text-sm text-primary shrink-0">💡</span>
                        <span className="leading-snug">
                            <strong>AI Analysis</strong> understands context, phrasal verbs, and grammar rules. <strong>Free Dictionary</strong> is instant and unlimited without using your API key.
                        </span>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-3 border-t border-white/10 shrink-0 flex flex-col sm:flex-row gap-2">
                    <button
                        type="button"
                        onClick={onConfirmNonAi}
                        disabled={isLoading}
                        className="flex-1 py-2.5 px-3 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 border border-white/10"
                    >
                        {isLoading && loadingMode === 'non-ai' ? (
                            <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white/30 border-t-white" />
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                            </svg>
                        )}
                        <span>Free Dictionary (Non-AI)</span>
                    </button>

                    <button
                        type="button"
                        onClick={onConfirmAi}
                        disabled={isLoading}
                        className="flex-1 py-2.5 px-3 rounded-2xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-cyan-600/20 flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
                    >
                        {isLoading && loadingMode === 'ai' ? (
                            <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white/30 border-t-white" />
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                        )}
                        <span>Analyze with AI</span>
                    </button>
                </div>
            </div>
        </div>
    );
};
