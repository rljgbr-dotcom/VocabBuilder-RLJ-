import React from 'react';
import { Screen } from '../../types';
import { useSettings } from '../../contexts/SettingsContext';
import { useGoogleDrive } from '../../contexts/GoogleDriveContext';
import { useWords } from '../../contexts/WordsContext';
import { useModal } from '../../contexts/ModalContext';

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
}> = ({ themeInfo, isSelected, onSelect }) => (
    <button
        onClick={onSelect}
        className={`w-full p-4 border-2 rounded-lg flex items-center justify-between transition-colors ${isSelected ? 'border-primary' : 'border-base-300 hover:border-primary/50'}`}
    >
        <span className="font-semibold text-lg">{themeInfo.name}</span>
        <div className="flex items-center gap-2">
            {themeInfo.colors.map((color, index) => (
                <div key={index} className="w-6 h-6 rounded-full border border-base-300" style={{ backgroundColor: color }} />
            ))}
        </div>
    </button>
);

// ── Cloud Sync Panel ─────────────────────────────────────────────────────────

const CloudSyncPanel: React.FC = () => {
    const { connected, syncStatus, lastSyncTime, syncError, backupInfo, connect, disconnect, syncNow, restoreFromBackup } = useGoogleDrive();
    const { words, importSharedDeck } = useWords();
    const { showModal } = useModal();

    const isBusy = syncStatus === 'syncing';

    const formatDate = (iso: string | null) => {
        if (!iso) return 'Never';
        const d = new Date(iso);
        return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
            + ' at '
            + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const handleRestore = () => {
        showModal('confirmation', {
            text: 'Restore from your Google Drive backup? This will replace all current words and saved states with the backed-up version.',
            onConfirm: () => {
                restoreFromBackup((restoredWords) => {
                    importSharedDeck(restoredWords);
                    showModal('info', {
                        title: 'Backup Restored',
                        message: `✅ ${restoredWords.length} words restored from Google Drive.`,
                    });
                });
            },
        });
    };

    return (
        <div className="bg-base-200 p-6 rounded-lg">
            <div className="flex items-center gap-3 mb-4">
                {/* Google Drive logo colours */}
                <svg viewBox="0 0 87.3 78" className="h-7 w-7" xmlns="http://www.w3.org/2000/svg">
                    <path d="M6.6 66.85l3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3L27.5 51H0c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
                    <path d="M43.65 25L29.9 1.2C28.55.4 27 0 25.45 0c-1.55 0-3.1.4-4.45 1.2L6.6 25h37.05z" fill="#00ac47"/>
                    <path d="M73.55 75.8c1.35-.8 2.5-1.9 3.3-3.3L78.1 70l8-13.85c.8-1.4 1.2-2.95 1.2-4.5H60.1L73.55 75.8z" fill="#ea4335"/>
                    <path d="M43.65 25L57.4 1.2C56.05.4 54.5 0 52.95 0H34.35c-1.55 0-3.1.4-4.45 1.2L43.65 25z" fill="#00832d"/>
                    <path d="M60.1 51H27.5L13.75 75.8c1.35.8 2.9 1.2 4.45 1.2h50.9c1.55 0 3.1-.4 4.45-1.2L60.1 51z" fill="#2684fc"/>
                    <path d="M73.4 26.35L60.15 3.5C59.35 2.1 58.2 1 56.85.2L43.65 25 60.1 51h27.2c0-1.55-.4-3.1-1.2-4.5L73.4 26.35z" fill="#ffba00"/>
                </svg>
                <div>
                    <h3 className="text-xl font-bold">Google Drive Sync</h3>
                    <p className="text-xs text-gray-400">Automatically backs up your words and SRS progress</p>
                </div>
                {connected && (
                    <span className="ml-auto px-2 py-0.5 text-[10px] font-bold bg-green-600/20 text-green-400 rounded-full border border-green-600/30">
                        CONNECTED
                    </span>
                )}
            </div>

            {!connected ? (
                <div className="space-y-3">
                    <p className="text-sm text-gray-400 leading-relaxed">
                        Connect your Google account to automatically save your vocabulary and SRS progress to a private folder in your Google Drive. Your data is only visible to this app.
                    </p>
                    <button
                        onClick={connect}
                        className="w-full py-3 bg-primary text-primary-content font-bold rounded-lg hover:bg-primary-focus transition-colors flex items-center justify-center gap-2"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                        </svg>
                        Connect Google Drive
                    </button>
                    {syncError && (
                        <p className="text-xs text-red-400 text-center">{syncError}</p>
                    )}
                </div>
            ) : (
                <div className="space-y-3">
                    {/* Backup detected banner — shown right after connecting when Drive has a backup */}
                    {backupInfo && (
                        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 flex items-start gap-3">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                            </svg>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-amber-300">Backup found on Drive</p>
                                <p className="text-xs text-amber-400/80 mt-0.5">Saved {formatDate(backupInfo.modifiedTime)}</p>
                                <button
                                    onClick={handleRestore}
                                    disabled={isBusy}
                                    className="mt-2 px-3 py-1.5 bg-amber-500 text-black font-bold text-xs rounded-lg hover:bg-amber-400 transition-colors disabled:opacity-50"
                                >
                                    Restore this backup →
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Status row */}
                    <div className="bg-base-300 rounded-lg p-3 flex items-center justify-between text-sm">
                        <div>
                            <div className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-0.5">Last synced</div>
                            <div className={`font-semibold ${syncStatus === 'error' ? 'text-red-400' : ''}`}>
                                {syncStatus === 'syncing' ? (
                                    <span className="flex items-center gap-1.5">
                                        <svg className="animate-spin h-3.5 w-3.5 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                                        </svg>
                                        Syncing…
                                    </span>
                                ) : syncStatus === 'error' ? syncError
                                : formatDate(lastSyncTime)}
                            </div>
                        </div>
                        <div className="text-xs text-gray-500">{words.length} words</div>
                    </div>

                    {/* Action buttons */}
                    <div className="grid grid-cols-2 gap-2">
                        <button
                            onClick={() => syncNow(words)}
                            disabled={isBusy}
                            className="py-2.5 bg-primary text-primary-content font-bold rounded-lg hover:bg-primary-focus transition-colors text-sm disabled:opacity-50 flex items-center justify-center gap-1.5"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${isBusy ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            Sync Now
                        </button>
                        <button
                            onClick={handleRestore}
                            disabled={isBusy}
                            className="py-2.5 bg-base-300 font-bold rounded-lg hover:bg-base-100 transition-colors text-sm disabled:opacity-50 flex items-center justify-center gap-1.5"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                            </svg>
                            Restore Backup
                        </button>
                    </div>

                    {/* Disconnect */}
                    <button
                        onClick={disconnect}
                        className="w-full py-2 text-xs text-gray-500 hover:text-red-400 transition-colors"
                    >
                        Disconnect Google Drive
                    </button>
                </div>
            )}
        </div>
    );
};

// ── Main Settings Screen ─────────────────────────────────────────────────────

const SettingsScreen: React.FC<SettingsScreenProps> = ({ setScreen }) => {
    const { theme, setTheme } = useSettings();

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <h2 className="text-3xl font-bold text-center mb-8">Settings</h2>

            {/* Cloud Sync */}
            <CloudSyncPanel />

            {/* Themes */}
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