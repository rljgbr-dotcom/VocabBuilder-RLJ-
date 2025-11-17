import React from 'react';
import { Screen } from '../../types';
import { useSettings } from '../../contexts/SettingsContext';

interface SettingsScreenProps {
    setScreen: (screen: Screen) => void;
}

const themes = [
    { id: 'dark-default', name: 'Default Dark', colors: ['#6366f1', '#a855f7', '#10b981', '#1f2937'] },
    { id: 'light-classic', name: 'Classic Light', colors: ['#3b82f6', '#8b5cf6', '#16a34a', '#f3f4f6'] },
    { id: 'dark-ocean', name: 'Ocean Dark', colors: ['#06b6d4', '#3b82f6', '#f59e0b', '#1e293b'] },
    { id: 'dark-sunset', name: 'Sunset Dark', colors: ['#f97316', '#ef4444', '#eab308', '#292524'] },
    { id: 'dark-forest', name: 'Forest Dark', colors: ['#16a34a', '#ca8a04', '#0ea5e9', '#2d3f3c'] },
    { id: 'dark-midnight', name: 'Midnight Dark', colors: ['#3b82f6', '#4f46e5', '#84cc16', '#0f172a'] },
    { id: 'dark-grape', name: 'Grape Dark', colors: ['#a855f7', '#ec4899', '#22d3ee', '#1f2937'] },
    { id: 'dark-crimson', name: 'Crimson Dark', colors: ['#dc2626', '#be123c', '#9ca3af', '#262626'] },
    { id: 'dark-cyber', name: 'Cyber Dark', colors: ['#22d3ee', '#a3e635', '#d946ef', '#1a1a1a'] },
    { id: 'light-solar', name: 'Solar Light', colors: ['#f59e0b', '#f97316', '#0ea5e9', '#f8fafc'] },
    { id: 'light-minty', name: 'Minty Light', colors: ['#10b981', '#0d9488', '#d946ef', '#f0fdf4'] },
    { id: 'light-sakura', name: 'Sakura Light', colors: ['#ec4899', '#f43f5e', '#22d3ee', '#fef2f2'] },
    { id: 'light-sky', name: 'Sky Light', colors: ['#0ea5e9', '#06b6d4', '#8b5cf6', '#f1f5f9'] },
    { id: 'light-meadow', name: 'Meadow Light', colors: ['#22c55e', '#84cc16', '#facc15', '#f3f4f6'] },
    { id: 'light-rose', name: 'Rose Light', colors: ['#fb7185', '#f472b6', '#a78bfa', '#ffe4e6'] },
];

const ThemeOption: React.FC<{
    themeInfo: typeof themes[0],
    isSelected: boolean,
    onSelect: () => void
}> = ({ themeInfo, isSelected, onSelect }) => {
    return (
        <button
            onClick={onSelect}
            className={`w-full p-4 border-2 rounded-lg flex items-center justify-between transition-colors ${isSelected ? 'border-primary' : 'border-base-300 hover:border-primary/50'}`}
        >
            <span className="font-semibold text-lg">{themeInfo.name}</span>
            <div className="flex items-center gap-2">
                {themeInfo.colors.map((color, index) => (
                    <div key={index} className="w-6 h-6 rounded-full border border-base-300" style={{ backgroundColor: color }}></div>
                ))}
            </div>
        </button>
    )
}

const SettingsScreen: React.FC<SettingsScreenProps> = ({ setScreen }) => {
    const { theme, setTheme } = useSettings();

    return (
        <div className="max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-8">Settings</h2>
            
            <div className="bg-base-200 p-6 rounded-lg">
                <h3 className="text-xl font-bold mb-4">Color Theme</h3>
                <div className="space-y-3">
                    {themes.map(themeInfo => (
                        <ThemeOption 
                            key={themeInfo.id}
                            themeInfo={themeInfo}
                            isSelected={theme === themeInfo.id}
                            onSelect={() => setTheme(themeInfo.id)}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};

export default SettingsScreen;