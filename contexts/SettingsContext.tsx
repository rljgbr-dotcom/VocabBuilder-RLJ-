
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
    disableAnimations: boolean;
    setDisableAnimations: (disable: boolean) => void;
    autoMatchGame: boolean;
    setAutoMatchGame: (auto: boolean) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [currentSourceLanguage, setCurrentSourceLanguage] = useLocalStorage<string>('vocabuilder_language', 'en');
    const [theme, setTheme] = useLocalStorage<string>('vocabuilder_theme', 'dark-default');
    const [disableAnimations, setDisableAnimations] = useLocalStorage<boolean>('vocabuilder_disable_animations', false);
    const [autoMatchGame, setAutoMatchGame] = useLocalStorage<boolean>('vocabuilder_auto_match_game', true);

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        if (theme.startsWith('dark')) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [theme]);

    useEffect(() => {
        if (disableAnimations) {
            document.documentElement.classList.add('no-animations');
        } else {
            document.documentElement.classList.remove('no-animations');
        }
    }, [disableAnimations]);

    const currentLanguageInfo = useMemo(() => LANGUAGES[currentSourceLanguage] || LANGUAGES['en'], [currentSourceLanguage]);

    const value = {
        currentSourceLanguage,
        setCurrentSourceLanguage,
        currentLanguageInfo,
        theme,
        setTheme,
        disableAnimations,
        setDisableAnimations,
        autoMatchGame,
        setAutoMatchGame,
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