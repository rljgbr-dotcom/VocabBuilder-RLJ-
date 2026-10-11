import React, { useState, useRef } from 'react';
import { extractTextFromFile } from '../../services/geminiService';
import { useSettings } from '../../contexts/SettingsContext';

interface PassageInputModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (text: string, sourceFileId?: string) => void;
}

export const PassageInputModal: React.FC<PassageInputModalProps> = ({ isOpen, onClose, onConfirm }) => {
    const { geminiApiKey } = useSettings();
    const [text, setText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [sourceFileId, setSourceFileId] = useState<string | undefined>();
    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!isOpen) return null;

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!geminiApiKey) {
            setError("Google Gemini API Key is missing. Please add it in Settings.");
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            // Read file to Base64
            const reader = new FileReader();
            reader.onloadend = async () => {
                try {
                    const base64DataRaw = reader.result as string;
                    // Extract just the base64 string without the data URI prefix
                    const base64Data = base64DataRaw.split(',')[1];
                    
                    const extractedText = await extractTextFromFile(base64Data, file.type, geminiApiKey);
                    setText(extractedText);
                    
                    // We generate a temp ID for the file, we can save it to IndexedDB later
                    // Or we can save it to IndexedDB right now. To keep it clean, the parent handles saving it.
                    // Wait, the parent needs the raw data. Actually, let's just pass the text to the parent.
                    // The requirement says "store original uploaded image".
                    // Let's use indexedDB directly here to save the source file.
                    const { saveSourceFile } = await import('../../utils/indexedDB');
                    const newSourceFileId = `source_${Date.now()}`;
                    await saveSourceFile(newSourceFileId, base64DataRaw);
                    setSourceFileId(newSourceFileId);

                } catch (err) {
                    setError("Failed to extract text from file.");
                    console.error(err);
                } finally {
                    setIsLoading(false);
                }
            };
            reader.onerror = () => {
                setError("Failed to read file.");
                setIsLoading(false);
            };
            
            // Read as data URL for base64
            reader.readAsDataURL(file);
        } catch (err) {
            setError("Failed to process file.");
            setIsLoading(false);
        }
    };

    const handleConfirm = () => {
        if (!text.trim()) {
            setError("Please enter some text.");
            return;
        }
        onConfirm(text.trim(), sourceFileId);
        // Reset state
        setText('');
        setSourceFileId(undefined);
        setError(null);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-base-100 rounded-xl max-w-2xl w-full p-6 shadow-2xl flex flex-col max-h-[90vh]">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-primary">Add Reading Passage</h2>
                    <button onClick={onClose} className="text-base-content hover:text-primary transition-colors">
                        ✕
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto pr-2 flex flex-col gap-4">
                    <p className="text-sm text-base-content/70">
                        Paste text directly below, or upload an image/PDF and we will extract the Swedish text for you.
                    </p>

                    <div className="flex gap-2">
                        <button 
                            className="bg-secondary hover:bg-secondary-focus text-secondary-content px-4 py-2 rounded-lg font-medium transition-colors"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isLoading}
                        >
                            Upload Image/PDF
                        </button>
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            className="hidden" 
                            accept="image/*,application/pdf"
                            onChange={handleFileUpload}
                        />
                    </div>

                    {error && (
                        <div className="bg-red-500/20 text-red-500 p-3 rounded-lg text-sm">
                            {error}
                        </div>
                    )}

                    {isLoading ? (
                        <div className="flex-1 flex flex-col items-center justify-center min-h-[200px]">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
                            <p className="text-base-content">Extracting text using AI...</p>
                        </div>
                    ) : (
                        <textarea
                            className="w-full flex-1 min-h-[200px] p-4 bg-base-200 text-base-content border border-base-300 rounded-lg focus:outline-none focus:border-primary resize-none"
                            placeholder="Klistra in din text här..."
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                        />
                    )}
                </div>

                <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-base-300">
                    <button 
                        onClick={onClose}
                        className="px-6 py-2 rounded-lg font-medium text-base-content hover:bg-base-200 transition-colors"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={handleConfirm}
                        className="px-6 py-2 bg-primary hover:bg-primary-focus text-primary-content rounded-lg font-medium transition-colors disabled:opacity-50"
                        disabled={isLoading || !text.trim()}
                    >
                        Confirm & Process
                    </button>
                </div>
            </div>
        </div>
    );
};
