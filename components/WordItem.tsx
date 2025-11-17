
import React from 'react';
import { Word } from '../types';
import { useSettings } from '../contexts/SettingsContext';
import { useWords } from '../contexts/WordsContext';
import { useModal } from '../contexts/ModalContext';
import { ttsService } from '../services/ttsService';

interface WordItemProps {
    word: Word;
}

const WordItem: React.FC<WordItemProps> = ({ word }) => {
    const { currentSourceLanguage } = useSettings();
    const { toggleWordActive, deleteWord } = useWords();
    const { showModal } = useModal();

    const translation = word.translations[currentSourceLanguage];
    const sourceWord = translation?.word || '---';
    const sourceWordExample = translation?.example || '';

    const handleDelete = () => {
        showModal('confirmation', {
            text: 'Delete this word?',
            onConfirm: () => deleteWord(word.id)
        });
    };
    
    const handleEdit = () => {
        showModal('addWord', { wordToEdit: word });
    };

    return (
        <div className="flex items-center justify-between p-1.5 border-b border-base-300 last:border-b-0">
            <div className="flex-1">
                <p className="font-medium">{word.swedish}</p>
                <p className="text-sm text-gray-400">{sourceWord}</p>
                {word.swedishExample && <p className="text-xs italic text-gray-500 mt-1 pl-2 border-l-2 border-base-300">{word.swedishExample}</p>}
                {sourceWordExample && <p className="text-xs italic text-gray-500 mt-1 pl-2 border-l-2 border-base-300">{sourceWordExample}</p>}
            </div>
            <div className="flex items-center gap-1">
                <span className="text-xs font-bold text-primary mr-1">{word.backCount || 0}</span>
                <button onClick={() => ttsService.speak(word.swedish, 'sv-SE')} className="p-1.5 hover:bg-base-300 rounded-full" title="Pronounce Swedish">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.858 12h.001M10 12h.001M14 12h.001" /></svg>
                </button>
                <div className="relative inline-block w-10 mx-1 align-middle">
                    <input type="checkbox" onChange={() => toggleWordActive(word.id)} id={`toggle-${word.id}`} className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer" checked={word.active} />
                    <label htmlFor={`toggle-${word.id}`} className="toggle-label block overflow-hidden h-6 rounded-full bg-gray-500 cursor-pointer"></label>
                </div>
                <button onClick={handleEdit} className="p-1.5 hover:bg-base-300 rounded-full" title="Edit">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.536L16.732 3.732z" /></svg>
                </button>
                <button onClick={handleDelete} className="p-1.5 hover:bg-base-300 rounded-full text-red-500" title="Delete">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
            </div>
        </div>
    );
};

export default WordItem;
