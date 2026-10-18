import React, { useState, useEffect } from 'react';
import { Book } from '../../types';

interface BookInputModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (book: Book) => void;
    initialBook?: Book | null;
}

const COLOR_OPTIONS = [
    { id: 'indigo', name: 'Indigo', bg: 'bg-indigo-600', ring: 'ring-indigo-400' },
    { id: 'emerald', name: 'Emerald', bg: 'bg-emerald-600', ring: 'ring-emerald-400' },
    { id: 'amber', name: 'Amber', bg: 'bg-amber-600', ring: 'ring-amber-400' },
    { id: 'purple', name: 'Purple', bg: 'bg-purple-600', ring: 'ring-purple-400' },
    { id: 'rose', name: 'Rose', bg: 'bg-rose-600', ring: 'ring-rose-400' },
    { id: 'cyan', name: 'Cyan', bg: 'bg-cyan-600', ring: 'ring-cyan-400' },
];

export const BookInputModal: React.FC<BookInputModalProps> = ({
    isOpen,
    onClose,
    onSave,
    initialBook,
}) => {
    const [title, setTitle] = useState('');
    const [author, setAuthor] = useState('');
    const [description, setDescription] = useState('');
    const [coverColor, setCoverColor] = useState('indigo');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (initialBook) {
            setTitle(initialBook.title);
            setAuthor(initialBook.author || '');
            setDescription(initialBook.description || '');
            setCoverColor(initialBook.coverColor || 'indigo');
        } else {
            setTitle('');
            setAuthor('');
            setDescription('');
            setCoverColor('indigo');
        }
        setError(null);
    }, [initialBook, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) {
            setError('Please enter a book title.');
            return;
        }

        const book: Book = {
            id: initialBook ? initialBook.id : `book_${Date.now()}`,
            title: title.trim(),
            author: author.trim() || undefined,
            description: description.trim() || undefined,
            coverColor,
            dateAdded: initialBook ? initialBook.dateAdded : new Date().toISOString(),
            chapters: initialBook ? initialBook.chapters : [],
            lastReadChapterId: initialBook ? initialBook.lastReadChapterId : undefined,
        };

        onSave(book);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="bg-base-100 rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-white/10 flex flex-col max-h-[90dvh] overflow-y-auto">
                <div className="flex justify-between items-center mb-5 pb-3 border-b border-base-200">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                        {initialBook ? 'Edit Book' : 'Add New Book'}
                    </h2>
                    <button onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors">
                        ✕
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                        <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-xl text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
                            Book Title *
                        </label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="e.g. Hundraåringen som klev ut genom fönstret"
                            className="w-full px-4 py-2.5 rounded-xl bg-base-200 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-primary transition-colors text-sm"
                            autoFocus
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
                            Author (Optional)
                        </label>
                        <input
                            type="text"
                            value={author}
                            onChange={(e) => setAuthor(e.target.value)}
                            placeholder="e.g. Jonas Jonasson"
                            className="w-full px-4 py-2.5 rounded-xl bg-base-200 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-primary transition-colors text-sm"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
                            Description or Notes (Optional)
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={2}
                            placeholder="e.g. Swedish novel for B1-B2 reading practice"
                            className="w-full px-4 py-2.5 rounded-xl bg-base-200 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-primary transition-colors text-sm resize-none"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
                            Cover Theme
                        </label>
                        <div className="flex gap-3">
                            {COLOR_OPTIONS.map((c) => (
                                <button
                                    key={c.id}
                                    type="button"
                                    onClick={() => setCoverColor(c.id)}
                                    className={`w-9 h-9 rounded-full ${c.bg} transition-all ${
                                        coverColor === c.id ? `ring-4 ring-offset-2 ring-offset-base-100 ${c.ring} scale-110` : 'opacity-70 hover:opacity-100'
                                    }`}
                                    title={c.name}
                                />
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-base-200 mt-6">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-5 py-2.5 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-colors font-semibold text-sm"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-6 py-2.5 rounded-xl bg-primary hover:bg-primary-focus text-white transition-all font-bold text-sm shadow-lg shadow-primary/30"
                        >
                            {initialBook ? 'Save Changes' : 'Create Book'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
