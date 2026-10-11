import React, { useState } from 'react';
import { Screen, ReadingPassage } from '../../types';
import { useReadingLibrary } from '../../hooks/useReadingLibrary';
import { useSettings } from '../../contexts/SettingsContext';
import { PassageInputModal } from '../modals/PassageInputModal';
import { processFullReadingPassage } from '../../services/geminiService';

interface ReadingLibraryScreenProps {
    onNavigate: (screen: Screen, params?: any) => void;
}

export const ReadingLibraryScreen: React.FC<ReadingLibraryScreenProps> = ({ onNavigate }) => {
    const { passages, savePassage, deletePassage } = useReadingLibrary();
    const { geminiApiKey } = useSettings();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [processError, setProcessError] = useState<string | null>(null);

    const handleConfirmText = async (text: string, sourceFileId?: string) => {
        if (!geminiApiKey) {
            setProcessError("Google Gemini API Key is missing. Please add it in Settings.");
            return;
        }

        setIsModalOpen(false);
        setIsProcessing(true);
        setProcessError(null);

        try {
            // Process the confirmed text with Gemini
            const processedData = await processFullReadingPassage(text, geminiApiKey);

            // Generate title from first sentence
            const firstSentence = processedData.sentences[0]?.swedish || text.substring(0, 50);
            const titleSnippet = firstSentence.length > 50 ? firstSentence.substring(0, 47) + '...' : firstSentence;

            const newPassage: ReadingPassage = {
                id: `passage_${Date.now()}`,
                title: titleSnippet,
                content: text,
                dateAdded: new Date().toISOString(),
                sourceFileId,
                processedData
            };

            savePassage(newPassage);
            
            // Navigate directly to the reading lab with the new passage
            onNavigate('reading-lab', { passageId: newPassage.id });
        } catch (error) {
            console.error(error);
            setProcessError("Failed to process the text with AI. Please check your API key and connection.");
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-base-100 relative">
            <div className="flex items-center p-4 bg-primary text-primary-content shadow-md">
                <button 
                    onClick={() => onNavigate('game-selection')} 
                    className="mr-4 p-2 rounded-full hover:bg-white/20 transition-colors"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                </button>
                <h1 className="text-xl font-bold">Reading Library</h1>
            </div>

            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
                {processError && (
                    <div className="bg-red-500/20 text-red-500 p-4 rounded-lg mb-4">
                        {processError}
                    </div>
                )}

                {passages.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center text-base-content/60">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                        <p className="text-lg mb-2">No passages saved yet.</p>
                        <p className="text-sm">Click the button below to add your first text.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {passages.map(passage => (
                            <div 
                                key={passage.id} 
                                className="bg-base-200 p-4 rounded-xl shadow-sm border border-base-300 flex flex-col hover:border-primary transition-colors cursor-pointer group"
                                onClick={() => onNavigate('reading-lab', { passageId: passage.id })}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="font-bold text-lg text-base-content line-clamp-2">{passage.title}</h3>
                                    <button 
                                        className="text-base-content/40 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                        onClick={(e) => { e.stopPropagation(); deletePassage(passage.id); }}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                        </svg>
                                    </button>
                                </div>
                                <div className="text-sm text-base-content/60 mb-4 flex-1 line-clamp-3">
                                    {passage.content}
                                </div>
                                <div className="flex justify-between items-center text-xs text-base-content/50">
                                    <span>{new Date(passage.dateAdded).toLocaleDateString()}</span>
                                    {passage.sourceFileId && (
                                        <span className="flex items-center gap-1 bg-base-300 px-2 py-1 rounded">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                            </svg>
                                            Has File
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="p-4 bg-base-100 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
                <button 
                    onClick={() => setIsModalOpen(true)}
                    className="w-full bg-primary hover:bg-primary-focus text-primary-content font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-lg"
                    disabled={isProcessing}
                >
                    {isProcessing ? (
                        <>
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                            Processing with AI...
                        </>
                    ) : (
                        <>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                            </svg>
                            Add New Passage
                        </>
                    )}
                </button>
            </div>

            <PassageInputModal 
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onConfirm={handleConfirmText}
            />
        </div>
    );
};
