import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Screen, ReadingPassage, Book, BookChapter, AnalyzedWordContext } from '../../types';
import { useReadingLibrary } from '../../hooks/useReadingLibrary';
import { useWords } from '../../contexts/WordsContext';
import { useSettings } from '../../contexts/SettingsContext';
import { analyzeWordInSentence } from '../../services/geminiService';
import { AiAnalysisConfirmModal } from '../modals/AiAnalysisConfirmModal';

interface ReadingLabScreenProps {
    onNavigate: (screen: Screen, params?: any) => void;
    passageId?: string;
    bookId?: string;
    chapterId?: string;
}

type ReaderTheme = 'dark' | 'sepia' | 'light';
type ReaderFontSize = 'normal' | 'large' | 'xlarge';

const FONT_CLASSES: Record<ReaderFontSize, string> = {
    normal: 'text-lg leading-[2.2]',
    large: 'text-xl md:text-2xl leading-[2.4]',
    xlarge: 'text-2xl md:text-3xl leading-[2.6]',
};

const THEME_CLASSES: Record<ReaderTheme, { container: string; card: string; text: string; header: string }> = {
    dark: {
        container: 'bg-[#0f172a] text-slate-200',
        card: 'bg-[#1e293b]/90 border-slate-700/50 shadow-2xl',
        text: 'text-slate-200',
        header: 'bg-[#1e293b]/80 border-slate-700/50',
    },
    sepia: {
        container: 'bg-[#fbf0d9] text-[#433422]',
        card: 'bg-[#f4e4c1] border-[#dfcd9f] shadow-xl',
        text: 'text-[#382b1c]',
        header: 'bg-[#f4e4c1]/90 border-[#dfcd9f]',
    },
    light: {
        container: 'bg-[#f8fafc] text-slate-800',
        card: 'bg-white border-slate-200 shadow-xl',
        text: 'text-slate-800',
        header: 'bg-white/90 border-slate-200',
    },
};

