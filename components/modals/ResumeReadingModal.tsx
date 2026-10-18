import React from 'react';

interface ResumeReadingModalProps {
    isOpen: boolean;
    chapterTitle: string;
    progressPercentage: number;
    onResume: () => void;
    onStartOver: () => void;
}

export const ResumeReadingModal: React.FC<ResumeReadingModalProps> = ({
    isOpen,
    chapterTitle,
    progressPercentage,
    onResume,
    onStartOver,
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="bg-base-100 rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-white/10 flex flex-col text-center">
                <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                </div>

                <h3 className="text-xl font-black text-white mb-1">Resume Reading?</h3>
                <p className="text-xs font-semibold text-primary truncate mb-3">{chapterTitle}</p>

                <p className="text-sm text-gray-400 mb-6 leading-relaxed">
                    You were previously at <span className="text-white font-bold">{Math.round(progressPercentage)}%</span> of this chapter. Would you like to continue from where you left off?
                </p>

                {/* Progress bar visual */}
                <div className="w-full bg-white/5 rounded-full h-2 mb-6 overflow-hidden">
                    <div
                        className="bg-primary h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, Math.max(5, progressPercentage))}%` }}
                    />
                </div>

                <div className="flex flex-col gap-2.5">
                    <button
                        onClick={onResume}
                        className="w-full py-3 px-4 rounded-2xl bg-primary hover:bg-primary-focus text-white font-bold text-sm shadow-lg shadow-primary/30 transition-all flex items-center justify-center gap-2"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                        <span>Resume from {Math.round(progressPercentage)}%</span>
                    </button>

                    <button
                        onClick={onStartOver}
                        className="w-full py-2.5 px-4 rounded-2xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white font-semibold text-xs transition-colors"
                    >
                        Start from Beginning
                    </button>
                </div>
            </div>
        </div>
    );
};
