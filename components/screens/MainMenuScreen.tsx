
import React from 'react';
import { Screen } from '../../types';
import { useModal } from '../../contexts/ModalContext';

interface MainMenuScreenProps {
    setScreen: (screen: Screen) => void;
    handleCheckForUpdate: () => void;
}

const MenuButton: React.FC<{
    onClick: () => void;
    icon: React.ReactNode;
    label: string;
    className: string;
}> = ({ onClick, icon, label, className }) => (
    <button
        onClick={onClick}
        className={`flex flex-col items-center justify-center p-6 rounded-xl shadow-lg transition-all hover:-translate-y-1 duration-300 ${className}`}
    >
        {icon}
        <span className="text-xl font-bold">{label}</span>
    </button>
);

const MainMenuScreen: React.FC<MainMenuScreenProps> = ({ setScreen, handleCheckForUpdate }) => {
    const { showModal } = useModal();

    return (
        <div className="text-center space-y-4 pt-12">
            <div className="grid grid-cols-2 gap-4 max-w-2xl mx-auto">
                <MenuButton
                    onClick={() => setScreen('game-selection')}
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                    label="Play Game"
                    className="bg-primary text-primary-content hover:bg-primary-focus"
                />
                <MenuButton
                    onClick={() => setScreen('manage-words')}
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>}
                    label="Manage Words"
                    className="bg-secondary text-secondary-content hover:bg-secondary-focus"
                />
                <MenuButton
                    onClick={() => setScreen('language-select')}
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" /></svg>}
                    label="Språk"
                    className="bg-accent text-accent-content hover:bg-accent-focus"
                />
                <MenuButton
                    onClick={() => showModal('readMe')}
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                    label="Read Me First"
                    className="bg-base-300 text-base-content hover:bg-primary hover:text-primary-content"
                />
                <MenuButton
                    onClick={() => setScreen('settings')}
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
                    label="Settings"
                    className="bg-base-300 text-base-content hover:bg-secondary hover:text-secondary-content"
                />
                <MenuButton
                    onClick={handleCheckForUpdate}
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" /></svg>}
                    label="Check for Updates"
                    className="bg-base-300 text-base-content hover:bg-accent hover:text-accent-content"
                />
            </div>
        </div>
    );
};

export default MainMenuScreen;
