
import React from 'react';
import { Screen } from '../../types';
import { useModal } from '../../contexts/ModalContext';

interface MainMenuScreenProps {
    setScreen: (screen: Screen) => void;
}

const MenuButton: React.FC<{
    onClick: () => void;
    icon: React.ReactNode;
    label: string;
    className: string;
}> = ({ onClick, icon, label, className }) => (
    <button
        onClick={onClick}
        className={`flex flex-col items-center justify-center p-8 rounded-xl shadow-lg transition-all hover:-translate-y-1 duration-300 ${className}`}
    >
        {icon}
        <span className="text-2xl font-bold">{label}</span>
    </button>
);

const MainMenuScreen: React.FC<MainMenuScreenProps> = ({ setScreen }) => {
    const { showModal } = useModal();

    return (
        <div className="text-center space-y-4 pt-12">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
                <MenuButton
                    onClick={() => setScreen('game-selection')}
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                    label="Play Game"
                    className="bg-primary text-primary-content hover:bg-primary-focus"
                />
                <MenuButton
                    onClick={() => setScreen('manage-words')}
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>}
                    label="Manage Words"
                    className="bg-secondary text-secondary-content hover:bg-secondary-focus"
                />
                <MenuButton
                    onClick={() => setScreen('language-select')}
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" /></svg>}
                    label="Språk"
                    className="bg-accent text-accent-content hover:bg-accent-focus"
                />
                <MenuButton
                    onClick={() => showModal('readMe')}
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                    label="Read Me First"
                    className="bg-base-300 text-base-content hover:bg-primary hover:text-primary-content"
                />
            </div>
        </div>
    );
};

export default MainMenuScreen;