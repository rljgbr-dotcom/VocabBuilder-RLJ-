
import React, { createContext, useContext, ReactNode } from 'react';
import { Word } from '../types';
import { useWords as useWordsHook } from '../hooks/useWords';

type UseWordsReturnType = ReturnType<typeof useWordsHook>;

const WordsContext = createContext<UseWordsReturnType | undefined>(undefined);

export const WordsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const wordsHookValue = useWordsHook();

    return (
        <WordsContext.Provider value={wordsHookValue}>
            {children}
        </WordsContext.Provider>
    );
};

export const useWords = (): UseWordsReturnType => {
    const context = useContext(WordsContext);
    if (context === undefined) {
        throw new Error('useWords must be used within a WordsProvider');
    }
    return context;
};