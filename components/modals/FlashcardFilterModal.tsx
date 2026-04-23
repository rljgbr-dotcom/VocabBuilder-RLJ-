import React, { useState, useEffect } from 'react';
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

    // Local state for immediate visual feedback — synced from props on open
    const [localDifficultyFilters, setLocalDifficultyFilters] = useState<Difficulty[]>([]);
    const [localWordTypeFilters, setLocalWordTypeFilters] = useState<string[]>([]);

    const isOpen = modalState.type === 'flashcardFilter';

    // Sync local state whenever the modal opens
    useEffect(() => {
        if (isOpen) {
            setLocalDifficultyFilters(modalState.props.difficultyFilters ?? []);
            setLocalWordTypeFilters(modalState.props.wordTypeFilters ?? []);
        }
    }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

    if (!isOpen) return null;

    const { availableWordTypes, onToggleDifficultyFilter, onToggleWordTypeFilter, onShowToast } = modalState.props;

    const handleDifficultyToggle = (diff: Difficulty) => {
        if (localDifficultyFilters.length === 1 && localDifficultyFilters.includes(diff)) {
            onShowToast(t('game.flashcards.toast.filterError'));
            return;
        }
        // Update locally for immediate feedback
        setLocalDifficultyFilters(prev =>
            prev.includes(diff) ? prev.filter(d => d !== diff) : [...prev, diff]
        );
        // Update parent game state
        onToggleDifficultyFilter(diff);
    };

    const handleWordTypeToggle = (type: string) => {
        if (localWordTypeFilters.length === 1 && localWordTypeFilters.includes(type)) {
            onShowToast(t('game.flashcards.toast.filterError'));
            return;
        }
        // Update locally for immediate feedback
        setLocalWordTypeFilters(prev =>
            prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
        );
        // Update parent game state
        onToggleWordTypeFilter(type);
    };

    const handleResetAll = () => {
        const allDifficulties: Difficulty[] = ['unmarked', 'easy', 'medium', 'hard'];
        const allTypes: string[] = availableWordTypes ?? [];

        // Reset local state
        setLocalDifficultyFilters(allDifficulties);
        setLocalWordTypeFilters(allTypes);

        // Reset parent state by toggling anything that's missing back on
        allDifficulties.forEach(d => {
            if (!modalState.props.difficultyFilters.includes(d)) onToggleDifficultyFilter(d);
        });
        // For difficulty: if any currently ON that shouldn't be... they should all be on, so ensure none are removed
        // Simplest: call parent reset handler if provided, otherwise reconstruct
        if (modalState.props.onResetAllFilters) {
            modalState.props.onResetAllFilters();
        }
    };

    return (
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-base-200 p-6 rounded-lg shadow-xl z-50 w-11/12 max-w-sm max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold">{t('game.flashcards.filter')}</h3>
                <button
                    onClick={handleResetAll}
                    className="px-2.5 py-1 text-xs font-bold bg-base-300 text-gray-400 rounded-md hover:bg-red-600/20 hover:text-red-400 transition-colors"
                    title="Reset all filters"
                >
                    Reset All
                </button>
            </div>

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

            <div className="overflow-y-auto flex-1 pr-1">
                {activeTab === 'difficulty' && (
                    <div className="space-y-2">
                        {difficultyLevels.map(diff => (
                            <button
                                key={diff}
                                onClick={() => handleDifficultyToggle(diff)}
                                className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors text-sm font-medium ${
                                    localDifficultyFilters.includes(diff)
                                        ? 'bg-primary/30 hover:bg-primary/40'
                                        : 'bg-base-300 hover:bg-base-100'
                                }`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`h-4 w-4 rounded-full flex-shrink-0 ${difficultyColors[diff]}`} />
                                    <span className="capitalize">{t('game.difficulty.' + diff)}</span>
                                </div>
                                {localDifficultyFilters.includes(diff) && (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                )}
                            </button>
                        ))}
                    </div>
                )}

                {activeTab === 'wordType' && (
                    <div className="flex flex-wrap gap-2 pt-1">
                        {(!availableWordTypes || availableWordTypes.length === 0) ? (
                            <p className="text-sm text-gray-500 w-full text-center py-4">No word types available.</p>
                        ) : (
                            availableWordTypes.map((type: string) => {
                                const isSelected = localWordTypeFilters.includes(type);
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
