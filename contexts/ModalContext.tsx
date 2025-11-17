
import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export type ModalType = 'confirmation' | 'info' | 'addWord' | 'flashcardHelp' | 'csvHelp' | 'readMe' | 'startupDisclaimer' | 'setStackSize' | 'swipeSettings';

interface ModalState {
    type: ModalType | null;
    props?: any;
}

interface ModalContextType {
    showModal: (type: ModalType, props?: any) => void;
    hideModal: () => void;
    modalState: ModalState;
    isModalOpen: boolean;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export const ModalProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [modalState, setModalState] = useState<ModalState>({ type: null, props: {} });

    const showModal = useCallback((type: ModalType, props: any = {}) => {
        setModalState({ type, props });
    }, []);

    const hideModal = useCallback(() => {
        setModalState({ type: null, props: {} });
    }, []);

    const isModalOpen = modalState.type !== null;
    
    const value = {
        showModal,
        hideModal,
        modalState,
        isModalOpen,
    };

    return (
        <ModalContext.Provider value={value}>
            {children}
        </ModalContext.Provider>
    );
};

export const useModal = (): ModalContextType => {
    const context = useContext(ModalContext);
    if (context === undefined) {
        throw new Error('useModal must be used within a ModalProvider');
    }
    return context;
};