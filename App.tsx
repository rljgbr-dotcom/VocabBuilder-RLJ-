
import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from './hooks/useTranslation';
import { SettingsProvider, useSettings } from './contexts/SettingsContext';
import { WordsProvider, useWords } from './contexts/WordsContext';
import { ModalProvider, useModal } from './contexts/ModalContext';
import { SwipeSettingsProvider } from './contexts/SwipeSettingsContext';
import { GoogleDriveProvider, useGoogleDrive } from './contexts/GoogleDriveContext';

import MainMenuScreen from './components/screens/MainMenuScreen';
import LanguageSelectScreen from './components/screens/LanguageSelectScreen';
import GameSelectionScreen from './components/screens/GameSelectionScreen';
import ManageWordsScreen from './components/screens/ManageWordsScreen';
import FlashcardGameScreen from './components/screens/FlashcardGameScreen';
import MultipleChoiceGameScreen from './components/screens/MultipleChoiceGameScreen';
import MatchingGameScreen from './components/screens/MatchingGameScreen';
import TypingTestScreen from './components/screens/TypingTestScreen';
import SettingsScreen from './components/screens/SettingsScreen';
import SmartCardsGameScreen from './components/screens/SmartCardsGameScreen';


import ConfirmationModal from './components/modals/ConfirmationModal';
import InfoModal from './components/modals/InfoModal';
import AddWordModal from './components/modals/AddWordModal';
import HelpModal from './components/modals/HelpModal';
import StartupDisclaimerModal from './components/modals/StartupDisclaimerModal';
import ReadMeModal from './components/modals/ReadMeModal';
import SetStackSizeModal from './components/modals/SetStackSizeModal';
import SwipeSettingsModal from './components/modals/SwipeSettingsModal';
import FlashcardBackModal from './components/modals/FlashcardBackModal';
import FlashcardBulkModal from './components/modals/FlashcardBulkModal';
import FlashcardFilterModal from './components/modals/FlashcardFilterModal';
import ShareDeckModal from './components/modals/ShareDeckModal';
import { flashcardHelpContent, flashcardHelpContent_es, csvHelpContent, csvHelpContent_es } from './constants';
import { Screen } from './types';
import { unpackDeck } from './utils/shareUtils';

const UpdateToast: React.FC<{ onUpdate: () => void }> = ({ onUpdate }) => {
    const { t } = useTranslation();
    return (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-accent text-accent-content py-3 px-5 rounded-lg shadow-2xl z-50 flex items-center gap-4 animate-slide-in-up">
            <p className="font-semibold">{t('app.newVersion')}</p>
            <button
                onClick={onUpdate}
                className="bg-accent-focus text-white font-bold py-1 px-3 rounded-md border border-white/50 hover:bg-white hover:text-accent-focus transition-colors"
            >
                {t('app.refresh')}
            </button>
        </div>
    );
};

