import React, { useState } from 'react';
import { Screen, Book, BookChapter } from '../../types';
import { useReadingLibrary } from '../../hooks/useReadingLibrary';
import { BookInputModal } from '../modals/BookInputModal';
import { ChapterInputModal } from '../modals/ChapterInputModal';

interface ReadingLibraryScreenProps {
    onNavigate: (screen: Screen, params?: any) => void;
}

const COVER_COLORS: Record<string, { bg: string; text: string; badge: string; border: string }> = {
    indigo: { bg: 'from-indigo-900/60 to-indigo-800/40', text: 'text-indigo-400', badge: 'bg-indigo-500/20 text-indigo-300', border: 'border-indigo-500/30' },
    emerald: { bg: 'from-emerald-900/60 to-emerald-800/40', text: 'text-emerald-400', badge: 'bg-emerald-500/20 text-emerald-300', border: 'border-emerald-500/30' },
    amber: { bg: 'from-amber-900/60 to-amber-800/40', text: 'text-amber-400', badge: 'bg-amber-500/20 text-amber-300', border: 'border-amber-500/30' },
    purple: { bg: 'from-purple-900/60 to-purple-800/40', text: 'text-purple-400', badge: 'bg-purple-500/20 text-purple-300', border: 'border-purple-500/30' },
    rose: { bg: 'from-rose-900/60 to-rose-800/40', text: 'text-rose-400', badge: 'bg-rose-500/20 text-rose-300', border: 'border-rose-500/30' },
    cyan: { bg: 'from-cyan-900/60 to-cyan-800/40', text: 'text-cyan-400', badge: 'bg-cyan-500/20 text-cyan-300', border: 'border-cyan-500/30' },
};

