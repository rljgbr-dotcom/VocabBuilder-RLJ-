
import React, { useState, useEffect } from 'react';
import { useModal } from '../../contexts/ModalContext';
import { useWords } from '../../contexts/WordsContext';
import { useSettings } from '../../contexts/SettingsContext';
import { Word } from '../../types';
import { suggestExample } from '../../services/geminiService';

const AddWordModal: React.FC = () => {
    const { modalState, hideModal } = useModal();
    const { addWord, updateWord } = useWords();
    const { currentLanguageInfo, currentSourceLanguage } = useSettings();
    const wordToEdit = modalState.props.wordToEdit as Word | undefined;

    const [formData, setFormData] = useState({
        source: '', subtopic1: '', subtopic2: '',
        swedish: '', swedishExample: '',
        sourceWord: '', sourceWordExample: ''
    });
    const [isSuggesting, setIsSuggesting] = useState<null | 'swedish' | 'source'>(null);

    useEffect(() => {
        if (modalState.type === 'addWord') {
            if (wordToEdit) {
                const translation = wordToEdit.translations[currentSourceLanguage] || { word: '', example: '' };
                setFormData({
                    source: wordToEdit.source,
                    subtopic1: wordToEdit.subtopic1,
                    subtopic2: wordToEdit.subtopic2,
                    swedish: wordToEdit.swedish,
                    swedishExample: wordToEdit.swedishExample || '',
                    sourceWord: translation.word,
                    sourceWordExample: translation.example
                });
            } else {
                setFormData({
                    source: '', subtopic1: '', subtopic2: '',
                    swedish: '', swedishExample: '',
                    sourceWord: '', sourceWordExample: ''
                });
            }
        }
    }, [modalState.type, wordToEdit, currentSourceLanguage]);

    if (modalState.type !== 'addWord') return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSuggestExample = async (type: 'swedish' | 'source') => {
        const word = type === 'swedish' ? formData.swedish : formData.sourceWord;
        const lang = type === 'swedish' ? 'Swedish' : currentLanguageInfo.englishName;
        if (!word) return;
        setIsSuggesting(type);
        const example = await suggestExample(word, lang);
        if (type === 'swedish') {
            setFormData(prev => ({ ...prev, swedishExample: example }));
        } else {
            setFormData(prev => ({ ...prev, sourceWordExample: example }));
        }
        setIsSuggesting(null);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const { source, subtopic1, subtopic2, swedish, swedishExample, sourceWord, sourceWordExample } = formData;
        
        if (!source || !subtopic1 || !subtopic2 || !swedish || !sourceWord) {
            alert('Please fill in all required fields.');
            return;
        }

        if (wordToEdit) {
            const updatedWord = { ...wordToEdit, source, subtopic1, subtopic2, swedish, swedishExample };
            updatedWord.translations[currentSourceLanguage] = { word: sourceWord, example: sourceWordExample };
            updateWord(updatedWord);
        } else {
            const newWordData = {
                source, subtopic1, subtopic2, swedish, swedishExample,
                translations: {
                    [currentSourceLanguage]: { word: sourceWord, example: sourceWordExample }
                }
            };
            addWord(newWordData);
        }
        hideModal();
    };
    
    const renderSuggestButton = (type: 'swedish' | 'source') => (
      <button type="button" onClick={() => handleSuggestExample(type)} disabled={isSuggesting !== null} className="text-xs text-blue-400 hover:underline disabled:opacity-50">
        {isSuggesting === type ? 'AI thinking...' : 'Suggest Example'}
      </button>
    );

    return (
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-base-200 p-6 rounded-lg shadow-xl z-50 w-11/12 max-w-lg">
            <h3 className="text-lg font-bold mb-4">{wordToEdit ? 'Edit Word' : 'Add New Word'}</h3>
            <form onSubmit={handleSubmit}>
                <div className="space-y-3">
                    <input type="text" name="source" value={formData.source} onChange={handleChange} placeholder="Source (e.g., Textbook Name)" required className="w-full p-2 bg-base-300 rounded-md" />
                    <input type="text" name="subtopic1" value={formData.subtopic1} onChange={handleChange} placeholder="Subtopic 1 (e.g., Chapter 5)" required className="w-full p-2 bg-base-300 rounded-md" />
                    <input type="text" name="subtopic2" value={formData.subtopic2} onChange={handleChange} placeholder="Subtopic 2 (e.g., Verbs)" required className="w-full p-2 bg-base-300 rounded-md" />
                    <hr className="border-base-300 my-3" />
                    <input type="text" name="swedish" value={formData.swedish} onChange={handleChange} placeholder="Swedish" required className="w-full p-2 bg-base-300 rounded-md" />
                    <div className="relative">
                      <input type="text" name="swedishExample" value={formData.swedishExample} onChange={handleChange} placeholder="Swedish Example" className="w-full p-2 bg-base-300 rounded-md" />
                      <div className="absolute right-2 top-1/2 -translate-y-1/2">{renderSuggestButton('swedish')}</div>
                    </div>
                    <hr className="border-base-300 my-3" />
                    <label className="text-sm font-medium">Translation: <span className="font-bold">{currentLanguageInfo.englishName}</span></label>
                    <input type="text" name="sourceWord" value={formData.sourceWord} onChange={handleChange} placeholder={`Word in ${currentLanguageInfo.englishName}`} required className="w-full p-2 bg-base-300 rounded-md" />
                     <div className="relative">
                        <input type="text" name="sourceWordExample" value={formData.sourceWordExample} onChange={handleChange} placeholder={`Example in ${currentLanguageInfo.englishName}`} className="w-full p-2 bg-base-300 rounded-md" />
                        <div className="absolute right-2 top-1/2 -translate-y-1/2">{renderSuggestButton('source')}</div>
                    </div>
                </div>
                <div className="flex justify-end gap-3 mt-5">
                    <button type="button" onClick={hideModal} className="px-4 py-2 bg-base-300 rounded-md hover:bg-opacity-80">Cancel</button>
                    <button type="submit" className="px-4 py-2 bg-accent text-accent-content rounded-md hover:bg-accent-focus">Save Word</button>
                </div>
            </form>
        </div>
    );
};

export default AddWordModal;