import React, { useState, useEffect } from 'react';
import { useModal } from '../../contexts/ModalContext';

const ShareDeckModal: React.FC = () => {
    const { modalState, hideModal } = useModal();
    const [copied, setCopied] = useState(false);

    const isOpen = modalState.type === 'shareDeck';

    // Reset copied state whenever the modal opens with a new deck
    useEffect(() => {
        if (isOpen) setCopied(false);
    }, [isOpen]);

    if (!isOpen) return null;

    const { url, wordCount, groupName } = modalState.props as {
        url: string;
        wordCount: number;
        groupName: string;
    };

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
        } catch {
            // Fallback for older browsers
            const textarea = document.createElement('textarea');
            textarea.value = url;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
        }
    };

    const handleNativeShare = async () => {
        if (!navigator.share) return;
        try {
            await navigator.share({
                title: `VocabBuilder — ${groupName}`,
                text: `Check out this vocabulary deck: "${groupName}" (${wordCount} words)`,
                url,
            });
        } catch {
            // User cancelled share — no-op
        }
    };

    const canNativeShare = !!navigator.share;

    return (
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-base-200 p-6 rounded-xl shadow-2xl z-50 w-11/12 max-w-md">
            {/* Header */}
            <div className="flex items-center gap-3 mb-5">
                <div className="p-2 rounded-full bg-primary/20 text-primary">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                    </svg>
                </div>
                <div>
                    <h3 className="text-lg font-bold leading-tight">Share Deck</h3>
                    <p className="text-sm text-gray-400 leading-tight">{groupName} &bull; {wordCount} word{wordCount !== 1 ? 's' : ''}</p>
                </div>
            </div>

            {/* Info */}
            <p className="text-xs text-gray-500 mb-3 leading-relaxed">
                Send this link to anyone — they'll be able to import these words directly into their VocabBuilder. Your personal SRS progress and difficulty ratings are <strong className="text-gray-300">not</strong> included.
            </p>

            {/* URL box */}
            <div className="flex items-stretch gap-2 mb-4">
                <div className="flex-1 bg-base-300 rounded-lg px-3 py-2 text-xs font-mono text-gray-300 overflow-x-auto whitespace-nowrap flex items-center">
                    {url}
                </div>
                <button
                    onClick={handleCopy}
                    className={`px-3 py-2 rounded-lg text-xs font-bold transition-colors flex-shrink-0 flex items-center gap-1.5 ${copied ? 'bg-green-600 text-white' : 'bg-primary text-primary-content hover:bg-primary-focus'}`}
                >
                    {copied ? (
                        <>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                            Copied!
                        </>
                    ) : (
                        <>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                            Copy
                        </>
                    )}
                </button>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
                {canNativeShare && (
                    <button
                        onClick={handleNativeShare}
                        className="flex-1 py-2 bg-base-300 hover:bg-base-100 text-sm font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                        Share via…
                    </button>
                )}
                <button
                    onClick={hideModal}
                    className="flex-1 py-2 bg-base-300 hover:bg-base-100 text-sm font-bold rounded-lg transition-colors"
                >
                    Done
                </button>
            </div>
        </div>
    );
};

export default ShareDeckModal;
