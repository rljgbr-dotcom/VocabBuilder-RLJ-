import { useState, useCallback } from 'react';
import { ReadingPassage, Book, BookChapter } from '../types';
import { deleteSourceFile } from '../utils/indexedDB';

const PASSAGES_STORAGE_KEY = 'vocabBuilder_readingLibrary';
export const BOOKS_STORAGE_KEY = 'vocabBuilder_books';

export const useReadingLibrary = () => {
    const [passages, setPassages] = useState<ReadingPassage[]>(() => {
        const stored = localStorage.getItem(PASSAGES_STORAGE_KEY);
        if (stored) {
            try {
                return JSON.parse(stored);
            } catch (e) {
                console.error("Failed to parse reading library from local storage:", e);
            }
        }
        return [];
    });

    const [books, setBooks] = useState<Book[]>(() => {
        const stored = localStorage.getItem(BOOKS_STORAGE_KEY);
        if (stored) {
            try {
                return JSON.parse(stored);
            } catch (e) {
                console.error("Failed to parse books from local storage:", e);
            }
        }
        return [];
    });

    const savePassage = useCallback((passage: ReadingPassage) => {
        const stored = localStorage.getItem(PASSAGES_STORAGE_KEY);
        let currentPassages: ReadingPassage[] = [];
        if (stored) {
            try {
                currentPassages = JSON.parse(stored);
            } catch (e) {
                console.error("Failed to parse reading library from local storage:", e);
            }
        }
        const index = currentPassages.findIndex(p => p.id === passage.id);
        let updated: ReadingPassage[];
        if (index >= 0) {
            updated = [...currentPassages];
            updated[index] = passage;
        } else {
            updated = [passage, ...currentPassages];
        }
        localStorage.setItem(PASSAGES_STORAGE_KEY, JSON.stringify(updated));
        setPassages(updated);
    }, []);

    const deletePassage = useCallback(async (id: string) => {
        const stored = localStorage.getItem(PASSAGES_STORAGE_KEY);
        let currentPassages: ReadingPassage[] = [];
        if (stored) {
            try {
                currentPassages = JSON.parse(stored);
            } catch (e) {}
        }

        const passage = currentPassages.find(p => p.id === id);
        if (passage?.sourceFileId) {
            try {
                await deleteSourceFile(passage.sourceFileId);
            } catch (e) {
                console.error("Failed to delete source file from IndexedDB", e);
            }
        }
        
        const updated = currentPassages.filter(p => p.id !== id);
        localStorage.setItem(PASSAGES_STORAGE_KEY, JSON.stringify(updated));
        setPassages(updated);
    }, []);

    const saveBook = useCallback((book: Book) => {
        const stored = localStorage.getItem(BOOKS_STORAGE_KEY);
        let currentBooks: Book[] = [];
        if (stored) {
            try {
                currentBooks = JSON.parse(stored);
            } catch (e) {
                console.error("Failed to parse books from local storage:", e);
            }
        }
        const index = currentBooks.findIndex(b => b.id === book.id);
        let updated: Book[];
        if (index >= 0) {
            updated = [...currentBooks];
            updated[index] = book;
        } else {
            updated = [book, ...currentBooks];
        }
        localStorage.setItem(BOOKS_STORAGE_KEY, JSON.stringify(updated));
        setBooks(updated);
    }, []);

    const deleteBook = useCallback((bookId: string) => {
        const stored = localStorage.getItem(BOOKS_STORAGE_KEY);
        let currentBooks: Book[] = [];
        if (stored) {
            try {
                currentBooks = JSON.parse(stored);
            } catch (e) {}
        }
        const updated = currentBooks.filter(b => b.id !== bookId);
        localStorage.setItem(BOOKS_STORAGE_KEY, JSON.stringify(updated));
        setBooks(updated);
    }, []);

    const addChapter = useCallback((bookId: string, chapterData: { chapterNumber: number; title: string; content: string }): BookChapter => {
        const stored = localStorage.getItem(BOOKS_STORAGE_KEY);
        let currentBooks: Book[] = [];
        if (stored) {
            try {
                currentBooks = JSON.parse(stored);
            } catch (e) {}
        }
        const bookIndex = currentBooks.findIndex(b => b.id === bookId);
        if (bookIndex < 0) {
            throw new Error(`Book with id ${bookId} not found`);
        }

        const newChapter: BookChapter = {
            id: `chapter_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            bookId,
            chapterNumber: chapterData.chapterNumber,
            title: chapterData.title,
            content: chapterData.content,
            dateAdded: new Date().toISOString(),
            completed: false
        };

        const targetBook = { ...currentBooks[bookIndex] };
        const updatedChapters = [...(targetBook.chapters || []), newChapter].sort(
            (a, b) => a.chapterNumber - b.chapterNumber
        );

        targetBook.chapters = updatedChapters;
        targetBook.lastReadChapterId = newChapter.id;

        currentBooks[bookIndex] = targetBook;
        localStorage.setItem(BOOKS_STORAGE_KEY, JSON.stringify(currentBooks));
        setBooks([...currentBooks]);

        return newChapter;
    }, []);

    const updateChapter = useCallback((bookId: string, chapter: BookChapter) => {
        const stored = localStorage.getItem(BOOKS_STORAGE_KEY);
        let currentBooks: Book[] = [];
        if (stored) {
            try {
                currentBooks = JSON.parse(stored);
            } catch (e) {}
        }
        const bookIndex = currentBooks.findIndex(b => b.id === bookId);
        if (bookIndex < 0) return;

        const targetBook = { ...currentBooks[bookIndex] };
        const chapIndex = (targetBook.chapters || []).findIndex(c => c.id === chapter.id);
        if (chapIndex < 0) return;

        const updatedChapters = [...targetBook.chapters];
        updatedChapters[chapIndex] = chapter;
        targetBook.chapters = updatedChapters.sort((a, b) => a.chapterNumber - b.chapterNumber);

        currentBooks[bookIndex] = targetBook;
        localStorage.setItem(BOOKS_STORAGE_KEY, JSON.stringify(currentBooks));
        setBooks([...currentBooks]);
    }, []);

    const deleteChapter = useCallback((bookId: string, chapterId: string) => {
        const stored = localStorage.getItem(BOOKS_STORAGE_KEY);
        let currentBooks: Book[] = [];
        if (stored) {
            try {
                currentBooks = JSON.parse(stored);
            } catch (e) {}
        }
        const bookIndex = currentBooks.findIndex(b => b.id === bookId);
        if (bookIndex < 0) return;

        const targetBook = { ...currentBooks[bookIndex] };
        targetBook.chapters = (targetBook.chapters || []).filter(c => c.id !== chapterId);
        if (targetBook.lastReadChapterId === chapterId) {
            targetBook.lastReadChapterId = targetBook.chapters[0]?.id || undefined;
        }

        currentBooks[bookIndex] = targetBook;
        localStorage.setItem(BOOKS_STORAGE_KEY, JSON.stringify(currentBooks));
        setBooks([...currentBooks]);
    }, []);

    const setLastReadChapter = useCallback((bookId: string, chapterId: string) => {
        const stored = localStorage.getItem(BOOKS_STORAGE_KEY);
        let currentBooks: Book[] = [];
        if (stored) {
            try {
                currentBooks = JSON.parse(stored);
            } catch (e) {}
        }
        const bookIndex = currentBooks.findIndex(b => b.id === bookId);
        if (bookIndex < 0) return;

        const targetBook = { ...currentBooks[bookIndex] };
        targetBook.lastReadChapterId = chapterId;
        currentBooks[bookIndex] = targetBook;

        localStorage.setItem(BOOKS_STORAGE_KEY, JSON.stringify(currentBooks));
        setBooks([...currentBooks]);
    }, []);

    const getBook = useCallback((bookId: string): Book | undefined => {
        return books.find(b => b.id === bookId);
    }, [books]);

    const getChapter = useCallback((bookId: string, chapterId: string): { book: Book; chapter: BookChapter } | undefined => {
        const book = books.find(b => b.id === bookId);
        if (!book) return undefined;
        const chapter = (book.chapters || []).find(c => c.id === chapterId);
        if (!chapter) return undefined;
        return { book, chapter };
    }, [books]);

    return {
        books,
        passages,
        saveBook,
        deleteBook,
        addChapter,
        updateChapter,
        deleteChapter,
        setLastReadChapter,
        getBook,
        getChapter,
        savePassage,
        deletePassage,
    };
};
