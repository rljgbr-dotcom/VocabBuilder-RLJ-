import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Screen, ReadingPassage, Book, BookChapter, AnalyzedWordContext } from '../../types';
import { useReadingLibrary } from '../../hooks/useReadingLibrary';
import { useWords } from '../../contexts/WordsContext';
import { useSettings } from '../../contexts/SettingsContext';
import { analyzeWordInSentence } from '../../services/geminiService';
import {
    checkLibraryWord,
    fetchNonAiTranslation,
    getCachedTranslation,
    saveToTranslationCache,
    detectOldSwedish,
    translateChapterNonAi,
    getChapterTranslationCache,
} from '../../services/translationService';
import { AiAnalysisConfirmModal } from '../modals/AiAnalysisConfirmModal';
import { ResumeReadingModal } from '../modals/ResumeReadingModal';

interface ReadingLabScreenProps {
    onNavigate: (screen: Screen, params?: any) => void;
    passageId?: string;
    bookId?: string;
    chapterId?: string;
}

type ReaderTheme = 'dark' | 'sepia' | 'light';
type ReaderFontSize = 'normal' | 'large' | 'xlarge';

const FONT_CLASSES: Record<ReaderFontSize, string> = {
    normal: 'text-base sm:text-lg leading-[2.1]',
    large: 'text-lg sm:text-xl md:text-2xl leading-[2.3]',
    xlarge: 'text-xl sm:text-2xl md:text-3xl leading-[2.5]',
};

// Line height in pixels for the reading guide line
const RULER_HEIGHTS: Record<ReaderFontSize, number> = {
    normal: 36,
    large: 46,
    xlarge: 58,
};

const THEME_CLASSES: Record<ReaderTheme, { container: string; card: string; text: string; header: string; ruler: string }> = {
    dark: {
        container: 'bg-[#0f172a] text-slate-200',
        card: 'bg-[#1e293b]/95 border-slate-700/60 shadow-2xl',
        text: 'text-slate-200',
        header: 'bg-[#1e293b]/90 border-slate-700/50',
        ruler: 'bg-cyan-500/15 border-y border-cyan-400/40',
    },
    sepia: {
        container: 'bg-[#fbf0d9] text-[#433422]',
        card: 'bg-[#f4e4c1]/95 border-[#dfcd9f] shadow-xl',
        text: 'text-[#382b1c]',
        header: 'bg-[#f4e4c1]/90 border-[#dfcd9f]',
        ruler: 'bg-amber-600/15 border-y border-amber-600/40',
    },
    light: {
        container: 'bg-[#f8fafc] text-slate-800',
        card: 'bg-white/95 border-slate-200 shadow-xl',
        text: 'text-slate-800',
        header: 'bg-white/90 border-slate-200',
        ruler: 'bg-blue-500/15 border-y border-blue-500/40',
    },
};

