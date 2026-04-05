
import React from 'react';
import { useModal } from '../../contexts/ModalContext';

const InfoModal: React.FC = () => {
    const { modalState, hideModal } = useModal();
    const { title, content, actionLabel, onAction } = modalState.props || {};

    if (modalState.type !== 'info') {
        return null;
    }

    const handleAction = () => {
        if (onAction) {
            onAction();
        }
        hideModal();
    };

    return (
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-base-200 p-6 rounded-lg shadow-xl z-50 w-11/12 max-w-md">
            <h3 className="text-lg font-bold mb-4">{title || 'Information'}</h3>
            <div className="text-base-content mb-5 whitespace-pre-wrap">{content || ''}</div>
            <div className="flex justify-end gap-3">
                {actionLabel && onAction && (
                    <button onClick={handleAction} className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">{actionLabel}</button>
                )}
                <button onClick={hideModal} className="px-4 py-2 bg-primary text-primary-content rounded-md">Close</button>
            </div>
        </div>
    );
};

export default InfoModal;