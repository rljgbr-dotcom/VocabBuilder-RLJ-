
import React from 'react';
import { useModal } from '../../contexts/ModalContext';

interface StartupDisclaimerModalProps {
    onConfirm: () => void;
}

const StartupDisclaimerModal: React.FC<StartupDisclaimerModalProps> = ({ onConfirm }) => {
    const { modalState, hideModal } = useModal();

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
                <h3 className="text-lg font-bold mb-4">Vocab Builder - Under Development</h3>
                <div className="space-y-3 text-base-content">
                    <p>This application is currently under development. Unauthorized copying, distribution, or modification is strictly prohibited.</p>
                    <p>By clicking "Confirm," you acknowledge and agree to these terms.</p>
                </div>
                <div className="flex justify-end mt-5">
                     <button onClick={handleConfirm} className="px-4 py-2 bg-primary text-primary-content rounded-md">Confirm</button>
                </div>
            </div>
        </div>
    );
};

export default StartupDisclaimerModal;