export const ReadingLabScreen: React.FC<ReadingLabScreenProps> = ({
    onNavigate,
    passageId,
    bookId,
    chapterId,
}) => {
    const { books, passages, setLastReadChapter, saveChapterProgress } = useReadingLibrary();
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

    // Reading Guide Line Tracker
    const [showReadingRuler, setShowReadingRuler] = useState(false);
    const [rulerTop, setRulerTop] = useState<number>(120);

    // Half & Half / Split Parallel Translation Mode
    const [isSplitView, setIsSplitView] = useState(false);
    const [translatedParagraphs, setTranslatedParagraphs] = useState<string[]>([]);
    const [isTranslatingChapter, setIsTranslatingChapter] = useState(false);
    const [translationProgress, setTranslationProgress] = useState<{ done: number; total: number }>({ done: 0, total: 0 });
    const [hoveredParaIdx, setHoveredParaIdx] = useState<number | null>(null);

    // Resume reading modal
    const [isResumeModalOpen, setIsResumeModalOpen] = useState(false);
    const hasCheckedResumeRef = useRef(false);

    // Synchronized scroll container references
    const originalContainerRef = useRef<HTMLDivElement>(null);
    const translationContainerRef = useRef<HTMLDivElement>(null);
    const syncingSourceRef = useRef<'original' | 'translation' | null>(null);

    // Selected Word & Sentence for AI Analysis
    const [pendingWord, setPendingWord] = useState('');
    const [pendingSentence, setPendingSentence] = useState('');
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [loadingMode, setLoadingMode] = useState<'ai' | 'non-ai' | null>(null);
    const [analysisError, setAnalysisError] = useState<string | null>(null);

    // Analyzed Word Result & Bottom Panel
    const [analyzedData, setAnalyzedData] = useState<AnalyzedWordContext | null>(null);
    const [saveWordChoice, setSaveWordChoice] = useState<'base' | 'exact' | 'modern'>('base');
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

    // Check for previous reading progress on initial chapter open
    useEffect(() => {
        if (!chapter || hasCheckedResumeRef.current) return;
        hasCheckedResumeRef.current = true;

        const progress = chapter.scrollProgress || 0;
        const savedTop = chapter.savedScrollTop || 0;

        if (progress > 5 && savedTop > 100) {
            setIsResumeModalOpen(true);
        }
    }, [chapter]);

    const handleResume = () => {
        setIsResumeModalOpen(false);
        if (chapter?.savedScrollTop && originalContainerRef.current) {
            originalContainerRef.current.scrollTo({
                top: chapter.savedScrollTop,
                behavior: 'smooth',
            });
        }
    };

    const handleStartOver = () => {
        setIsResumeModalOpen(false);
        if (originalContainerRef.current) {
            originalContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
        }
        if (book && chapter) {
            saveChapterProgress(book.id, chapter.id, 0, 0);
        }
    };

    // Track scroll position throttled
    const handleSaveScrollPosition = useCallback(() => {
        if (!originalContainerRef.current || !book || !chapter) return;
        const el = originalContainerRef.current;
        const total = el.scrollHeight - el.clientHeight;
        if (total <= 0) return;

        const progress = Math.min(100, Math.round((el.scrollTop / total) * 100));
        saveChapterProgress(book.id, chapter.id, progress, el.scrollTop);
    }, [book, chapter, saveChapterProgress]);

    // Split text into paragraphs
    const paragraphs = useMemo(() => {
        if (!rawContent) return [];
        return rawContent
            .split(/\n\s*\n/)
            .map(p => p.trim())
            .filter(Boolean);
    }, [rawContent]);

    // Load or generate Non-AI translation for the chapter when split view is active
    useEffect(() => {
        if (!isSplitView || paragraphs.length === 0) return;

        const effectiveId = chapter ? chapter.id : (passage ? passage.id : 'passage_temp');
        const langCode = currentSourceLanguage || 'en';

        // Check cache first
        const cached = getChapterTranslationCache(effectiveId, langCode);
        if (cached && cached.length === paragraphs.length) {
            setTranslatedParagraphs(cached);
            return;
        }

        // Translate progressively using non-AI translation
        setIsTranslatingChapter(true);
        setTranslationProgress({ done: 0, total: paragraphs.length });

        translateChapterNonAi(
            paragraphs,
            effectiveId,
            langCode,
            (index, translation, completed, total) => {
                setTranslatedParagraphs(prev => {
                    const next = [...prev];
                    while (next.length < total) next.push('');
                    next[index] = translation;
                    return next;
                });
                setTranslationProgress({ done: completed, total });
            }
        ).then(results => {
            setTranslatedParagraphs(results);
            setIsTranslatingChapter(false);
        }).catch(err => {
            console.error('Failed to translate chapter paragraphs in non-AI mode:', err);
            setIsTranslatingChapter(false);
        });
    }, [isSplitView, paragraphs, chapter, passage, currentSourceLanguage]);

    // Synchronized scroll handlers between original Swedish and matching translation
    const handleOriginalScroll = (e: React.UIEvent<HTMLDivElement>) => {
        handleSaveScrollPosition();

        if (!isSplitView || !translationContainerRef.current) return;
        if (syncingSourceRef.current === 'translation') return;

        syncingSourceRef.current = 'original';
        const source = e.currentTarget;
        const target = translationContainerRef.current;

        const sourceMax = source.scrollHeight - source.clientHeight;
        if (sourceMax > 0) {
            const ratio = source.scrollTop / sourceMax;
            const targetMax = target.scrollHeight - target.clientHeight;
            target.scrollTop = ratio * targetMax;
        }

        requestAnimationFrame(() => {
            syncingSourceRef.current = null;
        });
    };

    const handleTranslationScroll = (e: React.UIEvent<HTMLDivElement>) => {
        if (!isSplitView || !originalContainerRef.current) return;
        if (syncingSourceRef.current === 'original') return;

        syncingSourceRef.current = 'translation';
        const source = e.currentTarget;
        const target = originalContainerRef.current;

        const sourceMax = source.scrollHeight - source.clientHeight;
        if (sourceMax > 0) {
            const ratio = source.scrollTop / sourceMax;
            const targetMax = target.scrollHeight - target.clientHeight;
            target.scrollTop = ratio * targetMax;
        }

        requestAnimationFrame(() => {
            syncingSourceRef.current = null;
        });
    };

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
        const cleanWord = word.replace(/^[.,!?;:()"“”'’—-]+|[.,!?;:()"“”'’—-]+$/g, '').trim();
        if (!cleanWord) return;

        setPendingWord(cleanWord);
        setPendingSentence(fullSentence.trim());
        setAnalysisError(null);

        // 1. FIRST CHECK: Is word already in user's library?
        const libraryWord = checkLibraryWord(cleanWord, words, currentSourceLanguage);
        if (libraryWord) {
            libraryWord.sentenceSwedish = fullSentence.trim();
            setAnalyzedData(libraryWord);
            setSaveWordChoice('base');
            return;
        }

        // 2. SECOND CHECK: Is it in the translation cache?
        const cached = getCachedTranslation(cleanWord, fullSentence);
        if (cached) {
            setAnalyzedData(cached);
            setSaveWordChoice(cached.isArchaic && cached.modernEquivalent ? 'modern' : 'base');
            return;
        }

        // 3. Otherwise: Open confirmation modal offering Free Dictionary or AI
        setIsConfirmModalOpen(true);
    };

    // Execute AI Analysis (Gemini)
    const handleConfirmAi = async () => {
        if (!geminiApiKey) {
            setAnalysisError('Google Gemini API Key is missing. Please add it in Settings.');
            setIsConfirmModalOpen(false);
            return;
        }

        setIsAnalyzing(true);
        setLoadingMode('ai');
        setAnalysisError(null);

        try {
            const targetLang = currentLanguageInfo?.englishName || 'English';
            const result = await analyzeWordInSentence(
                pendingWord,
                pendingSentence,
                targetLang,
                geminiApiKey
            );
            result.isAi = true;
            result.isLibrary = false;

            // Cache translation in memory & localStorage
            saveToTranslationCache(pendingWord, result);
            saveToTranslationCache(`${pendingWord}|${pendingSentence}`, result);

            setAnalyzedData(result);
            setSaveWordChoice(result.isArchaic && result.modernEquivalent ? 'modern' : 'base');
            setIsConfirmModalOpen(false);
        } catch (err: any) {
            console.error(err);
            setAnalysisError(err?.message || 'Failed to analyze word with AI. Please check your connection and API key.');
        } finally {
            setIsAnalyzing(false);
            setLoadingMode(null);
        }
    };

    // Execute Free Non-AI Dictionary Translation
    const handleConfirmNonAi = async () => {
        setIsAnalyzing(true);
        setLoadingMode('non-ai');
        setAnalysisError(null);

        try {
            const result = await fetchNonAiTranslation(
                pendingWord,
                pendingSentence,
                currentSourceLanguage || 'en'
            );

            // Cache translation
            saveToTranslationCache(pendingWord, result);

            setAnalyzedData(result);
            setSaveWordChoice(result.isArchaic && result.modernEquivalent ? 'modern' : 'base');
            setIsConfirmModalOpen(false);
        } catch (err: any) {
            console.error(err);
            setAnalysisError('Dictionary lookup failed.');
        } finally {
            setIsAnalyzing(false);
            setLoadingMode(null);
        }
    };

    // Add word to flashcards / vocabulary
    const handleSaveToDeck = () => {
        if (!analyzedData) return;

        let wordToSave = analyzedData.targetWord;
        if (saveWordChoice === 'modern' && analyzedData.modernEquivalent) {
            wordToSave = analyzedData.modernEquivalent;
        } else if (saveWordChoice === 'base' && analyzedData.baseForm) {
            wordToSave = analyzedData.baseForm;
        }

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
            swedishNote: [
                analyzedData.isArchaic ? `Old Swedish: ${analyzedData.targetWord} (Modern: ${analyzedData.modernEquivalent || wordToSave})` : null,
                analyzedData.grammarNotes || null,
            ].filter(Boolean).join(' • ') || undefined,
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
    const rulerHeight = RULER_HEIGHTS[fontSize];

    return (
        <div className={`flex flex-col h-full min-h-[90dvh] max-h-[100dvh] ${themeStyles.container} rounded-3xl border border-white/5 shadow-2xl relative overflow-hidden transition-colors duration-300`}>
            {/* Top Reader Bar */}
            <div className={`flex items-center justify-between p-2.5 sm:p-4 border-b ${themeStyles.header} backdrop-blur-md sticky top-0 z-30 transition-colors shrink-0`}>
                <div className="flex items-center gap-2 min-w-0">
                    <button
                        onClick={() => onNavigate('reading-library')}
                        className="p-2 rounded-xl hover:bg-black/10 transition-colors shrink-0"
                        title="Back to Library"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                    </button>

                    <div className="min-w-0">
                        {book && (
                            <span className="text-[10px] font-bold uppercase tracking-wider text-primary truncate block">
                                {book.title}
                            </span>
                        )}
                        <h1 className="text-xs sm:text-base font-bold truncate">
                            {currentTitle}
                        </h1>
                    </div>
                </div>

                {/* Reader Controls */}
                <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                    {/* Half & Half / Split Screen Toggle */}
                    <button
                        onClick={() => setIsSplitView(!isSplitView)}
                        className={`p-2 rounded-xl transition-all flex items-center gap-1.5 text-xs font-bold ${
                            isSplitView
                                ? 'bg-gradient-to-r from-cyan-600 to-indigo-600 text-white shadow-md shadow-cyan-600/30'
                                : 'hover:bg-black/10 opacity-70 hover:opacity-100'
                        }`}
                        title={isSplitView ? "Switch to Single View" : "Toggle Half-and-Half Parallel Translation"}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 4v16m6-16v16M4 4h16a1 1 0 011 1v14a1 1 0 01-1 1H4a1 1 0 01-1-1V5a1 1 0 011-1z" />
                        </svg>
                        <span className="hidden sm:inline">{isSplitView ? 'Dual ON' : 'Half & Half'}</span>
                    </button>

                    {/* Reading Guide Ruler Toggle */}
                    <button
                        onClick={() => setShowReadingRuler(!showReadingRuler)}
                        className={`p-2 rounded-xl transition-all flex items-center gap-1 text-xs font-bold ${
                            showReadingRuler ? 'bg-primary text-white shadow-md' : 'hover:bg-black/10 opacity-70 hover:opacity-100'
                        }`}
                        title="Toggle Line Guide Ruler"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                        <span className="hidden md:inline">Line Guide</span>
                    </button>

                    {/* Chapter Drawer Toggle */}
                    {book && (book.chapters?.length || 0) > 1 && (
                        <button
                            onClick={() => setShowChapterDrawer(!showChapterDrawer)}
                            className="p-2 rounded-xl hover:bg-black/10 transition-colors flex items-center gap-1 text-xs font-bold"
                            title="Table of Contents"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h7" />
                            </svg>
                            <span className="hidden sm:inline">TOC</span>
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
                            className="px-1.5 sm:px-2 py-1 text-xs font-bold rounded-lg disabled:opacity-30 hover:bg-black/10"
                        >
                            A-
                        </button>
                        <button
                            onClick={() => {
                                if (fontSize === 'normal') setFontSize('large');
                                else if (fontSize === 'large') setFontSize('xlarge');
                            }}
                            disabled={fontSize === 'xlarge'}
                            className="px-1.5 sm:px-2 py-1 text-xs font-bold rounded-lg disabled:opacity-30 hover:bg-black/10"
                        >
                            A+
                        </button>
                    </div>

                    {/* Theme Toggle */}
                    <div className="flex items-center bg-black/10 rounded-xl p-0.5">
                        <button
                            onClick={() => setTheme('dark')}
                            className={`w-5 h-5 sm:w-6 sm:h-6 rounded-lg bg-[#0f172a] border border-white/20 transition-transform ${theme === 'dark' ? 'scale-110 ring-2 ring-primary' : 'opacity-60'}`}
                            title="Dark Theme"
                        />
                        <button
                            onClick={() => setTheme('sepia')}
                            className={`w-5 h-5 sm:w-6 sm:h-6 rounded-lg bg-[#f4e4c1] border border-amber-800/30 transition-transform ${theme === 'sepia' ? 'scale-110 ring-2 ring-primary' : 'opacity-60'}`}
                            title="Sepia Theme"
                        />
                        <button
                            onClick={() => setTheme('light')}
                            className={`w-5 h-5 sm:w-6 sm:h-6 rounded-lg bg-white border border-slate-300 transition-transform ${theme === 'light' ? 'scale-110 ring-2 ring-primary' : 'opacity-60'}`}
                            title="Light Theme"
                        />
                    </div>
                </div>
            </div>

            {/* Error Notification */}
            {analysisError && (
                <div className="m-3 p-3 rounded-2xl bg-red-500/20 border border-red-500/30 text-red-400 text-xs sm:text-sm flex justify-between items-center animate-fade-in shrink-0">
                    <span>{analysisError}</span>
                    <button onClick={() => setAnalysisError(null)} className="p-1 hover:text-white">✕</button>
                </div>
            )}

            {/* Toast Notification */}
            {toastMessage && (
                <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white font-bold py-2 px-5 rounded-full shadow-2xl animate-fade-in flex items-center gap-2 text-xs sm:text-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>{toastMessage}</span>
                </div>
            )}

            {/* ── MAIN READING WORKSPACE: Single View OR Half-and-Half Parallel Split View ── */}
            <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden relative">
                {/* ── WINDOW 1: Original Swedish Text (Top on mobile, Left on PC) ── */}
                <div className={`flex flex-col min-h-0 overflow-hidden relative ${
                    isSplitView 
                        ? 'h-1/2 md:h-full md:w-1/2 border-b md:border-b-0 md:border-r border-white/10' 
                        : 'w-full h-full'
                }`}>
                    {isSplitView && (
                        <div className="px-4 py-1.5 bg-black/25 text-[10px] uppercase font-bold tracking-wider text-cyan-400 flex justify-between items-center border-b border-white/5 shrink-0">
                            <span className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                                Svenska (Original)
                            </span>
                            <span className="text-gray-400 text-[10px] lowercase">tap words to inspect</span>
                        </div>
                    )}

                    <div 
                        ref={originalContainerRef}
                        onScroll={handleOriginalScroll}
                        onPointerMove={(e) => {
                            if (showReadingRuler && originalContainerRef.current) {
                                const rect = originalContainerRef.current.getBoundingClientRect();
                                const y = e.clientY - rect.top;
                                setRulerTop(Math.max(10, y - rulerHeight / 2));
                            }
                        }}
                        className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-10 pb-40 relative"
                    >
                        {/* Reading Guide Ruler overlay */}
                        {showReadingRuler && (
                            <div
                                className={`pointer-events-none absolute left-0 right-0 z-20 ${themeStyles.ruler} transition-all duration-75`}
                                style={{
                                    top: `${rulerTop}px`,
                                    height: `${rulerHeight}px`,
                                }}
                            />
                        )}

                        <div className="max-w-3xl mx-auto">
                            {/* Chapter Header */}
                            <div className="text-center mb-6 pb-4 border-b border-white/5">
                                {book && (
                                    <span className="text-[10px] uppercase font-extrabold tracking-widest text-primary block mb-1">
                                        {book.title}
                                    </span>
                                )}
                                <h2 className="text-lg sm:text-2xl font-black mb-1">
                                    {currentTitle}
                                </h2>
                                {!isSplitView && (
                                    <span className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider">
                                        💡 Underlined words are in your library • Tap any word to translate
                                    </span>
                                )}
                            </div>

                            {/* Paragraphs and Words */}
                            <div className={`space-y-6 ${FONT_CLASSES[fontSize]} ${themeStyles.text} font-serif tracking-wide select-text`}>
                                {paragraphs.map((paraText, pIdx) => {
                                    const sentenceMatches = paraText.match(/[^.!?]+[.!?]+(\s+|$)|[^.!?]+$/g) || [paraText];
                                    const isHovered = hoveredParaIdx === pIdx;

                                    return (
                                        <p 
                                            key={pIdx} 
                                            onMouseEnter={() => setHoveredParaIdx(pIdx)}
                                            onMouseLeave={() => setHoveredParaIdx(null)}
                                            className={`leading-relaxed transition-colors rounded-xl p-1.5 -mx-1.5 ${
                                                isHovered && isSplitView ? 'bg-primary/10' : ''
                                            }`}
                                        >
                                            {sentenceMatches.map((sentence, sIdx) => {
                                                const tokens = sentence.split(/(\s+)/);

                                                return (
                                                    <span key={sIdx} className="inline">
                                                        {tokens.map((token, tIdx) => {
                                                            const isWord = /[A-ZÅÄÖa-zåäö0-9]/.test(token);
                                                            if (!isWord) {
                                                                return <span key={tIdx}>{token}</span>;
                                                            }

                                                            const clean = token.replace(/^[.,!?;:()"“”'’—-]+|[.,!?;:()"“”'’—-]+$/g, '').toLowerCase();
                                                            
                                                            const isKnownInDeck = words.some(w => 
                                                                w.swedish.toLowerCase() === clean ||
                                                                (w.present && w.present.toLowerCase() === clean) ||
                                                                (w.preteritum && w.preteritum.toLowerCase() === clean) ||
                                                                (w.supinium && w.supinium.toLowerCase() === clean)
                                                            );

                                                            return (
                                                                <span
                                                                    key={tIdx}
                                                                    onClick={() => handleWordClick(token, sentence)}
                                                                    className={`cursor-pointer rounded px-0.5 transition-all select-text hover:bg-primary/20 hover:text-primary ${
                                                                        isKnownInDeck
                                                                            ? 'underline decoration-emerald-500/70 decoration-2 underline-offset-4 text-emerald-300 font-medium'
                                                                            : ''
                                                                    }`}
                                                                    title={isKnownInDeck ? "In your vocabulary deck! Tap to view definition" : "Tap to translate"}
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
                                <div className="flex items-center justify-between pt-8 mt-8 border-t border-white/10 gap-3">
                                    {prevChapter ? (
                                        <button
                                            onClick={() => onNavigate('reading-lab', { bookId: book.id, chapterId: prevChapter.id })}
                                            className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-black/10 hover:bg-black/20 font-bold text-xs transition-all"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                                            </svg>
                                            <span>Ch {prevChapter.chapterNumber}</span>
                                        </button>
                                    ) : <div />}

                                    {nextChapter ? (
                                        <button
                                            onClick={() => onNavigate('reading-lab', { bookId: book.id, chapterId: nextChapter.id })}
                                            className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-primary hover:bg-primary-focus text-white font-bold text-xs shadow-xl shadow-primary/30 transition-all"
                                        >
                                            <span>Next: Ch {nextChapter.chapterNumber}</span>
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                                            </svg>
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => onNavigate('reading-library')}
                                            className="px-4 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xl shadow-emerald-600/30 transition-all"
                                        >
                                            ✓ Finish Book
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* ── WINDOW 2: Matching Non-AI Translation (Bottom on mobile, Right on PC) ── */}
                {isSplitView && (
                    <div className="h-1/2 md:h-full md:w-1/2 flex flex-col min-h-0 overflow-hidden relative bg-black/10">
                        <div className="px-4 py-1.5 bg-black/30 text-[10px] uppercase font-bold tracking-wider text-amber-400/90 flex justify-between items-center border-b border-white/5 shrink-0">
                            <span className="flex items-center gap-1.5 italic">
                                <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                                Translation (Non-AI Mode)
                            </span>
                            {isTranslatingChapter ? (
                                <span className="text-primary font-bold text-[10px] flex items-center gap-1.5">
                                    <div className="animate-spin rounded-full h-3 w-3 border-2 border-primary/30 border-t-primary" />
                                    Translating {translationProgress.done}/{translationProgress.total}...
                                </span>
                            ) : (
                                <span className="text-gray-400 text-[10px] lowercase italic">unlimited free mode</span>
                            )}
                        </div>

                        <div
                            ref={translationContainerRef}
                            onScroll={handleTranslationScroll}
                            className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-10 pb-40 relative"
                        >
                            <div className="max-w-3xl mx-auto">
                                {/* Chapter Header in Translation */}
                                <div className="text-center mb-6 pb-4 border-b border-white/5 opacity-80">
                                    <span className="text-[10px] uppercase font-bold tracking-widest text-amber-400/80 block mb-1">
                                        Matching Translation
                                    </span>
                                    <h2 className="text-lg sm:text-2xl font-black mb-1 italic">
                                        {currentTitle}
                                    </h2>
                                    <span className="text-[10px] text-gray-500 font-medium italic">
                                        Non-AI translation generated for parallel reading
                                    </span>
                                </div>

                                {/* Translated Paragraphs (Rendered in italics per requirement) */}
                                <div className={`space-y-6 ${FONT_CLASSES[fontSize]} ${themeStyles.text} font-serif tracking-wide italic select-text`}>
                                    {paragraphs.map((_, pIdx) => {
                                        const translatedText = translatedParagraphs[pIdx];
                                        const isHovered = hoveredParaIdx === pIdx;

                                        return (
                                            <p 
                                                key={pIdx}
                                                onMouseEnter={() => setHoveredParaIdx(pIdx)}
                                                onMouseLeave={() => setHoveredParaIdx(null)}
                                                className={`leading-relaxed transition-colors rounded-xl p-1.5 -mx-1.5 ${
                                                    isHovered ? 'bg-amber-500/10' : ''
                                                }`}
                                            >
                                                {translatedText ? (
                                                    <span>{translatedText}</span>
                                                ) : (
                                                    <span className="opacity-40 text-xs sm:text-sm flex items-center gap-2">
                                                        <div className="animate-pulse w-2.5 h-2.5 rounded-full bg-amber-400/50" />
                                                        Translating paragraph {pIdx + 1}...
                                                    </span>
                                                )}
                                            </p>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Chapter Table of Contents Drawer */}
            {showChapterDrawer && book && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex justify-end animate-fade-in" onClick={() => setShowChapterDrawer(false)}>
                    <div className="w-80 max-w-[85vw] h-full bg-base-100 p-5 border-l border-white/10 shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-5 pb-3 border-b border-base-200">
                            <div>
                                <span className="text-[10px] uppercase font-bold tracking-wider text-primary">{book.title}</span>
                                <h3 className="text-base font-bold text-white">Table of Contents</h3>
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
                                        className={`w-full text-left p-3 rounded-2xl transition-all flex items-center justify-between text-xs sm:text-sm ${
                                            isCurrent
                                                ? 'bg-primary text-white font-bold shadow-md'
                                                : 'hover:bg-white/5 text-gray-300'
                                        }`}
                                    >
                                        <span className="truncate">{ch.title}</span>
                                        <span className="text-[10px] opacity-60 ml-2">Ch {ch.chapterNumber}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* ── TRANSLATION POPUP CARD / BOTTOM SHEET (Pixel 9 Pro XL & Mobile Optimized) ── */}
            {analyzedData && (
                <>
                    {/* Backdrop for mobile */}
                    <div 
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 animate-fade-in"
                        onClick={() => setAnalyzedData(null)}
                    />

                    <div 
                        className="fixed bottom-0 sm:bottom-4 left-1/2 -translate-x-1/2 z-50 w-full sm:w-[96%] max-w-lg bg-base-100 rounded-t-3xl sm:rounded-3xl border border-white/15 shadow-[0_20px_70px_rgba(0,0,0,0.6)] p-4 sm:p-5 pb-6 animate-slide-in-up flex flex-col max-h-[82dvh] overflow-hidden"
                    >
                        {/* Drag bar for mobile visual feel */}
                        <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mb-3 shrink-0 sm:hidden" />

                        {/* Top: Word, badges & Close */}
                        <div className="flex justify-between items-start pb-2 border-b border-white/10 shrink-0">
                            <div className="min-w-0 pr-2">
                                <div className="flex flex-wrap items-center gap-2">
                                    <h3 className="text-xl sm:text-2xl font-black text-primary truncate">
                                        {analyzedData.targetWord}
                                    </h3>

                                    {/* Library Badge */}
                                    {analyzedData.isLibrary && (
                                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                            ✓ In Library
                                        </span>
                                    )}

                                    {/* AI vs Non-AI badge */}
                                    {analyzedData.isAi ? (
                                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                                            ✨ AI Context
                                        </span>
                                    ) : !analyzedData.isLibrary ? (
                                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 italic">
                                            ⚡ Dictionary
                                        </span>
                                    ) : null}

                                    {/* Old Swedish Badge */}
                                    {analyzedData.isArchaic && (
                                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                            📜 Old Swedish
                                        </span>
                                    )}
                                </div>

                                {analyzedData.baseForm && analyzedData.baseForm.toLowerCase() !== analyzedData.targetWord.toLowerCase() && (
                                    <div className="text-xs text-gray-400 mt-0.5">
                                        Base form: <span className="text-white font-bold">{analyzedData.baseForm}</span>
                                        {analyzedData.wordType && <span className="ml-2 opacity-60">• {analyzedData.wordType}</span>}
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                                <button
                                    onClick={() => handleSpeak(analyzedData.targetWord)}
                                    className="p-2 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary transition-colors"
                                    title="Listen to Swedish pronunciation"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                                    </svg>
                                </button>
                                <button
                                    onClick={() => setAnalyzedData(null)}
                                    className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10"
                                >
                                    ✕
                                </button>
                            </div>
                        </div>

                        {/* Scrollable Center Details */}
                        <div className="flex-1 overflow-y-auto py-3 space-y-2.5 pr-1">
                            {/* Meaning (Italicized if not from verified storage or AI!) */}
                            <div className="bg-base-200/50 p-3 rounded-2xl border border-white/5">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-[10px] uppercase font-bold text-gray-400">
                                        {analyzedData.isLibrary ? 'Your Stored Translation' : 'Translation'}
                                    </span>
                                    {!analyzedData.isAi && !analyzedData.isLibrary && (
                                        <span className="text-[10px] text-amber-400 font-semibold italic">
                                            (Non-AI translation - may have errors)
                                        </span>
                                    )}
                                </div>

                                <div className={`text-base font-bold text-white ${!analyzedData.isAi && !analyzedData.isLibrary ? 'italic text-amber-100' : ''}`}>
                                    {analyzedData.contextMeaning || analyzedData.literalMeaning || 'No translation available'}
                                </div>

                                {analyzedData.literalMeaning && analyzedData.literalMeaning !== analyzedData.contextMeaning && (
                                    <div className="pt-1.5 mt-1.5 border-t border-white/5 text-xs text-gray-300">
                                        <span className="text-[10px] uppercase font-bold text-gray-400 mr-1.5">Literal:</span>
                                        {analyzedData.literalMeaning}
                                    </div>
                                )}

                                {analyzedData.dependencies && analyzedData.dependencies.length > 0 && (
                                    <div className="pt-1.5 mt-1.5 border-t border-white/5 text-xs text-amber-300 flex items-center gap-1.5">
                                        <span>🔗 Phrasal particle:</span>
                                        <span className="font-bold underline">{analyzedData.dependencies.join(', ')}</span>
                                    </div>
                                )}
                            </div>

                            {/* Old / Archaic Swedish Warning Card */}
                            {analyzedData.isArchaic && (
                                <div className="p-2.5 rounded-2xl bg-purple-500/10 border border-purple-500/25 text-xs text-purple-200 space-y-1">
                                    <div className="flex items-center gap-1.5 font-bold text-purple-300">
                                        <span>📜 Historical Swedish Context:</span>
                                    </div>
                                    {analyzedData.archaicNote && (
                                        <p className="leading-relaxed text-[11px] text-purple-200/90">
                                            {analyzedData.archaicNote}
                                        </p>
                                    )}
                                    {analyzedData.modernEquivalent && (
                                        <p className="text-[11px] font-semibold text-purple-100">
                                            Contemporary equivalent: <span className="underline font-bold text-white">{analyzedData.modernEquivalent}</span>
                                        </p>
                                    )}
                                </div>
                            )}

                            {/* Grammar / Usage Notes */}
                            {analyzedData.grammarNotes && !analyzedData.isArchaic && (
                                <div className="text-xs text-gray-400 bg-white/5 p-2 rounded-xl border border-white/5 italic">
                                    📝 {analyzedData.grammarNotes}
                                </div>
                            )}

                            {/* Sentence Context Preview */}
                            {analyzedData.sentenceSwedish && (
                                <div className="text-xs text-gray-400 bg-white/5 p-2.5 rounded-2xl border border-white/5 flex justify-between items-center gap-2">
                                    <div className="min-w-0">
                                        <span className="text-[9px] uppercase font-bold text-gray-400 block mb-0.5">Example Context</span>
                                        <p className="italic text-gray-200 truncate">"{analyzedData.sentenceSwedish}"</p>
                                        {analyzedData.sentenceTranslation && (
                                            <p className="text-gray-400 truncate mt-0.5">{analyzedData.sentenceTranslation}</p>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => handleSpeak(analyzedData.sentenceSwedish)}
                                        className="p-1.5 rounded-lg hover:bg-white/10 text-gray-300 shrink-0"
                                        title="Listen to sentence"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072M12 5v14l-5-5H4V10h3l5-5z" />
                                        </svg>
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Bottom Actions (Save / SRS / Upgrade with AI) */}
                        <div className="pt-2.5 border-t border-white/10 shrink-0 flex flex-col gap-2">
                            {/* Choose form to save */}
                            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                                <div className="flex items-center gap-1.5">
                                    <span className="text-gray-400 text-[11px]">Save as:</span>
                                    {analyzedData.isArchaic && analyzedData.modernEquivalent && (
                                        <button
                                            onClick={() => setSaveWordChoice('modern')}
                                            className={`px-2 py-0.5 rounded-lg text-xs font-bold transition-colors ${saveWordChoice === 'modern' ? 'bg-purple-600 text-white' : 'bg-white/5 text-gray-300'}`}
                                        >
                                            {analyzedData.modernEquivalent} (Modern)
                                        </button>
                                    )}
                                    {analyzedData.baseForm && analyzedData.baseForm.toLowerCase() !== analyzedData.targetWord.toLowerCase() && (
                                        <button
                                            onClick={() => setSaveWordChoice('base')}
                                            className={`px-2 py-0.5 rounded-lg text-xs font-bold transition-colors ${saveWordChoice === 'base' ? 'bg-primary text-white' : 'bg-white/5 text-gray-300'}`}
                                        >
                                            {analyzedData.baseForm} (Base)
                                        </button>
                                    )}
                                    <button
                                        onClick={() => setSaveWordChoice('exact')}
                                        className={`px-2 py-0.5 rounded-lg text-xs font-bold transition-colors ${saveWordChoice === 'exact' ? 'bg-primary text-white' : 'bg-white/5 text-gray-300'}`}
                                    >
                                        {analyzedData.targetWord}
                                    </button>
                                </div>

                                <label className="flex items-center gap-1.5 text-xs text-gray-300 cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        checked={addToSrs}
                                        onChange={(e) => setAddToSrs(e.target.checked)}
                                        className="rounded border-white/20 text-primary focus:ring-0 w-3.5 h-3.5"
                                    />
                                    <span>Add to SRS</span>
                                </label>
                            </div>

                            <div className="flex gap-2">
                                {/* Upgrade / Re-analyze with AI button */}
                                {(!analyzedData.isAi || analyzedData.isLibrary) && (
                                    <button
                                        onClick={() => {
                                            setPendingWord(analyzedData.targetWord);
                                            setPendingSentence(analyzedData.sentenceSwedish || pendingSentence);
                                            setAnalyzedData(null);
                                            setIsConfirmModalOpen(true);
                                        }}
                                        className="py-2.5 px-3 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs transition-colors flex items-center justify-center gap-1 border border-white/10 shrink-0"
                                        title="Analyze full context with Gemini AI"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                                        </svg>
                                        <span>AI Context</span>
                                    </button>
                                )}

                                <button
                                    onClick={handleSaveToDeck}
                                    className="flex-1 py-2.5 px-4 rounded-2xl bg-gradient-to-r from-primary to-indigo-600 hover:opacity-90 text-white font-bold text-xs sm:text-sm shadow-lg shadow-primary/30 flex items-center justify-center gap-1.5 transition-all"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                                    </svg>
                                    <span>{analyzedData.isLibrary ? 'Update in Flashcards' : 'Save to Flashcards'}</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* AI / Non-AI Confirmation Modal */}
            <AiAnalysisConfirmModal
                isOpen={isConfirmModalOpen}
                onClose={() => setIsConfirmModalOpen(false)}
                targetWord={pendingWord}
                fullSentence={pendingSentence}
                onConfirmAi={handleConfirmAi}
                onConfirmNonAi={handleConfirmNonAi}
                isLoading={isAnalyzing}
                loadingMode={loadingMode}
            />

            {/* Resume Reading Progress Modal */}
            <ResumeReadingModal
                isOpen={isResumeModalOpen}
                chapterTitle={currentTitle}
                progressPercentage={chapter?.scrollProgress || 0}
                onResume={handleResume}
                onStartOver={handleStartOver}
            />
        </div>
    );
};
