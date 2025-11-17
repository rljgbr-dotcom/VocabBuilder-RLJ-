
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
import MultipleChoiceGameScreen from './components/screens/MultipleChoiceGameScreen';
import MatchingGameScreen from './components/screens/MatchingGameScreen';
import TypingTestScreen from './components/screens/TypingTestScreen';
import SettingsScreen from './components/screens/SettingsScreen';


import ConfirmationModal from './components/modals/ConfirmationModal';
import InfoModal from './components/modals/InfoModal';
import AddWordModal from './components/modals/AddWordModal';
import HelpModal from './components/modals/HelpModal';
import StartupDisclaimerModal from './components/modals/StartupDisclaimerModal';
import ReadMeModal from './components/modals/ReadMeModal';
import SetStackSizeModal from './components/modals/SetStackSizeModal';
import SwipeSettingsModal from './components/modals/SwipeSettingsModal';
import { flashcardHelpContent, csvHelpContent } from './constants';
import { Screen } from './types';

const UpdateToast: React.FC<{ onUpdate: () => void }> = ({ onUpdate }) => (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-accent text-accent-content py-3 px-5 rounded-lg shadow-2xl z-50 flex items-center gap-4 animate-slide-in-up">
        <p className="font-semibold">A new version is available!</p>
        <button
            onClick={onUpdate}
            className="bg-accent-focus text-white font-bold py-1 px-3 rounded-md border border-white/50 hover:bg-white hover:text-accent-focus transition-colors"
        >
            Refresh
        </button>
    </div>
);

const AppContent: React.FC = () => {
    const [screen, setScreen] = useState<Screen>('main-menu');
    const { currentLanguageInfo } = useSettings();
    const { showModal, isModalOpen } = useModal();
    const [disclaimerConfirmed, setDisclaimerConfirmed] = useState(false);
    const [updateAvailable, setUpdateAvailable] = useState(false);
    const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
    const [infoToast, setInfoToast] = useState('');

    const showInfoToast = useCallback((message: string, duration = 3000) => {
        setInfoToast(message);
        setTimeout(() => {
            setInfoToast('');
        }, duration);
    }, []);

    useEffect(() => {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.ready.then(reg => {
                if (!reg) return;
                
                const onUpdate = (worker: ServiceWorker) => {
                    setWaitingWorker(worker);
                    setUpdateAvailable(true);
                };

                if (reg.waiting) {
                    onUpdate(reg.waiting);
                }
                
                reg.addEventListener('updatefound', () => {
                    const newWorker = reg.installing;
                    if (newWorker) {
                        newWorker.addEventListener('statechange', () => {
                            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                onUpdate(newWorker);
                            }
                        });
                    }
                });
            }).catch(error => {
                console.error('Error getting service worker registration:', error);
            });

            let refreshing = false;
            navigator.serviceWorker.addEventListener('controllerchange', () => {
                if (!refreshing) {
                    window.location.reload();
                    refreshing = true;
                }
            });
        }
    }, []);
    
    const handleUpdate = () => {
        if (waitingWorker) {
            waitingWorker.postMessage({ type: 'SKIP_WAITING' });
        }
    };

    const handleCheckForUpdate = useCallback(async () => {
        if (!('serviceWorker' in navigator) || !navigator.serviceWorker.ready) {
            showInfoToast("Update check not available on this browser.");
            return;
        }

        try {
            const registration = await navigator.serviceWorker.ready;
            showInfoToast("Checking for updates... You'll be notified if one is found.", 4000);
            await registration.update();
        } catch (error) {
            console.error("Error during service worker update check:", error);
            showInfoToast("Failed to check for updates.");
        }
    }, [showInfoToast]);


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
            case 'multiple-choice-game':
                return <MultipleChoiceGameScreen setScreen={setScreen} />;
            case 'matching-game':
                return <MatchingGameScreen setScreen={setScreen} />;
            case 'typing-test-game':
                return <TypingTestScreen setScreen={setScreen} />;
            case 'settings':
                return <SettingsScreen setScreen={setScreen} />;
            case 'main-menu':
            default:
                return <MainMenuScreen setScreen={setScreen} handleCheckForUpdate={handleCheckForUpdate} />;
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
                <div className="max-w-7xl mx-auto h-full">
                    {renderScreen()}
                </div>
            </main>
            
            <div className="fixed bottom-2 right-3 text-xs text-gray-500">v3.1.04</div>

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
            
            {infoToast && (
                <div className="fixed top-20 left-1/2 -translate-x-1/2 bg-accent text-accent-content py-2 px-6 rounded-full shadow-lg z-50 animate-fade-in-out">
                    {infoToast}
                </div>
            )}
            
            {updateAvailable && <UpdateToast onUpdate={handleUpdate} />}
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