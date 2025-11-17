
import React from 'react';
import { useModal } from '../../contexts/ModalContext';

const ConfirmationModal: React.FC = () => {
    const { modalState, hideModal } = useModal();
    const { text, onConfirm } = modalState.props;

    if (modalState.type !== 'confirmation') {
        return null;
    }

    const handleConfirm = () => {
        if (onConfirm) {
            onConfirm();
        }
        hideModal();
    };

    return (
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-base-200 p-6 rounded-lg shadow-xl z-50 w-11/12 max-w-md">
            <h3 className="text-lg font-bold mb-4">{text || 'Are you sure?'}</h3>
            <div className="flex justify-end gap-3">
                <button onClick={hideModal} className="px-4 py-2 bg-base-300 rounded-md hover:bg-opacity-80">Cancel</button>
                <button onClick={handleConfirm} className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">Confirm</button>
            </div>
        </div>
    );
};

export default ConfirmationModal;
