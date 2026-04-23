
import React from 'react';
import { Word } from '../types';
import { useSettings } from '../contexts/SettingsContext';
import { useWords } from '../contexts/WordsContext';
import { useModal } from '../contexts/ModalContext';
import { useTranslation } from '../hooks/useTranslation';
import { ttsService } from '../services/ttsService';

interface WordItemProps {
    word: Word;
}

const WordItem: React.FC<WordItemProps> = ({ word }) => {
    const { currentSourceLanguage } = useSettings();
    const { toggleWordActive, toggleWordSrsActive, toggleWordFlag, deleteWord } = useWords();
    const { showModal } = useModal();
    const { t } = useTranslation();

    const translation = word.translations[currentSourceLanguage];
    const sourceWord = translation?.word || '---';
    const sourceWordExample = translation?.example || '';

    const handleDelete = () => {
        showModal('confirmation', {
            text: t('word.deleteConfirm'),
            onConfirm: () => deleteWord(word.id)
        });
    };
    
    const handleEdit = () => {
        showModal('addWord', { wordToEdit: word });
    };

    const difficultyColors: Record<string, string> = {
        unmarked: 'bg-gray-500',
        easy: 'bg-green-500',
        medium: 'bg-yellow-500',
        hard: 'bg-red-600',
    };

    return (
        <div className="flex items-center justify-between p-1.5 border-b border-base-300 last:border-b-0">
            <div className="flex items-center gap-3 flex-1 overflow-hidden">
                <div className={`w-2 h-2 rounded-full shrink-0 ${difficultyColors[word.difficulty || 'unmarked']}`} title={`Difficulty: ${word.difficulty || 'unmarked'}`}></div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium truncate">{word.swedish}</p>
                        {word.wordType && (
                            <span className="px-1.5 py-0.5 text-[10px] font-bold bg-primary/10 text-primary border border-primary/20 rounded uppercase tracking-wide shrink-0">
                                {word.wordType}
                            </span>
                        )}
                    </div>
                    <p className="text-sm text-gray-400 truncate">{sourceWord}</p>
                    {word.swedishExample && <p className="text-xs italic text-gray-500 mt-1 pl-2 border-l-2 border-base-300 line-clamp-2">{word.swedishExample}</p>}
                    {sourceWordExample && <p className="text-xs italic text-gray-500 mt-1 pl-2 border-l-2 border-base-300 line-clamp-2">{sourceWordExample}</p>}
                </div>
            </div>
            <div className="flex items-center gap-1">
                <span className="text-xs font-bold text-primary mr-1">{word.backCount || 0}</span>
                <button onClick={() => ttsService.speak(word.swedish, 'sv-SE')} className="p-1.5 hover:bg-base-300 rounded-full" title={t('word.pronounce')}>
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.858 12h.001M10 12h.001M14 12h.001" /></svg>
                </button>
                {/* Active toggle */}
                <div className="relative inline-block w-10 mx-1 align-middle" title={word.active ? t('word.active') : t('word.inactive')}>
                    <input type="checkbox" onChange={() => toggleWordActive(word.id)} id={`toggle-${word.id}`} className="toggle-checkbox absolute left-0 block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer" checked={word.active} />
                    <label htmlFor={`toggle-${word.id}`} className="toggle-label block overflow-hidden h-6 rounded-full bg-gray-500 cursor-pointer"></label>
                </div>

                {/* SRS toggle */}
                <div className="relative inline-block w-10 mx-1 align-middle" title={word.srs_active ? t('word.srsActive') : t('word.srsInactive')}>
                    <input
                        type="checkbox"
                        onChange={() => {
                            if (word.srs_active) {
                                showModal('confirmation', {
                                    text: 'Remove this word from the SRS group? Its SRS progress will be preserved but it will no longer appear in SRS sessions.',
                                    onConfirm: () => toggleWordSrsActive(word.id),
                                });
                            } else {
                                toggleWordSrsActive(word.id);
                            }
                        }}
                        id={`srs-toggle-${word.id}`}
                        className="srs-toggle-checkbox absolute left-0 block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer"
                        checked={!!word.srs_active}
                    />
                    <label htmlFor={`srs-toggle-${word.id}`} className="srs-toggle-label block overflow-hidden h-6 rounded-full bg-gray-500 cursor-pointer transition-colors duration-200"></label>
                </div>
                {/* Flag toggle */}
                <button 
                    onClick={() => toggleWordFlag(word.id)}
                    className={`p-1.5 rounded-full transition-colors ${word.flagged ? 'text-red-500 bg-red-500/10' : 'text-gray-400 hover:bg-base-300'}`}
                    title={word.flagged ? "Unflag" : "Flag"}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill={word.flagged ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
                    </svg>
                </button>
                <button onClick={handleEdit} className="p-1.5 hover:bg-base-300 rounded-full" title={t('word.edit')}>
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.536L16.732 3.732z" /></svg>
                </button>
                <button onClick={handleDelete} className="p-1.5 hover:bg-base-300 rounded-full text-red-500" title={t('word.delete')}>
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
            </div>
        </div>
    );
};

export default WordItem;