
import React from 'react';
import { useModal } from '../../contexts/ModalContext';

interface HelpModalProps {
    modalId: string;
    title: string;
    content: string;
}

const HelpModal: React.FC<HelpModalProps> = ({ modalId, title, content }) => {
    const { modalState, hideModal } = useModal();
    
    if (modalState.type !== modalId) {
        return null;
    }

    return (
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-base-200 p-6 rounded-lg shadow-xl z-50 w-11/12 max-w-2xl text-sm">
            <h3 className="text-xl font-bold mb-4">{title}</h3>
            <div className="max-h-[60vh] overflow-y-auto pr-2 space-y-3 text-base-content" dangerouslySetInnerHTML={{ __html: content }}>
            </div>
            <div className="flex justify-end mt-5">
                 <button onClick={hideModal} className="px-4 py-2 bg-primary text-primary-content rounded-md">Got it!</button>
            </div>
        </div>
    );
};

export default HelpModal;