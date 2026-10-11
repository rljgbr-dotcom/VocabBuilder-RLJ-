import React, { useState, useEffect, useRef } from 'react';
import { Screen, ReadingPassage, ProcessedWord, ProcessedSentence } from '../../types';
import { useReadingLibrary } from '../../hooks/useReadingLibrary';
import { useWords } from '../../contexts/WordsContext';

interface ReadingLabScreenProps {
    onNavigate: (screen: Screen) => void;
    passageId: string;
}

export const ReadingLabScreen: React.FC<ReadingLabScreenProps> = ({ onNavigate, passageId }) => {
    const { passages } = useReadingLibrary();
    const { addWord } = useWords();
    const passage = passages.find(p => p.id === passageId);
    
    const [selectedText, setSelectedText] = useState('');
    const [tooltipData, setTooltipData] = useState<{
        type: 'word' | 'sentence' | 'raw';
        literal?: string;
        idiomatic?: string;
        dependencies?: string[];
        rect: DOMRect;
    } | null>(null);

    const [highlightedDependencies, setHighlightedDependencies] = useState<string[]>([]);

    const textContainerRef = useRef<HTMLDivElement>(null);
    const isDragging = useRef(false);
    const pendingSelection = useRef(false);

    const handleSelection = () => {
        const selection = window.getSelection();
        if (!selection || selection.isCollapsed || !textContainerRef.current?.contains(selection.anchorNode)) {
            setTooltipData(null);
            setHighlightedDependencies([]);
            return;
        }

            const text = selection.toString().trim();
        setSelectedText(text);

        if (!text) {
            setTooltipData(null);
            return;
        }

            // Try to match the selection to our processed data
            let foundData = null;
            let type: 'word' | 'sentence' | 'raw' = 'raw';
            let deps: string[] = [];

            // Clean up the text for comparison (remove punctuation at ends for word matching)
            const cleanText = text.replace(/^[.,!?";:()]+|[.,!?";:()]+$/g, '').toLowerCase();

            if (passage?.processedData) {
                // Check if it's a full sentence match (or close enough)
                const sentenceMatch = passage.processedData.sentences.find(
                    s => {
                        const cleanSentence = s.swedish.replace(/\s+/g, ' ').trim();
                        const cleanSelected = text.replace(/\s+/g, ' ').trim();
                        return cleanSentence.includes(cleanSelected) || cleanSelected.includes(cleanSentence);
                    }
                );
                
                if (sentenceMatch && text.split(/\s+/).length > 2) {
                    // Treat as sentence if it's more than 2 words
                    foundData = { literal: sentenceMatch.literal, idiomatic: sentenceMatch.idiomatic };
                    type = 'sentence';
                } else {
                    // Check if it's a word match
                    for (const s of passage.processedData.sentences) {
                        const wordMatch = s.words.find(w => {
                            const cleanW = w.swedish.replace(/^[.,!?";:()]+|[.,!?";:()]+$/g, '').toLowerCase();
                            return cleanW === cleanText || cleanW.includes(cleanText) || cleanText.includes(cleanW);
                        });
                        if (wordMatch) {
                            foundData = { literal: wordMatch.literal, idiomatic: wordMatch.idiomatic };
                            type = 'word';
                            deps = wordMatch.dependencies || [];
                            break;
                        }
                    }
                }
            }

        setHighlightedDependencies(deps);
        setTooltipData({
            type,
            literal: foundData?.literal,
            idiomatic: foundData?.idiomatic,
            dependencies: deps,
            rect: new DOMRect() // Not used anymore but kept for type compatibility
        });
    };

    useEffect(() => {
        const handleSelectionChange = () => {
            if (isDragging.current) {
                pendingSelection.current = true;
                return;
            }
            handleSelection();
        };

        const handlePointerUp = () => {
            if (isDragging.current) {
                isDragging.current = false;
                if (pendingSelection.current) {
                    handleSelection();
                    pendingSelection.current = false;
                }
            }
        };

        document.addEventListener('selectionchange', handleSelectionChange);
        document.addEventListener('pointerup', handlePointerUp);
        
        return () => {
            document.removeEventListener('selectionchange', handleSelectionChange);
            document.removeEventListener('pointerup', handlePointerUp);
        };
    }, [passage]);

    const handleSpeak = (text: string) => {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'sv-SE'; // Swedish
        window.speechSynthesis.speak(utterance);
    };

    const handleAddToDB = () => {
        if (!selectedText) return;
        
        const translation = tooltipData?.idiomatic || tooltipData?.literal || '';
        
        addWord({
            swedish: selectedText,
            swedishExample: '',
            translations: {
                en: { word: translation, example: '' }
            },
            subtopic1: 'Reading Lab',
            subtopic2: passage?.title || 'Imported Text',
            source: 'Reading Lab'
        });

        // Clear selection to hide tooltip
        window.getSelection()?.removeAllRanges();
        // Optional: show a small toast, but addWord might handle its own feedback or we just let it be silent success
    };

    if (!passage) {
        return (
            <div className="flex flex-col h-full bg-base-100 p-4">
                <button onClick={() => onNavigate('reading-library')}>Back</button>
                <p>Passage not found.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-base-200/30 relative">
            {/* Header */}
            <div className="flex items-center p-4 bg-base-100/80 backdrop-blur-md border-b border-base-200 shadow-sm sticky top-0 z-10">
                <button 
                    onClick={() => onNavigate('reading-library')} 
                    className="mr-4 p-2 rounded-full hover:bg-base-200 transition-colors"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-base-content" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                </button>
                <h1 className="text-xl font-bold truncate text-base-content">{passage.title}</h1>
            </div>

            {/* Content Area */}
            <div 
                className="flex-1 overflow-y-auto p-4 md:p-8 pb-40" 
                ref={textContainerRef}
                onPointerDown={() => isDragging.current = true}
            >
                <div className="max-w-3xl mx-auto bg-base-100 shadow-xl rounded-3xl p-8 md:p-14 border border-base-200/60">
                    <div className="space-y-6 text-xl md:text-2xl leading-[2.2] md:leading-[2.5] text-base-content/90 font-medium tracking-wide">
                    {passage.processedData ? (
                        // Render processed sentences
                        passage.processedData.sentences.map((sentence, sIdx) => (
                            <span key={sIdx} className="mr-2">
                                {sentence.words.map((word, wIdx) => {
                                    // Remove punctuation to check dependency match cleanly
                                    const cleanWord = word.swedish.replace(/^[.,!?";:()]+|[.,!?";:()]+$/g, '').toLowerCase();
                                    const isDependency = highlightedDependencies.some(d => d.toLowerCase() === cleanWord);
                                    return (
                                        <React.Fragment key={wIdx}>
                                            <span 
                                                className={`inline-block rounded transition-colors ${isDependency ? 'bg-primary/20 text-primary font-bold border-b-4 border-primary' : ''}`}
                                            >
                                                {word.swedish}
                                            </span>
                                            {' '}
                                        </React.Fragment>
                                    );
                                })}
                            </span>
                        ))
                    ) : (
                        // Fallback to raw text if no processed data
                        <p className="whitespace-pre-wrap">{passage.content}</p>
                    )}
                </div>
            </div>
        </div>

        {/* Floating Bottom Panel Tooltip */}
            {tooltipData && (
                <div 
                    className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-base-100 border border-base-300 shadow-[0_20px_50px_rgba(0,0,0,0.15)] rounded-2xl p-5 w-[90%] max-w-md animate-fade-in"
                >
                    <div className="flex justify-between items-start mb-3">
                        <div className="font-bold text-xl text-primary">{selectedText}</div>
                        <button 
                            onClick={() => {
                                window.getSelection()?.removeAllRanges();
                                setTooltipData(null);
                            }}
                            className="text-base-content/40 hover:text-base-content p-1"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                        </button>
                    </div>
                    
                    <div className="max-h-40 overflow-y-auto pr-2 mb-4 space-y-4">
                        {tooltipData.literal && (
                            <div>
                                <span className="text-xs font-bold uppercase tracking-wider text-base-content/50 block mb-1">Literal</span>
                                <span className="text-base-content/90 text-sm">{tooltipData.literal}</span>
                            </div>
                        )}
                        
                        {tooltipData.idiomatic && (
                            <div>
                                <span className="text-xs font-bold uppercase tracking-wider text-base-content/50 block mb-1">Idiomatic</span>
                                <span className="text-base-content/90 text-sm">{tooltipData.idiomatic}</span>
                            </div>
                        )}

                        {!tooltipData.literal && !tooltipData.idiomatic && (
                            <div className="text-sm text-base-content/70 italic">
                                No precise translation match found.
                            </div>
                        )}
                    </div>

                    <div className="flex gap-2 border-t border-base-300 pt-3">
                        <button 
                            onClick={() => handleSpeak(selectedText)}
                            className="flex-1 bg-secondary/10 hover:bg-secondary/20 text-secondary font-semibold py-2 rounded-lg flex items-center justify-center gap-1 transition-colors"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" clipRule="evenodd" />
                            </svg>
                            Listen
                        </button>
                        <button 
                            onClick={handleAddToDB}
                            className="flex-1 bg-primary hover:bg-primary-focus text-primary-content font-semibold py-2 rounded-lg flex items-center justify-center gap-1 transition-colors"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                            </svg>
                            Add to DB
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
