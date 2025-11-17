
import React, { createContext, useContext, useState, useMemo, ReactNode } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { Language } from '../types';
import { LANGUAGES } from '../constants';

interface SettingsContextType {
    currentSourceLanguage: string;
    setCurrentSourceLanguage: (lang: string) => void;
    currentLanguageInfo: Language;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [currentSourceLanguage, setCurrentSourceLanguage] = useLocalStorage<string>('vocabuilder_language', 'en');

    const currentLanguageInfo = useMemo(() => LANGUAGES[currentSourceLanguage] || LANGUAGES['en'], [currentSourceLanguage]);

    const value = {
        currentSourceLanguage,
        setCurrentSourceLanguage,
        currentLanguageInfo,
    };

    return (
        <SettingsContext.Provider value={value}>
            {children}
        </SettingsContext.Provider>
    );
};

export const useSettings = (): SettingsContextType => {
    const context = useContext(SettingsContext);
    if (context === undefined) {
        throw new Error('useSettings must be used within a SettingsProvider');
    }
    return context;
};
