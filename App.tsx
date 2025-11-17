
import React, { useState, useEffect, useCallback } from 'react';
import { SettingsProvider, useSettings } from './contexts/SettingsContext';
import { WordsProvider } from './contexts/WordsContext';
import { ModalProvider, useModal } from './contexts/ModalContext';
import { SwipeSettingsProvider } from './contexts/SwipeSettingsContext';

import MainMenuScreen from './components/screens/MainMenuScreen';
import LanguageSelectScreen from './components/screens/LanguageSelectScreen';
import GameSelectionScreen from './components/screens/GameSelectionScreen';
import ManageWordsScreen from './components/screens/ManageWordsScreen';
import FlashcardGameScreen from './components/screens/FlashcardGameScreen';

import ConfirmationModal from './components/modals/ConfirmationModal';
import InfoModal from './components/modals/InfoModal';
import AddWordModal from './components/modals/AddWordModal';
import HelpModal from './components/modals/HelpModal';
import StartupDisclaimerModal from './components/modals/StartupDisclaimerModal';
import ReadMeModal from './components/modals/ReadMeModal';
import SetStackSizeModal from './components/modals/SetStackSizeModal';
import SwipeSettingsModal from './components/modals/SwipeSettingsModal';
import { flashcardHelpContent, csvHelpContent } from './constants';

export type Screen = 'main-menu' | 'language-select' | 'game-selection' | 'manage-words' | 'flashcard-game';

const AppContent: React.FC = () => {
    const [screen, setScreen] = useState<Screen>('main-menu');
    const { currentLanguageInfo } = useSettings();
    const { showModal, isModalOpen } = useModal();
    const [disclaimerConfirmed, setDisclaimerConfirmed] = useState(false);

    useEffect(() => {
        showModal('startupDisclaimer');
    }, [showModal]);

    const handleDisclaimerConfirm = useCallback(() => {
        setDisclaimerConfirmed(true);
    }, []);

    const renderScreen = () => {
        if (!disclaimerConfirmed) return null;

        switch (screen) {
            case 'language-select':
                return <LanguageSelectScreen setScreen={setScreen} />;
            case 'game-selection':
                return <GameSelectionScreen setScreen={setScreen} />;
            case 'manage-words':
                return <ManageWordsScreen />;
            case 'flashcard-game':
                return <FlashcardGameScreen setScreen={setScreen} />;
            case 'main-menu':
            default:
                return <MainMenuScreen setScreen={setScreen} />;
        }
    };

    return (
        <div className="min-h-screen flex flex-col">
            <header className="bg-base-200 shadow-md p-4 flex justify-between items-center sticky top-0 z-40">
                <h1 className="text-xl md:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">AI Vocab Builder</h1>
                {disclaimerConfirmed && (
                    <div className="flex items-center gap-4">
                        <span className="text-sm font-medium text-gray-400">
                            SV → {currentLanguageInfo.englishName.toUpperCase()}
                        </span>
                        {screen !== 'main-menu' && (
                            <button onClick={() => setScreen('main-menu')} className="bg-primary text-primary-content font-bold py-2 px-4 rounded-lg hover:bg-primary-focus transition-colors">
                                Home
                            </button>
                        )}
                    </div>
                )}
            </header>

            <main className="flex-grow p-4 md:p-6 lg:p-8">
                <div className="max-w-7xl mx-auto">
                    {renderScreen()}
                </div>
            </main>
            
            <div className="fixed bottom-2 right-3 text-xs text-gray-500">v3.0.0-React</div>

            {/* Modals */}
            <StartupDisclaimerModal onConfirm={handleDisclaimerConfirm} />
            <ConfirmationModal />
            <InfoModal />
            <AddWordModal />
            <SetStackSizeModal />
            <SwipeSettingsModal />
            <HelpModal modalId="flashcardHelp" title="How to use Flashcards" content={flashcardHelpContent} />
            <HelpModal modalId="csvHelp" title="How to Format Your CSV File" content={csvHelpContent} />
            <ReadMeModal />

            {isModalOpen && <div className="fixed inset-0 bg-black bg-opacity-70 z-40"></div>}
        </div>
    );
};

const App: React.FC = () => {
    return (
        <SettingsProvider>
            <WordsProvider>
                <ModalProvider>
                    <SwipeSettingsProvider>
                        <AppContent />
                    </SwipeSettingsProvider>
                </ModalProvider>
            </WordsProvider>
        </SettingsProvider>
    );
};

export default App;
