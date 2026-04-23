import React, { useState } from 'react';
import { useModal } from '../../contexts/ModalContext';
import { useTranslation } from '../../hooks/useTranslation';

type Difficulty = 'unmarked' | 'easy' | 'medium' | 'hard';

const difficultyColors: Record<Difficulty, string> = {
    unmarked: 'bg-gray-500',
    easy: 'bg-green-500',
    medium: 'bg-yellow-500',
    hard: 'bg-red-600',
};

const difficultyLevels: Difficulty[] = ['unmarked', 'easy', 'medium', 'hard'];

const FlashcardFilterModal: React.FC = () => {
    const { modalState, hideModal } = useModal();
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState<'difficulty' | 'wordType'>('difficulty');

    if (modalState.type !== 'flashcardFilter') return null;

    const { difficultyFilters, wordTypeFilters, availableWordTypes, onToggleDifficultyFilter, onToggleWordTypeFilter, onShowToast } = modalState.props;

    const handleDifficultyToggle = (diff: Difficulty) => {
        if (difficultyFilters.length === 1 && difficultyFilters.includes(diff)) {
            onShowToast(t('game.flashcards.toast.filterError'));
            return;
        }
        onToggleDifficultyFilter(diff);
    };
    
    const handleWordTypeToggle = (type: string) => {
        if (wordTypeFilters.length === 1 && wordTypeFilters.includes(type)) {
            onShowToast(t('game.flashcards.toast.filterError')); 
            return;
        }
        onToggleWordTypeFilter(type);
    };

    return (
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-base-200 p-6 rounded-lg shadow-xl z-50 w-11/12 max-w-sm max-h-[80vh] flex flex-col">
            <h3 className="text-lg font-bold mb-4">{t('game.flashcards.filter')}</h3>
            
            <div className="flex gap-2 mb-4 border-b border-base-300 pb-2">
                <button 
                    onClick={() => setActiveTab('difficulty')} 
                    className={`px-3 py-1 text-sm font-bold rounded-md transition-colors ${activeTab === 'difficulty' ? 'bg-primary text-primary-content' : 'hover:bg-base-300 text-gray-500'}`}
                >
                    Difficulty
                </button>
                <button 
                    onClick={() => setActiveTab('wordType')} 
                    className={`px-3 py-1 text-sm font-bold rounded-md transition-colors ${activeTab === 'wordType' ? 'bg-primary text-primary-content' : 'hover:bg-base-300 text-gray-500'}`}
                >
                    {t('game.flashcards.wordType')}
                </button>
            </div>

            <div className="overflow-y-auto flex-1 pr-2 custom-scrollbar">
                {activeTab === 'difficulty' && (
                    <div className="space-y-2">
                        {difficultyLevels.map(diff => (
                            <button
                                key={diff}
                                onClick={() => handleDifficultyToggle(diff)}
                                className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors text-sm font-medium ${
                                    difficultyFilters.includes(diff)
                                        ? 'bg-primary/30 hover:bg-primary/40'
                                        : 'bg-base-300 hover:bg-base-100'
                                }`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`h-4 w-4 rounded-full flex-shrink-0 ${difficultyColors[diff]}`} />
                                    <span className="capitalize">{t('game.difficulty.' + diff)}</span>
                                </div>
                                {difficultyFilters.includes(diff) && (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                )}
                            </button>
                        ))}
                    </div>
                )}

                {activeTab === 'wordType' && (
                    <div className="flex flex-wrap gap-2">
                        {(!availableWordTypes || availableWordTypes.length === 0) ? (
                            <p className="text-sm text-gray-500 w-full text-center py-4">No word types available.</p>
                        ) : (
                            availableWordTypes.map((type: string) => {
                                const isSelected = wordTypeFilters.includes(type);
                                const displayLabel = type === '' ? t('game.wordType.unknown') : type;
                                return (
                                    <button
                                        key={type}
                                        onClick={() => handleWordTypeToggle(type)}
                                        className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors border ${
                                            isSelected 
                                                ? 'bg-primary text-primary-content border-primary' 
                                                : 'bg-base-300 text-gray-400 border-base-300 hover:border-gray-500'
                                        }`}
                                    >
                                        {displayLabel}
                                    </button>
                                );
                            })
                        )}
                    </div>
                )}
            </div>

            <div className="flex justify-end mt-5 pt-4 border-t border-base-300">
                <button onClick={hideModal} className="px-4 py-2 bg-primary text-primary-content rounded-md hover:bg-primary-focus text-sm font-bold">
                    {t('action.done')}
                </button>
            </div>
        </div>
    );
};

export default FlashcardFilterModal;
