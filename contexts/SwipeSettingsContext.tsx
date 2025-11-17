
import React, { createContext, useContext, ReactNode } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { SwipeDirection, SwipeAction, SwipeSettings } from '../types';

const defaultSwipeSettings: SwipeSettings = {
    up: 'flip',
    down: 'readAloud',
    left: 'sendToBack',
    right: 'move-1'
};

interface SwipeSettingsContextType {
    swipeSettings: SwipeSettings;
    setSwipeSetting: (direction: SwipeDirection, action: SwipeAction) => void;
}

const SwipeSettingsContext = createContext<SwipeSettingsContextType | undefined>(undefined);

export const SwipeSettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [swipeSettings, setSwipeSettings] = useLocalStorage<SwipeSettings>('vocabuilder_swipe_settings', defaultSwipeSettings);

    const setSwipeSetting = (direction: SwipeDirection, action: SwipeAction) => {
        setSwipeSettings(prev => ({ ...prev, [direction]: action }));
    };

    const value = { swipeSettings, setSwipeSetting };

    return (
        <SwipeSettingsContext.Provider value={value}>
            {children}
        </SwipeSettingsContext.Provider>
    );
};

export const useSwipeSettings = (): SwipeSettingsContextType => {
    const context = useContext(SwipeSettingsContext);
    if (context === undefined) {
        throw new Error('useSwipeSettings must be used within a SwipeSettingsProvider');
    }
    return context;
};
