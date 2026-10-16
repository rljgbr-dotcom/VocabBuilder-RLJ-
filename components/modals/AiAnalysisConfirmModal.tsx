import React from 'react';

interface AiAnalysisConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    targetWord: string;
    fullSentence: string;
    onConfirm: () => void;
    isLoading: boolean;
}

export const AiAnalysisConfirmModal: React.FC<AiAnalysisConfirmModalProps> = ({
    isOpen,
    onClose,
    targetWord,
    fullSentence,
    onConfirm,
    isLoading,
}) => {
    if (!isOpen) return null;

    // Highlight targetWord inside the sentence for visual clarity
    const renderHighlightedSentence = () => {
        if (!fullSentence || !targetWord) return fullSentence;
        
        // Escape regex characters in targetWord
        const escaped = targetWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`(\\b${escaped}\\b)`, 'gi');
        const parts = fullSentence.split(regex);

        return parts.map((part, index) => {
            if (part.toLowerCase() === targetWord.toLowerCase()) {
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
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="bg-base-100 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-white/10 flex flex-col">
                <div className="flex justify-between items-center mb-4 pb-3 border-b border-base-200">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-indigo-500 flex items-center justify-center shadow-md">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                        </div>
                        <h2 className="text-lg font-bold text-white">Confirm AI Context Analysis</h2>
                    </div>
                    {!isLoading && (
                        <button onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors">
                            ✕
                        </button>
                    )}
                </div>

                <div className="space-y-4">
                    {/* Target Word */}
                    <div className="p-3.5 rounded-xl bg-base-200/80 border border-white/5">
                        <span className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1">
                            Selected Word
                        </span>
                        <div className="text-xl font-extrabold text-primary flex items-center gap-2">
                            <span>{targetWord}</span>
                        </div>
                    </div>

                    {/* Sentence to send */}
                    <div className="p-4 rounded-xl bg-base-200/50 border border-primary/20">
                        <span className="block text-[11px] font-bold uppercase tracking-wider text-cyan-400 mb-2 flex items-center gap-1.5">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                            </svg>
                            Full Context Sentence to Send
                        </span>
                        <p className="text-sm sm:text-base text-gray-200 leading-relaxed italic bg-base-300/40 p-3 rounded-lg border-l-4 border-cyan-500">
                            "{renderHighlightedSentence()}"
                        </p>
                    </div>

                    {/* Explanation */}
                    <div className="text-xs text-gray-400 bg-white/5 p-3 rounded-xl border border-white/5 flex gap-2.5 items-start">
                        <span className="text-base text-primary">💡</span>
                        <span className="leading-relaxed">
                            Sending the entire sentence allows Gemini to recognize the story context, detect phrasal verbs & particles (e.g., <em>tycka om</em>, <em>ge upp</em>), and determine the dictionary base form.
                        </span>
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-5 border-t border-base-200 mt-5">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isLoading}
                        className="px-4 py-2.5 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-colors font-semibold text-sm disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={isLoading}
                        className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-cyan-600/20 flex items-center gap-2 transition-all disabled:opacity-50"
                    >
                        {isLoading ? (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white" />
                                <span>Analyzing with Gemini...</span>
                            </>
                        ) : (
                            <>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                                <span>Send for Analysis</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};
