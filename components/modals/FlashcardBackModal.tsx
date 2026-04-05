import React from 'react';
import { useModal } from '../../contexts/ModalContext';
import { useTranslation } from '../../hooks/useTranslation';

const FlashcardBackModal: React.FC = () => {
    const { modalState, hideModal } = useModal();
    const { t } = useTranslation();

    if (modalState.type !== 'flashcardBack') return null;

    const { onSendToBack, onReverseAndBack, onBackAndBlur, onReverseBackAndBlur } = modalState.props;

    const handleAction = (fn: () => void) => {
        fn();
        hideModal();
    };

    return (
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-base-200 p-6 rounded-lg shadow-xl z-50 w-11/12 max-w-xs">
            <h3 className="text-lg font-bold mb-4">{t('game.flashcards.back')}</h3>
            <div className="space-y-2">
                <button onClick={() => handleAction(onSendToBack)}
                    className="w-full text-left p-3 rounded-lg bg-base-300 hover:bg-primary hover:text-primary-content transition-colors text-sm font-medium">
                    {t('game.flashcards.sendToBack')}
                </button>
                <button onClick={() => handleAction(onReverseAndBack)}
                    className="w-full text-left p-3 rounded-lg bg-base-300 hover:bg-primary hover:text-primary-content transition-colors text-sm font-medium">
                    {t('game.flashcards.reverseAndBack')}
                </button>
                <button onClick={() => handleAction(onBackAndBlur)}
                    className="w-full text-left p-3 rounded-lg bg-base-300 hover:bg-primary hover:text-primary-content transition-colors text-sm font-medium">
                    {t('game.flashcards.backAndBlur')}
                </button>
                <button onClick={() => handleAction(onReverseBackAndBlur)}
                    className="w-full text-left p-3 rounded-lg bg-base-300 hover:bg-primary hover:text-primary-content transition-colors text-sm font-medium">
                    {t('game.flashcards.reverseBackAndBlur')}
                </button>
            </div>
            <div className="flex justify-end mt-5">
                <button onClick={hideModal} className="px-4 py-2 bg-base-300 rounded-md hover:bg-opacity-80 text-sm">
                    {t('action.cancel')}
                </button>
            </div>
        </div>
    );
};

export default FlashcardBackModal;