export const ReadingLabScreen: React.FC<ReadingLabScreenProps> = ({
    onNavigate,
    passageId,
    bookId,
    chapterId,
}) => {
    const { books, passages, setLastReadChapter } = useReadingLibrary();
    const { addWord, words } = useWords();
    const { geminiApiKey, currentLanguageInfo, currentSourceLanguage } = useSettings();

    // Determine current book & chapter OR fallback passage
    const book = bookId ? books.find(b => b.id === bookId) : null;
    const chapter = (book && chapterId) ? (book.chapters || []).find(c => c.id === chapterId) : null;
    const passage = (!book && passageId) ? passages.find(p => p.id === passageId) : null;

    // Content & Metadata
    const currentTitle = chapter ? chapter.title : (passage ? passage.title : 'Reading Lab');
    const bookTitle = book ? book.title : 'Reading Lab';
    const rawContent = chapter ? chapter.content : (passage ? passage.content : '');

    // Reader UI Preferences
    const [theme, setTheme] = useState<ReaderTheme>('dark');
    const [fontSize, setFontSize] = useState<ReaderFontSize>('large');
    const [showChapterDrawer, setShowChapterDrawer] = useState(false);

    // Selected Word & Sentence for AI Analysis
    const [pendingWord, setPendingWord] = useState('');
    const [pendingSentence, setPendingSentence] = useState('');
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisError, setAnalysisError] = useState<string | null>(null);

    // Analyzed Word Result & Bottom Panel
    const [analyzedData, setAnalyzedData] = useState<AnalyzedWordContext | null>(null);
    const [saveWordChoice, setSaveWordChoice] = useState<'base' | 'exact'>('base');
    const [addToSrs, setAddToSrs] = useState(true);
    const [toastMessage, setToastMessage] = useState<string | null>(null);

    // Audio TTS Helper
    const handleSpeak = (text: string) => {
        if (!text) return;
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'sv-SE';
        window.speechSynthesis.speak(utterance);
    };

    // Update last read chapter on mount/change
    useEffect(() => {
        if (bookId && chapterId) {
            setLastReadChapter(bookId, chapterId);
        }
    }, [bookId, chapterId, setLastReadChapter]);

    // Split text into paragraphs and sentences for structured reading
    const paragraphs = useMemo(() => {
        if (!rawContent) return [];
        return rawContent
            .split(/\n\s*\n/)
            .map(p => p.trim())
            .filter(Boolean);
    }, [rawContent]);

    // Find previous and next chapters for navigation
    const { prevChapter, nextChapter } = useMemo(() => {
        if (!book || !chapter || !book.chapters) return { prevChapter: null, nextChapter: null };
        const sorted = [...book.chapters].sort((a, b) => a.chapterNumber - b.chapterNumber);
        const idx = sorted.findIndex(c => c.id === chapter.id);
        return {
            prevChapter: idx > 0 ? sorted[idx - 1] : null,
            nextChapter: idx < sorted.length - 1 ? sorted[idx + 1] : null,
        };
    }, [book, chapter]);

    // Handle clicking a word
    const handleWordClick = (word: string, fullSentence: string) => {
        // Strip punctuation from word ends
        const cleanWord = word.replace(/^[.,!?;:()"“”'’—-]+|[.,!?;:()"“”'’—-]+$/g, '').trim();
        if (!cleanWord) return;

        setPendingWord(cleanWord);
        setPendingSentence(fullSentence.trim());
        setAnalysisError(null);
        setIsConfirmModalOpen(true);
    };

    // Confirm sending to Gemini
    const handleConfirmAnalysis = async () => {
        if (!geminiApiKey) {
            setAnalysisError('Google Gemini API Key is missing. Please add it in Settings.');
            setIsConfirmModalOpen(false);
            return;
        }

        setIsAnalyzing(true);
        setAnalysisError(null);

        try {
            const targetLang = currentLanguageInfo?.englishName || 'English';
            const result = await analyzeWordInSentence(
                pendingWord,
                pendingSentence,
                targetLang,
                geminiApiKey
            );
            setAnalyzedData(result);
            setSaveWordChoice('base');
            setIsConfirmModalOpen(false);
        } catch (err: any) {
            console.error(err);
            setAnalysisError(err?.message || 'Failed to analyze word with AI. Please check your connection and API key.');
        } finally {
            setIsAnalyzing(false);
        }
    };

    // Add word to flashcards / vocabulary
    const handleSaveToDeck = () => {
        if (!analyzedData) return;

        const wordToSave = saveWordChoice === 'base' && analyzedData.baseForm
            ? analyzedData.baseForm
            : analyzedData.targetWord;

        const translationText = analyzedData.contextMeaning || analyzedData.literalMeaning;
        const sentenceTranslation = analyzedData.sentenceTranslation || '';

        const newWordPayload: any = {
            swedish: wordToSave,
            swedishExample: analyzedData.sentenceSwedish || pendingSentence,
            translations: {
                [currentSourceLanguage]: {
                    word: translationText,
                    example: sentenceTranslation,
                },
                en: {
                    word: translationText,
                    example: sentenceTranslation,
                }
            },
            source: bookTitle,
            subtopic1: currentTitle,
            subtopic2: 'Reading Lab',
            wordType: analyzedData.wordType || '',
            swedishNote: analyzedData.grammarNotes || undefined,
        };

        if (addToSrs) {
            newWordPayload.srs_active = true;
            newWordPayload.srs_added_at = new Date().toISOString();
            newWordPayload.srs_interval = 1;
            newWordPayload.srs_repetition = 0;
            newWordPayload.srs_efactor = 2.5;
        }

        addWord(newWordPayload);

        // Show toast
        setToastMessage(`Saved "${wordToSave}" to your Vocabulary deck!`);
        setTimeout(() => setToastMessage(null), 3500);

        // Close bottom drawer
        setAnalyzedData(null);
    };

    if (!chapter && !passage) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] bg-base-100 p-8 rounded-3xl text-center">
                <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center text-gray-400 mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Chapter not found</h3>
                <p className="text-sm text-gray-400 mb-6">This chapter or reading passage could not be loaded.</p>
                <button
                    onClick={() => onNavigate('reading-library')}
                    className="px-6 py-2.5 rounded-xl bg-primary text-white font-bold text-sm"
                >
                    Back to Library
                </button>
            </div>
        );
    }

    const themeStyles = THEME_CLASSES[theme];

    return (
        <div className={`flex flex-col h-full min-h-[90vh] ${themeStyles.container} rounded-3xl border border-white/5 shadow-2xl relative overflow-hidden transition-colors duration-300`}>
            {/* Top Reader Bar */}
            <div className={`flex items-center justify-between p-3 sm:p-4 border-b ${themeStyles.header} backdrop-blur-md sticky top-0 z-30 transition-colors`}>
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    <button
                        onClick={() => onNavigate('reading-library')}
                        className="p-2 rounded-xl hover:bg-black/10 transition-colors"
                        title="Back to Library"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                    </button>

                    <div className="min-w-0">
                        {book && (
                            <span className="text-[11px] font-bold uppercase tracking-wider text-primary truncate block">
                                {book.title}
                            </span>
                        )}
                        <h1 className="text-sm sm:text-base font-bold truncate">
                            {currentTitle}
                        </h1>
                    </div>
                </div>

                {/* Reader Controls */}
                <div className="flex items-center gap-1.5 sm:gap-2">
                    {/* Chapter Drawer Toggle (if book has chapters) */}
                    {book && (book.chapters?.length || 0) > 1 && (
                        <button
                            onClick={() => setShowChapterDrawer(!showChapterDrawer)}
                            className="p-2 rounded-xl hover:bg-black/10 transition-colors flex items-center gap-1.5 text-xs font-bold"
                            title="Table of Contents"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h7" />
                            </svg>
                            <span className="hidden sm:inline">Chapters</span>
                        </button>
                    )}

                    {/* Font Size Button */}
                    <div className="flex items-center bg-black/10 rounded-xl p-0.5">
                        <button
                            onClick={() => {
                                if (fontSize === 'xlarge') setFontSize('large');
                                else if (fontSize === 'large') setFontSize('normal');
                            }}
                            disabled={fontSize === 'normal'}
                            className="px-2 py-1 text-xs font-bold rounded-lg disabled:opacity-30 hover:bg-black/10"
                        >
                            A-
                        </button>
                        <button
                            onClick={() => {
                                if (fontSize === 'normal') setFontSize('large');
                                else if (fontSize === 'large') setFontSize('xlarge');
                            }}
                            disabled={fontSize === 'xlarge'}
                            className="px-2 py-1 text-xs font-bold rounded-lg disabled:opacity-30 hover:bg-black/10"
                        >
                            A+
                        </button>
                    </div>

                    {/* Theme Toggle */}
                    <div className="flex items-center bg-black/10 rounded-xl p-0.5">
                        <button
                            onClick={() => setTheme('dark')}
                            className={`w-6 h-6 rounded-lg bg-[#0f172a] border border-white/20 transition-transform ${theme === 'dark' ? 'scale-110 ring-2 ring-primary' : 'opacity-60'}`}
                            title="Dark Theme"
                        />
                        <button
                            onClick={() => setTheme('sepia')}
                            className={`w-6 h-6 rounded-lg bg-[#f4e4c1] border border-amber-800/30 transition-transform ${theme === 'sepia' ? 'scale-110 ring-2 ring-primary' : 'opacity-60'}`}
                            title="Sepia Theme"
                        />
                        <button
                            onClick={() => setTheme('light')}
                            className={`w-6 h-6 rounded-lg bg-white border border-slate-300 transition-transform ${theme === 'light' ? 'scale-110 ring-2 ring-primary' : 'opacity-60'}`}
                            title="Light Theme"
                        />
                    </div>
                </div>
            </div>

            {/* Error Notification */}
            {analysisError && (
                <div className="m-4 p-4 rounded-2xl bg-red-500/20 border border-red-500/30 text-red-400 text-sm flex justify-between items-center animate-fade-in">
                    <span>{analysisError}</span>
                    <button onClick={() => setAnalysisError(null)} className="p-1 hover:text-white">✕</button>
                </div>
            )}

            {/* Toast Notification */}
            {toastMessage && (
                <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white font-bold py-2.5 px-6 rounded-full shadow-2xl animate-fade-in flex items-center gap-2 text-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>{toastMessage}</span>
                </div>
            )}

            {/* Main Reading Flow */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-8 md:p-12 pb-48">
                <div className="max-w-3xl mx-auto">
                    {/* Chapter Title & Header inside text */}
                    <div className="text-center mb-10 pb-6 border-b border-white/5">
                        {book && (
                            <span className="text-xs uppercase font-extrabold tracking-widest text-primary block mb-2">
                                {book.title}
                            </span>
                        )}
                        <h2 className="text-2xl sm:text-4xl font-black mb-3">
                            {currentTitle}
                        </h2>
                        <span className="text-xs text-gray-500 font-semibold uppercase tracking-wider">
                            💡 Tap any word to view its definition & add to your deck
                        </span>
                    </div>

                    {/* Paragraphs and Words */}
                    <div className={`space-y-6 ${FONT_CLASSES[fontSize]} ${themeStyles.text} font-serif tracking-wide`}>
                        {paragraphs.map((paraText, pIdx) => {
                            // Split paragraph into sentences using terminal punctuation followed by space
                            // Matches full sentence boundary accurately while preserving punctuation
                            const sentenceMatches = paraText.match(/[^.!?]+[.!?]+(\s+|$)|[^.!?]+$/g) || [paraText];

                            return (
                                <p key={pIdx} className="leading-relaxed">
                                    {sentenceMatches.map((sentence, sIdx) => {
                                        // Split sentence into words and whitespace/punctuation
                                        const tokens = sentence.split(/(\s+)/);

                                        return (
                                            <span key={sIdx} className="inline">
                                                {tokens.map((token, tIdx) => {
                                                    // Check if token is a word
                                                    const isWord = /[A-ZÅÄÖa-zåäö0-9]/.test(token);
                                                    if (!isWord) {
                                                        return <span key={tIdx}>{token}</span>;
                                                    }

                                                    // Check if word is already in user's library
                                                    const clean = token.replace(/^[.,!?;:()"“”'’—-]+|[.,!?;:()"“”'’—-]+$/g, '').toLowerCase();
                                                    const isInDeck = words.some(w => w.swedish.toLowerCase() === clean);

                                                    return (
                                                        <span
                                                            key={tIdx}
                                                            onClick={() => handleWordClick(token, sentence)}
                                                            className={`cursor-pointer rounded px-0.5 transition-all select-text hover:bg-primary/20 hover:text-primary ${
                                                                isInDeck ? 'underline decoration-primary/40 decoration-2 underline-offset-4' : ''
                                                            }`}
                                                            title="Click to analyze with AI"
                                                        >
                                                            {token}
                                                        </span>
                                                    );
                                                })}
                                            </span>
                                        );
                                    })}
                                </p>
                            );
                        })}
                    </div>

                    {/* Chapter Bottom Navigation */}
                    {book && (
                        <div className="flex items-center justify-between pt-12 mt-12 border-t border-white/10 gap-4">
                            {prevChapter ? (
                                <button
                                    onClick={() => onNavigate('reading-lab', { bookId: book.id, chapterId: prevChapter.id })}
                                    className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-black/10 hover:bg-black/20 font-bold text-sm transition-all"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                                    </svg>
                                    <span>Kapitel {prevChapter.chapterNumber}</span>
                                </button>
                            ) : <div />}

                            {nextChapter ? (
                                <button
                                    onClick={() => onNavigate('reading-lab', { bookId: book.id, chapterId: nextChapter.id })}
                                    className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-primary hover:bg-primary-focus text-white font-bold text-sm shadow-xl shadow-primary/30 transition-all"
                                >
                                    <span>Next: Kapitel {nextChapter.chapterNumber}</span>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                                    </svg>
                                </button>
                            ) : (
                                <button
                                    onClick={() => onNavigate('reading-library')}
                                    className="px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-xl shadow-emerald-600/30 transition-all"
                                >
                                    ✓ Finish Book
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Chapter Table of Contents Drawer */}
            {showChapterDrawer && book && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-40 flex justify-end animate-fade-in" onClick={() => setShowChapterDrawer(false)}>
                    <div className="w-80 max-w-[85vw] h-full bg-base-100 p-6 border-l border-white/10 shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-6 pb-3 border-b border-base-200">
                            <div>
                                <span className="text-[10px] uppercase font-bold tracking-wider text-primary">{book.title}</span>
                                <h3 className="text-lg font-bold text-white">Chapters</h3>
                            </div>
                            <button onClick={() => setShowChapterDrawer(false)} className="p-1 rounded-lg hover:bg-white/10 text-gray-400">
                                ✕
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                            {(book.chapters || []).map((ch) => {
                                const isCurrent = ch.id === chapter?.id;
                                return (
                                    <button
                                        key={ch.id}
                                        onClick={() => {
                                            setShowChapterDrawer(false);
                                            onNavigate('reading-lab', { bookId: book.id, chapterId: ch.id });
                                        }}
                                        className={`w-full text-left p-3 rounded-xl transition-all flex items-center justify-between text-sm ${
                                            isCurrent
                                                ? 'bg-primary text-white font-bold shadow-md'
                                                : 'hover:bg-white/5 text-gray-300'
                                        }`}
                                    >
                                        <span className="truncate">{ch.title}</span>
                                        <span className="text-xs opacity-60 ml-2">Ch {ch.chapterNumber}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* Bottom Analysis Result Card / Drawer */}
            {analyzedData && (
                <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-xl bg-base-100 rounded-3xl border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.5)] p-5 animate-slide-in-up flex flex-col gap-4">
                    {/* Header: Word & Audio */}
                    <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                            <div>
                                <div className="flex items-center gap-2">
                                    <h3 className="text-2xl font-black text-primary">
                                        {analyzedData.targetWord}
                                    </h3>
                                    {analyzedData.baseForm && analyzedData.baseForm.toLowerCase() !== analyzedData.targetWord.toLowerCase() && (
                                        <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30">
                                            Base: {analyzedData.baseForm}
                                        </span>
                                    )}
                                </div>
                                {analyzedData.wordType && (
                                    <span className="text-xs font-semibold text-gray-400">
                                        {analyzedData.wordType}
                                    </span>
                                )}
                            </div>

                            <button
                                onClick={() => handleSpeak(analyzedData.targetWord)}
                                className="p-2 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary transition-colors"
                                title="Listen to Swedish pronunciation"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                                </svg>
                            </button>
                        </div>

                        <button
                            onClick={() => setAnalyzedData(null)}
                            className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/10"
                        >
                            ✕
                        </button>
                    </div>

                    {/* Meanings */}
                    <div className="space-y-2 text-sm bg-base-200/50 p-3.5 rounded-2xl border border-white/5">
                        <div>
                            <span className="text-[10px] uppercase font-bold text-gray-400 block mb-0.5">Meaning in this Context</span>
                            <span className="text-white font-semibold text-base">{analyzedData.contextMeaning}</span>
                        </div>

                        {analyzedData.literalMeaning && analyzedData.literalMeaning !== analyzedData.contextMeaning && (
                            <div className="pt-2 border-t border-white/5">
                                <span className="text-[10px] uppercase font-bold text-gray-400 block mb-0.5">Literal Translation</span>
                                <span className="text-gray-300">{analyzedData.literalMeaning}</span>
                            </div>
                        )}

                        {analyzedData.dependencies && analyzedData.dependencies.length > 0 && (
                            <div className="pt-2 border-t border-white/5 flex items-center gap-1.5 text-xs text-amber-300 font-medium">
                                <span>🔗 Connected particle/word:</span>
                                <span className="font-bold underline">{analyzedData.dependencies.join(', ')}</span>
                            </div>
                        )}

                        {analyzedData.grammarNotes && (
                            <div className="pt-2 border-t border-white/5 text-xs text-gray-400 italic">
                                📝 {analyzedData.grammarNotes}
                            </div>
                        )}
                    </div>

                    {/* Context Sentence Preview */}
                    {analyzedData.sentenceSwedish && (
                        <div className="text-xs text-gray-400 bg-white/5 p-3 rounded-2xl border border-white/5 flex justify-between items-center gap-2">
                            <div className="min-w-0">
                                <p className="italic text-gray-200 truncate">"{analyzedData.sentenceSwedish}"</p>
                                {analyzedData.sentenceTranslation && (
                                    <p className="text-gray-400 truncate mt-0.5">{analyzedData.sentenceTranslation}</p>
                                )}
                            </div>
                            <button
                                onClick={() => handleSpeak(analyzedData.sentenceSwedish)}
                                className="p-1.5 rounded-lg hover:bg-white/10 text-gray-300 shrink-0"
                                title="Listen to full sentence"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.536 8.464a5 5 0 010 7.072M12 5v14l-5-5H4V10h3l5-5z" />
                                </svg>
                            </button>
                        </div>
                    )}

                    {/* Save Configuration & Action */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
                        {/* Choose which form to save if different */}
                        {analyzedData.baseForm && analyzedData.baseForm.toLowerCase() !== analyzedData.targetWord.toLowerCase() ? (
                            <div className="flex items-center gap-2 text-xs">
                                <span className="text-gray-400">Save as:</span>
                                <button
                                    onClick={() => setSaveWordChoice('base')}
                                    className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${saveWordChoice === 'base' ? 'bg-primary text-white' : 'bg-white/5 text-gray-300'}`}
                                >
                                    {analyzedData.baseForm} (Base)
                                </button>
                                <button
                                    onClick={() => setSaveWordChoice('exact')}
                                    className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${saveWordChoice === 'exact' ? 'bg-primary text-white' : 'bg-white/5 text-gray-300'}`}
                                >
                                    {analyzedData.targetWord} (Exact)
                                </button>
                            </div>
                        ) : <div />}

                        <div className="flex items-center gap-3">
                            <label className="flex items-center gap-1.5 text-xs text-gray-300 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={addToSrs}
                                    onChange={(e) => setAddToSrs(e.target.checked)}
                                    className="rounded border-white/20 text-primary focus:ring-0 w-4 h-4"
                                />
                                <span>Add to SRS</span>
                            </label>

                            <button
                                onClick={handleSaveToDeck}
                                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary to-indigo-600 hover:opacity-90 text-white font-bold text-sm shadow-lg shadow-primary/30 flex items-center justify-center gap-2 transition-all"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                                </svg>
                                <span>Save to Flashcards</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* AI Confirmation Modal */}
            <AiAnalysisConfirmModal
                isOpen={isConfirmModalOpen}
                onClose={() => setIsConfirmModalOpen(false)}
                targetWord={pendingWord}
                fullSentence={pendingSentence}
                onConfirm={handleConfirmAnalysis}
                isLoading={isAnalyzing}
            />
        </div>
    );
};
