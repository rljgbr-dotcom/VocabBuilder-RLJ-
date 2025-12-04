
import React, { createContext, useContext, useMemo, ReactNode, useEffect } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { Language } from '../types';
import { LANGUAGES } from '../constants';

interface SettingsContextType {
    currentSourceLanguage: string;
    setCurrentSourceLanguage: (lang: string) => void;
    currentLanguageInfo: Language;
    theme: string;
    setTheme: (theme: string) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [currentSourceLanguage, setCurrentSourceLanguage] = useLocalStorage<string>('vocabuilder_language', 'en');
    const [theme, setTheme] = useLocalStorage<string>('vocabuilder_theme', 'dark-default');

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        if (theme.startsWith('dark')) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [theme]);

    const currentLanguageInfo = useMemo(() => LANGUAGES[currentSourceLanguage] || LANGUAGES['en'], [currentSourceLanguage]);

    const value = {
        currentSourceLanguage,
        setCurrentSourceLanguage,
        currentLanguageInfo,
        theme,
        setTheme,
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