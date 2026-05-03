import React from 'react';
import { Screen } from '../../types';
import { useModal } from '../../contexts/ModalContext';
import { useTranslation } from '../../hooks/useTranslation';

interface MainMenuScreenProps {
    setScreen: (screen: Screen) => void;
    handleCheckForUpdate: () => void;
}

const MenuCard: React.FC<{
    onClick: () => void;
    icon: React.ReactNode;
    title: string;
    subtitle?: string;
    gradientClass: string;
    glowClass: string;
}> = ({ onClick, icon, title, subtitle, gradientClass, glowClass }) => (
    <button
        onClick={onClick}
        className={`group relative flex flex-col items-center justify-center p-6 sm:p-8 rounded-3xl bg-base-200/40 backdrop-blur-md border border-white/10 transition-all duration-300 hover:-translate-y-1 overflow-hidden ${glowClass} text-center h-full w-full`}
    >
        {/* Top subtle gradient line */}
        <div className={`absolute top-0 inset-x-0 h-1 bg-gradient-to-r ${gradientClass} opacity-70 group-hover:opacity-100 transition-opacity`}></div>
        
        {/* Glow behind icon */}
        <div className={`absolute inset-0 bg-gradient-to-b ${gradientClass} opacity-0 group-hover:opacity-10 transition-opacity`}></div>

        <div className="relative z-10 flex flex-col items-center w-full">
            <div className={`w-16 h-16 sm:w-20 sm:h-20 mb-4 rounded-2xl flex items-center justify-center bg-white/5 border border-white/5 group-hover:scale-110 transition-transform duration-300 shadow-inner`}>
                {icon}
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-white mb-1.5 drop-shadow-sm">{title}</h3>
            {subtitle && (
                <p className="text-xs sm:text-sm text-gray-400 font-medium leading-relaxed max-w-[90%]">
                    {subtitle}
                </p>
            )}
        </div>
    </button>
);

const SmallMenuButton: React.FC<{
    onClick: () => void;
    icon: React.ReactNode;
    label: string;
}> = ({ onClick, icon, label }) => (
    <button
        onClick={onClick}
        className="flex items-center justify-center gap-3 p-4 rounded-2xl bg-base-300/30 backdrop-blur-sm border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all group"
    >
        <div className="text-gray-400 group-hover:text-white transition-colors">
            {icon}
        </div>
        <span className="text-sm font-bold text-gray-300 group-hover:text-white transition-colors">{label}</span>
    </button>
);

const MainMenuScreen: React.FC<MainMenuScreenProps> = ({ setScreen, handleCheckForUpdate }) => {
    const { showModal } = useModal();
    const { t } = useTranslation();

    return (
        <div className="flex flex-col min-h-full pb-8 fade-in">
            {/* Header Area */}
            <div className="text-center pt-8 pb-10">
                <div className="inline-block relative">
                    <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-white to-gray-400 drop-shadow-lg mb-2">
                        Vocab Builder
                    </h1>
                    <div className="absolute -bottom-2 inset-x-0 h-1 bg-gradient-to-r from-purple-500 via-blue-500 to-emerald-500 rounded-full blur-[2px] opacity-70"></div>
                </div>
                <p className="text-gray-400 mt-4 font-medium uppercase tracking-widest text-sm">Select your path</p>
            </div>

            {/* Main Action Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 max-w-4xl mx-auto w-full px-4 mb-6">
                {/* Play Game */}
                <MenuCard
                    onClick={() => setScreen('game-selection')}
                    icon={
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    }
                    title={t('menu.playGame')}
                    subtitle="Start studying, review flashcards, or play vocabulary minigames."
                    gradientClass="from-purple-500 to-pink-500"
                    glowClass="hover:shadow-[0_10px_40px_rgba(168,85,247,0.25)] hover:border-purple-500/30"
                />

                {/* Manage Words */}
                <MenuCard
                    onClick={() => setScreen('manage-words')}
                    icon={
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                    }
                    title={t('menu.manageWords')}
                    subtitle="Add, edit, and organize your master vocabulary list."
                    gradientClass="from-blue-500 to-indigo-500"
                    glowClass="hover:shadow-[0_10px_40px_rgba(59,130,246,0.25)] hover:border-blue-500/30"
                />

                {/* SRS Stats */}
                <MenuCard
                    onClick={() => setScreen('srs-stats')}
                    icon={
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                    }
                    title="SRS Stats"
                    subtitle="Track your learning progress and spaced repetition metrics."
                    gradientClass="from-emerald-500 to-teal-500"
                    glowClass="hover:shadow-[0_10px_40px_rgba(16,185,129,0.25)] hover:border-emerald-500/30"
                />
            </div>

            {/* Utility Links Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-4xl mx-auto w-full px-4 mb-8">
                <SmallMenuButton
                    onClick={() => setScreen('settings')}
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
                    label={t('menu.settings')}
                />
                <SmallMenuButton
                    onClick={() => setScreen('language-select')}
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" /></svg>}
                    label={t('menu.language')}
                />
                <SmallMenuButton
                    onClick={() => showModal('readMe')}
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                    label={t('menu.readMeFirst')}
                />
            </div>

            {/* Footer Area (Check for updates) */}
            <div className="mt-auto text-center pt-8">
                <button
                    onClick={handleCheckForUpdate}
                    className="group inline-flex items-center gap-2 px-4 py-2 rounded-full hover:bg-white/5 transition-colors text-xs font-semibold text-gray-500 hover:text-gray-300"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    {t('menu.checkForUpdates')}
                </button>
            </div>
        </div>
    );
};

export default MainMenuScreen;
