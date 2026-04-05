import React from 'react';
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

    if (modalState.type !== 'flashcardFilter') return null;

    const { difficultyFilters, onToggleFilter, onShowToast } = modalState.props;

    const handleToggle = (diff: Difficulty) => {
        if (difficultyFilters.length === 1 && difficultyFilters.includes(diff)) {
            onShowToast(t('game.flashcards.toast.filterError'));
            return;
        }
        onToggleFilter(diff);
    };

    return (
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-base-200 p-6 rounded-lg shadow-xl z-50 w-11/12 max-w-xs">
            <h3 className="text-lg font-bold mb-4">{t('game.flashcards.filter')}</h3>
            <div className="space-y-2">
                {difficultyLevels.map(diff => (
                    <button
                        key={diff}
                        onClick={() => handleToggle(diff)}
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
            <div className="flex justify-end mt-5">
                <button onClick={hideModal} className="px-4 py-2 bg-primary text-primary-content rounded-md hover:bg-primary-focus text-sm">
                    {t('action.done')}
                </button>
            </div>
        </div>
    );
};

export default FlashcardFilterModal;