export const ReadingLibraryScreen: React.FC<ReadingLibraryScreenProps> = ({ onNavigate }) => {
    const { books, saveBook, deleteBook, addChapter, deleteChapter, passages, deletePassage } = useReadingLibrary();

    // Selected book for viewing its chapters
    const [selectedBookId, setSelectedBookId] = useState<string | null>(null);

    // Modals
    const [isBookModalOpen, setIsBookModalOpen] = useState(false);
    const [editingBook, setEditingBook] = useState<Book | null>(null);

    const [isChapterModalOpen, setIsChapterModalOpen] = useState(false);
    const [chapterToEdit, setChapterToEdit] = useState<BookChapter | null>(null);

    const selectedBook = selectedBookId ? books.find(b => b.id === selectedBookId) : null;

    const handleSaveBook = (book: Book) => {
        saveBook(book);
        if (!selectedBookId) {
            setSelectedBookId(book.id);
        }
    };

    const handleSaveChapter = (chapterNumber: number, title: string, content: string) => {
        if (!selectedBook) return;
        addChapter(selectedBook.id, { chapterNumber, title, content });
    };

    const handleOpenChapter = (bookId: string, chapterId: string) => {
        onNavigate('reading-lab', { bookId, chapterId });
    };

    return (
        <div className="flex flex-col h-full min-h-[85vh] bg-base-100 rounded-3xl border border-white/5 shadow-2xl overflow-hidden animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between p-4 sm:p-6 bg-base-200/60 border-b border-white/5 backdrop-blur-md">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => {
                            if (selectedBookId) {
                                setSelectedBookId(null);
                            } else {
                                onNavigate('game-selection');
                            }
                        }}
                        className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-colors"
                        title={selectedBookId ? "Back to Bookshelf" : "Back to Games"}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                    </button>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs uppercase font-extrabold tracking-widest text-primary">VocabBuilder</span>
                            {selectedBook && (
                                <>
                                    <span className="text-gray-600">/</span>
                                    <span className="text-xs text-gray-400 font-medium truncate max-w-[200px]">{selectedBook.title}</span>
                                </>
                            )}
                        </div>
                        <h1 className="text-xl sm:text-2xl font-black text-white">
                            {selectedBook ? selectedBook.title : 'Books & Reading Library'}
                        </h1>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {selectedBook ? (
                        <button
                            onClick={() => {
                                setChapterToEdit(null);
                                setIsChapterModalOpen(true);
                            }}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-focus text-white font-bold text-sm transition-all shadow-lg shadow-primary/25"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                            </svg>
                            <span>Add Chapter</span>
                        </button>
                    ) : (
                        <button
                            onClick={() => {
                                setEditingBook(null);
                                setIsBookModalOpen(true);
                            }}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-focus text-white font-bold text-sm transition-all shadow-lg shadow-primary/25"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                            </svg>
                            <span>New Book</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 space-y-8">
                {selectedBook ? (
                    /* ── DETAIL VIEW: Chapters of the Selected Book ── */
                    <div className="space-y-6 max-w-5xl mx-auto">
                        {/* Book Banner */}
                        <div className={`p-6 sm:p-8 rounded-3xl bg-gradient-to-r ${COVER_COLORS[selectedBook.coverColor || 'indigo']?.bg || COVER_COLORS.indigo.bg} border ${COVER_COLORS[selectedBook.coverColor || 'indigo']?.border || COVER_COLORS.indigo.border} relative overflow-hidden shadow-xl`}>
                            <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                <div>
                                    {selectedBook.author && (
                                        <p className="text-sm font-semibold uppercase tracking-wider text-white/70 mb-1">
                                            {selectedBook.author}
                                        </p>
                                    )}
                                    <h2 className="text-2xl sm:text-3xl font-black text-white">{selectedBook.title}</h2>
                                    {selectedBook.description && (
                                        <p className="text-sm text-white/80 mt-2 max-w-xl leading-relaxed">
                                            {selectedBook.description}
                                        </p>
                                    )}
                                    <div className="flex items-center gap-4 mt-4 text-xs font-semibold text-white/60">
                                        <span>{(selectedBook.chapters || []).length} Chapters</span>
                                        <span>•</span>
                                        <span>
                                            {(selectedBook.chapters || []).reduce((acc, c) => acc + (c.content?.split(/\s+/).length || 0), 0).toLocaleString()} Total Words
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => {
                                            setEditingBook(selectedBook);
                                            setIsBookModalOpen(true);
                                        }}
                                        className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs transition-colors"
                                    >
                                        Edit Details
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (confirm(`Are you sure you want to delete "${selectedBook.title}" and all its chapters?`)) {
                                                deleteBook(selectedBook.id);
                                                setSelectedBookId(null);
                                            }
                                        }}
                                        className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-colors"
                                        title="Delete Book"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Chapter List */}
                        <div className="space-y-3">
                            <h3 className="text-base font-bold text-gray-300 uppercase tracking-wider text-xs">
                                Table of Contents
                            </h3>

                            {(!selectedBook.chapters || selectedBook.chapters.length === 0) ? (
                                <div className="text-center py-16 px-4 bg-base-200/30 rounded-3xl border border-dashed border-white/10">
                                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-white/5 flex items-center justify-center text-gray-500">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                        </svg>
                                    </div>
                                    <h4 className="text-lg font-bold text-white mb-1">No chapters added yet</h4>
                                    <p className="text-sm text-gray-400 max-w-sm mx-auto mb-6">
                                        Copy and paste your first chapter. Word lookups and AI context will be ready instantly.
                                    </p>
                                    <button
                                        onClick={() => {
                                            setChapterToEdit(null);
                                            setIsChapterModalOpen(true);
                                        }}
                                        className="px-6 py-2.5 rounded-xl bg-primary hover:bg-primary-focus text-white font-bold text-sm transition-all"
                                    >
                                        Add Chapter 1
                                    </button>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 gap-3">
                                    {selectedBook.chapters.map((chapter) => {
                                        const wordsInChapter = chapter.content ? chapter.content.trim().split(/\s+/).length : 0;
                                        const isLastRead = selectedBook.lastReadChapterId === chapter.id;

                                        return (
                                            <div
                                                key={chapter.id}
                                                onClick={() => handleOpenChapter(selectedBook.id, chapter.id)}
                                                className="group p-4 sm:p-5 rounded-2xl bg-base-200/40 hover:bg-base-200/80 border border-white/5 hover:border-primary/40 transition-all flex items-center justify-between cursor-pointer shadow-sm hover:shadow-lg"
                                            >
                                                <div className="flex items-center gap-4 min-w-0">
                                                    <div className="w-10 h-10 rounded-xl bg-white/5 group-hover:bg-primary/20 group-hover:text-primary transition-colors flex items-center justify-center font-black text-sm text-gray-400">
                                                        {chapter.chapterNumber}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <h4 className="text-base font-bold text-white group-hover:text-primary transition-colors truncate">
                                                                {chapter.title}
                                                            </h4>
                                                            {isLastRead && (
                                                                <span className="text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                                                                    Last Read
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-xs text-gray-400 mt-0.5">
                                                            {wordsInChapter.toLocaleString()} words • Added {new Date(chapter.dateAdded).toLocaleDateString()}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-3">
                                                    <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-bold text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                                                        Read Chapter
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                                                        </svg>
                                                    </span>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (confirm(`Delete "${chapter.title}"?`)) {
                                                                deleteChapter(selectedBook.id, chapter.id);
                                                            }
                                                        }}
                                                        className="p-2 rounded-lg text-gray-500 hover:text-red-400 hover:bg-white/5 transition-colors opacity-0 group-hover:opacity-100"
                                                        title="Delete Chapter"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    /* ── BOOKSHELF OVERVIEW: All Books ── */
                    <div className="space-y-10 max-w-6xl mx-auto">
                        {books.length === 0 ? (
                            <div className="text-center py-20 px-4 bg-base-200/20 rounded-3xl border border-dashed border-white/10">
                                <div className="w-20 h-20 mx-auto mb-4 rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                    </svg>
                                </div>
                                <h3 className="text-2xl font-black text-white mb-2">Your Bookshelf is Empty</h3>
                                <p className="text-gray-400 max-w-md mx-auto mb-6 text-sm leading-relaxed">
                                    Add the books you are currently reading. You can copy and paste chapters one at a time and easily extract unknown words straight to your flashcards.
                                </p>
                                <button
                                    onClick={() => {
                                        setEditingBook(null);
                                        setIsBookModalOpen(true);
                                    }}
                                    className="px-6 py-3 rounded-xl bg-primary hover:bg-primary-focus text-white font-bold text-sm shadow-xl shadow-primary/30 transition-all inline-flex items-center gap-2"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                                    </svg>
                                    Add Your First Book
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {books.map((book) => {
                                    const chaptersCount = book.chapters?.length || 0;
                                    const totalWords = (book.chapters || []).reduce((acc, c) => acc + (c.content?.split(/\s+/).length || 0), 0);
                                    const colorStyle = COVER_COLORS[book.coverColor || 'indigo'] || COVER_COLORS.indigo;

                                    return (
                                        <div
                                            key={book.id}
                                            onClick={() => setSelectedBookId(book.id)}
                                            className="group relative flex flex-col p-6 rounded-3xl bg-base-200/40 hover:bg-base-200/70 border border-white/5 hover:border-white/20 transition-all duration-300 hover:-translate-y-1 shadow-lg hover:shadow-2xl cursor-pointer overflow-hidden"
                                        >
                                            {/* Top color spine accent */}
                                            <div className={`absolute top-0 inset-x-0 h-2 bg-gradient-to-r ${colorStyle.bg}`} />

                                            <div className="flex justify-between items-start mb-3">
                                                <span className={`text-[11px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full ${colorStyle.badge}`}>
                                                    {chaptersCount} {chaptersCount === 1 ? 'Chapter' : 'Chapters'}
                                                </span>
                                                <span className="text-xs text-gray-500 font-medium">
                                                    {totalWords.toLocaleString()} words
                                                </span>
                                            </div>

                                            <h3 className="text-xl font-bold text-white group-hover:text-primary transition-colors line-clamp-2 mb-1">
                                                {book.title}
                                            </h3>
                                            {book.author && (
                                                <p className="text-xs text-gray-400 font-semibold mb-3">
                                                    by {book.author}
                                                </p>
                                            )}

                                            {book.description && (
                                                <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed mb-6 flex-1">
                                                    {book.description}
                                                </p>
                                            )}

                                            <div className="mt-auto pt-4 border-t border-white/5 flex items-center justify-between">
                                                <span className="text-xs text-gray-400">
                                                    {book.lastReadChapterId ? 'Resume reading' : 'Start reading'}
                                                </span>
                                                <span className="text-xs font-bold text-primary flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                                                    Open Book →
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* Standalone Passages (Backwards compatibility) */}
                        {passages && passages.length > 0 && (
                            <div className="pt-8 border-t border-white/10 space-y-4">
                                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">
                                    Quick Saved Passages
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                    {passages.map((p) => (
                                        <div
                                            key={p.id}
                                            onClick={() => onNavigate('reading-lab', { passageId: p.id })}
                                            className="p-4 rounded-2xl bg-base-200/30 border border-white/5 hover:border-primary/30 transition-all cursor-pointer flex justify-between items-start"
                                        >
                                            <div>
                                                <h4 className="text-sm font-bold text-white truncate max-w-[200px]">{p.title}</h4>
                                                <p className="text-xs text-gray-400 line-clamp-2 mt-1">{p.content}</p>
                                            </div>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    deletePassage(p.id);
                                                }}
                                                className="text-gray-500 hover:text-red-400 p-1"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Modals */}
            <BookInputModal
                isOpen={isBookModalOpen}
                onClose={() => setIsBookModalOpen(false)}
                onSave={handleSaveBook}
                initialBook={editingBook}
            />

            {selectedBook && (
                <ChapterInputModal
                    isOpen={isChapterModalOpen}
                    onClose={() => setIsChapterModalOpen(false)}
                    book={selectedBook}
                    onSave={handleSaveChapter}
                    initialChapter={chapterToEdit}
                />
            )}
        </div>
    );
};