const AppContent: React.FC = () => {
    const [screen, setScreen] = useState<Screen>('main-menu');
    const { t } = useTranslation();
    const { currentLanguageInfo, currentSourceLanguage } = useSettings();
    const { showModal, isModalOpen } = useModal();
    const { importSharedDeck } = useWords();
    const [disclaimerConfirmed, setDisclaimerConfirmed] = useState(false);
    const [updateAvailable, setUpdateAvailable] = useState(false);
    const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
    const [infoToast, setInfoToast] = useState('');
    // Stores words from a share link URL until after the disclaimer is confirmed
    const pendingImportRef = React.useRef<any[] | null>(null);

    const flashcardHelp = currentSourceLanguage === 'es' ? flashcardHelpContent_es : flashcardHelpContent;
    const csvHelp = currentSourceLanguage === 'es' ? csvHelpContent_es : csvHelpContent;

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

    // Step 1: Detect a shared deck in the URL on first load and stash it.
    // We don't show the prompt yet because the startup disclaimer may not have been confirmed.
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const importData = params.get('import');
        if (!importData) return;
        // Clean the URL immediately so a refresh doesn't re-trigger
        window.history.replaceState({}, document.title, window.location.pathname);
        const sharedWords = unpackDeck(importData);
        if (sharedWords && sharedWords.length > 0) {
            pendingImportRef.current = sharedWords;
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Only on mount

    // Step 2: Once the disclaimer is confirmed, show the import prompt if one is pending.
    useEffect(() => {
        if (!disclaimerConfirmed) return;
        const sharedWords = pendingImportRef.current;
        if (!sharedWords) return;
        pendingImportRef.current = null;

        showModal('confirmation', {
            text: `You've been sent a shared vocabulary deck with ${sharedWords.length} word${sharedWords.length !== 1 ? 's' : ''}. Would you like to import them into your collection? Duplicates will be skipped.`,
            onConfirm: () => {
                const { added, duplicates } = importSharedDeck(sharedWords);
                showModal('info', {
                    title: 'Import Complete',
                    message: `✅ ${added} word${added !== 1 ? 's' : ''} added${duplicates > 0 ? `\n⏭ ${duplicates} duplicate${duplicates !== 1 ? 's' : ''} skipped` : ''}.`,
                });
            },
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [disclaimerConfirmed]);

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
            case 'smart-cards-game':
                return <SmartCardsGameScreen setScreen={setScreen} />;
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
                <h1 className="text-xl md:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">{t('app.title')}</h1>
                {disclaimerConfirmed && (
                    <div className="flex items-center gap-3">
                        <span className="text-xs md:text-sm font-medium text-gray-400">
                            Svenska → {currentLanguageInfo.nativeName}
                        </span>
                        {screen !== 'main-menu' && (
                            <button onClick={() => setScreen('main-menu')} className="bg-primary text-primary-content font-bold py-2 px-4 rounded-lg hover:bg-primary-focus transition-colors">
                                {t('menu.home')}
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

            {/* Bottom Footer for Status Info */}
            <footer className="bg-base-300/50 backdrop-blur-sm px-4 py-1.5 flex justify-between items-center sticky bottom-0 z-40 border-t border-white/5">
                <div className="flex items-center gap-4">
                    {disclaimerConfirmed && <DriveStatusPill />}
                </div>
                <div className="text-[10px] text-gray-500 font-mono tracking-tighter opacity-50">
                    v4.2.29
                </div>
            </footer>

            {/* Modals */}
            <StartupDisclaimerModal onConfirm={handleDisclaimerConfirm} />
            <ConfirmationModal />
            <InfoModal />
            <AddWordModal />
            <SetStackSizeModal />
            <SwipeSettingsModal />
            <FlashcardBackModal />
            <FlashcardBulkModal />
            <FlashcardFilterModal />
            <ShareDeckModal />
            <HelpModal modalId="flashcardHelp" title={t('help.flashcards.title')} content={flashcardHelp} />
            <HelpModal modalId="csvHelp" title={t('help.csv.title')} content={csvHelp} />
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

/** Small pill in the header showing Drive sync state */
const DriveStatusPill: React.FC = () => {
    const { connected, syncStatus, lastSyncTime } = useGoogleDrive();
    if (!connected) return null;

    const label = syncStatus === 'syncing' ? 'Syncing…'
        : syncStatus === 'success' ? 'Synced ✓'
        : syncStatus === 'error' ? 'Sync failed'
        : lastSyncTime ? `Synced ${new Date(lastSyncTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
        : 'Drive connected';

    const color = syncStatus === 'error' ? 'text-red-400'
        : syncStatus === 'success' ? 'text-green-400'
        : 'text-gray-400';

    return (
        <span className={`text-[10px] font-bold flex items-center gap-1 ${color}`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/>
            </svg>
            {label}
        </span>
    );
};

/** Inner app wrapper — needs access to WordsContext for auto-sync */
const AppWithDrive: React.FC = () => {
    const { words } = useWords();
    return (
        <GoogleDriveProvider words={words}>
            <AppContent />
        </GoogleDriveProvider>
    );
};

const App: React.FC = () => {
    return (
        <SettingsProvider>
            <WordsProvider>
                <ModalProvider>
                    <SwipeSettingsProvider>
                        <AppWithDrive />
                    </SwipeSettingsProvider>
                </ModalProvider>
            </WordsProvider>
        </SettingsProvider>
    );
};

export default App;
