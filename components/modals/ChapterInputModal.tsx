import React, { useState, useEffect } from 'react';
import { Book, BookChapter } from '../../types';

interface ChapterInputModalProps {
    isOpen: boolean;
    onClose: () => void;
    book: Book;
    onSave: (chapterNumber: number, title: string, content: string) => void;
    initialChapter?: BookChapter | null;
}

export const ChapterInputModal: React.FC<ChapterInputModalProps> = ({
    isOpen,
    onClose,
    book,
    onSave,
    initialChapter,
}) => {
    const nextNum = (book.chapters?.length || 0) + 1;
    const [chapterNumber, setChapterNumber] = useState<number>(nextNum);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (initialChapter) {
            setChapterNumber(initialChapter.chapterNumber);
            setTitle(initialChapter.title);
            setContent(initialChapter.content);
        } else {
            const next = (book.chapters?.length || 0) + 1;
            setChapterNumber(next);
            setTitle(`Kapitel ${next}`);
            setContent('');
        }
        setError(null);
    }, [initialChapter, book, isOpen]);

    if (!isOpen) return null;

    const handlePasteClipboard = async () => {
        try {
            const text = await navigator.clipboard.readText();
            if (text) {
                setContent(text);
                setError(null);
            }
        } catch (err) {
            console.warn('Could not read clipboard automatically', err);
        }
    };

    const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!content.trim()) {
            setError('Please paste or enter the chapter text.');
            return;
        }

        const finalTitle = title.trim() || `Kapitel ${chapterNumber}`;
        onSave(chapterNumber, finalTitle, content.trim());
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="bg-base-100 rounded-3xl max-w-2xl w-full p-4 sm:p-6 shadow-2xl border border-white/10 flex flex-col max-h-[90dvh]">
                <div className="flex justify-between items-center mb-4 pb-3 border-b border-base-200">
                    <div>
                        <span className="text-xs uppercase font-bold tracking-wider text-primary">{book.title}</span>
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            {initialChapter ? 'Edit Chapter' : 'Add Chapter'}
                        </h2>
                    </div>
                    <button onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors">
                        ✕
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 gap-4">
                    {error && (
                        <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-xl text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                        <div className="sm:col-span-1">
                            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
                                Number
                            </label>
                            <input
                                type="number"
                                min={1}
                                value={chapterNumber}
                                onChange={(e) => setChapterNumber(parseInt(e.target.value) || 1)}
                                className="w-full px-3 py-2 rounded-xl bg-base-200 border border-white/10 text-white focus:outline-none focus:border-primary text-sm font-bold"
                            />
                        </div>
                        <div className="sm:col-span-3">
                            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
                                Chapter Title
                            </label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder={`e.g. Kapitel ${chapterNumber}: Pojken som överlevde`}
                                className="w-full px-3 py-2 rounded-xl bg-base-200 border border-white/10 text-white focus:outline-none focus:border-primary text-sm"
                            />
                        </div>
                    </div>

                    <div className="flex-1 flex flex-col min-h-0">
                        <div className="flex justify-between items-center mb-1">
                            <label className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                                Chapter Text (Paste here)
                            </label>
                            <div className="flex items-center gap-3">
                                <span className="text-xs text-gray-400 font-medium">
                                    {wordCount.toLocaleString()} words
                                </span>
                                <button
                                    type="button"
                                    onClick={handlePasteClipboard}
                                    className="text-xs text-primary hover:text-primary-focus font-bold transition-colors flex items-center gap-1"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                    </svg>
                                    Paste from Clipboard
                                </button>
                            </div>
                        </div>

                        <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="Klistra in texten för kapitlet här..."
                            className="flex-1 min-h-[220px] p-4 bg-base-200 text-white border border-white/10 rounded-xl focus:outline-none focus:border-primary text-sm font-sans leading-relaxed resize-none overflow-y-auto"
                        />
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-base-200">
                        <span className="text-xs text-gray-400 italic">
                            ⚡ Instant save: AI translation is done on-demand as you read.
                        </span>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-colors font-semibold text-sm"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={!content.trim()}
                                className="px-6 py-2 rounded-xl bg-primary hover:bg-primary-focus disabled:opacity-40 text-white transition-all font-bold text-sm shadow-lg shadow-primary/30"
                            >
                                Save Chapter
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};
