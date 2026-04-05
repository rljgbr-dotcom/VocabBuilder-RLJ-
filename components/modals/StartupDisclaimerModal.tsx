import React from 'react';
import { useModal } from '../../contexts/ModalContext';
import { useTranslation } from '../../hooks/useTranslation';

interface StartupDisclaimerModalProps {
    onConfirm: () => void;
}

const StartupDisclaimerModal: React.FC<StartupDisclaimerModalProps> = ({ onConfirm }) => {
    const { modalState, hideModal } = useModal();
    const { t } = useTranslation();

    if (modalState.type !== 'startupDisclaimer') {
        return null;
    }
    
    const handleConfirm = () => {
        onConfirm();
        hideModal();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 z-[59] flex items-center justify-center">
            <div className="modal bg-base-200 p-6 rounded-lg shadow-xl z-[60] w-11/12 max-w-md text-sm">
                <h3 className="text-lg font-bold mb-4">{t('modal.startupDisclaimer.title')}</h3>
                <div className="space-y-3 text-base-content">
                    <p>{t('modal.startupDisclaimer.p1')}</p>
                    <p>{t('modal.startupDisclaimer.p2')}</p>
                </div>
                <div className="flex justify-end mt-5">
                     <button onClick={handleConfirm} className="px-4 py-2 bg-primary text-primary-content rounded-md">{t('action.confirm')}</button>
                </div>
            </div>
        </div>
    );
};

export default StartupDisclaimerModal;