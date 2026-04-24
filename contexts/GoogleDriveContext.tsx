import React, { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from 'react';
import {
    isSignedIn as driveIsSignedIn,
    getAccessToken,
    signOut as driveSignOut,
    uploadBackup,
    downloadBackup,
} from '../services/googleDriveService';
import { Word } from '../types';

// ── Types ───────────────────────────────────────────────────────────────────

export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error';

interface GoogleDriveContextType {
    connected: boolean;
    syncStatus: SyncStatus;
    lastSyncTime: string | null; // ISO string
    syncError: string | null;
    connect: () => Promise<void>;
    disconnect: () => void;
    syncNow: (words: Word[]) => Promise<void>;
    restoreFromBackup: (onRestore: (words: Word[]) => void) => Promise<void>;
}

// ── Context ─────────────────────────────────────────────────────────────────

const GoogleDriveContext = createContext<GoogleDriveContextType | undefined>(undefined);

// ── Provider ────────────────────────────────────────────────────────────────

const LAST_SYNC_KEY = 'gd_last_sync_time';

export const GoogleDriveProvider: React.FC<{ children: ReactNode; words: Word[] }> = ({ children, words }) => {
    const [connected, setConnected] = useState(driveIsSignedIn());
    const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
    const [lastSyncTime, setLastSyncTime] = useState<string | null>(
        localStorage.getItem(LAST_SYNC_KEY)
    );
    const [syncError, setSyncError] = useState<string | null>(null);

    // Auto-sync: debounced, triggers whenever words change and user is connected
    const autoSyncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isFirstMount = useRef(true);

    useEffect(() => {
        // Skip the very first render to avoid syncing stale data on load
        if (isFirstMount.current) {
            isFirstMount.current = false;
            return;
        }
        if (!connected) return;

        if (autoSyncTimer.current) clearTimeout(autoSyncTimer.current);
        autoSyncTimer.current = setTimeout(() => {
            performSync(words);
        }, 5000); // 5-second debounce — won't spam Drive on rapid edits

        return () => {
            if (autoSyncTimer.current) clearTimeout(autoSyncTimer.current);
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [words, connected]);

    const performSync = useCallback(async (wordsToSync: Word[]) => {
        setSyncStatus('syncing');
        setSyncError(null);
        try {
            const savedStates = JSON.parse(localStorage.getItem('vocabuilder_word_states') || '{}');
            await uploadBackup({
                exportedAt: new Date().toISOString(),
                words: wordsToSync,
                savedStates,
            });
            const now = new Date().toISOString();
            setLastSyncTime(now);
            localStorage.setItem(LAST_SYNC_KEY, now);
            setSyncStatus('success');
            setTimeout(() => setSyncStatus('idle'), 3000);
        } catch (err: any) {
            setSyncStatus('error');
            setSyncError(err?.message || 'Sync failed');
        }
    }, []);

    // ── Public actions ──────────────────────────────────────────────────────

    const connect = useCallback(async () => {
        try {
            await getAccessToken(); // triggers Google sign-in popup if needed
            setConnected(true);
            setSyncError(null);
        } catch (err: any) {
            setSyncError(err?.message || 'Connection failed');
        }
    }, []);

    const disconnect = useCallback(() => {
        driveSignOut();
        setConnected(false);
        setSyncStatus('idle');
        setSyncError(null);
    }, []);

    const syncNow = useCallback(async (wordsArg: Word[]) => {
        await performSync(wordsArg);
    }, [performSync]);

    const restoreFromBackup = useCallback(async (onRestore: (words: Word[]) => void) => {
        setSyncStatus('syncing');
        setSyncError(null);
        try {
            const backup = await downloadBackup();
            if (!backup) {
                setSyncStatus('error');
                setSyncError('No backup found in your Google Drive.');
                return;
            }
            if (!Array.isArray(backup.words) || backup.words.length === 0) {
                setSyncStatus('error');
                setSyncError('Backup is empty or invalid.');
                return;
            }
            // Restore saved states too if present
            if (backup.savedStates) {
                localStorage.setItem('vocabuilder_word_states', JSON.stringify(backup.savedStates));
            }
            onRestore(backup.words as Word[]);
            const now = new Date().toISOString();
            setLastSyncTime(now);
            localStorage.setItem(LAST_SYNC_KEY, now);
            setSyncStatus('success');
            setTimeout(() => setSyncStatus('idle'), 3000);
        } catch (err: any) {
            setSyncStatus('error');
            setSyncError(err?.message || 'Restore failed');
        }
    }, []);

    return (
        <GoogleDriveContext.Provider value={{
            connected, syncStatus, lastSyncTime, syncError,
            connect, disconnect, syncNow, restoreFromBackup,
        }}>
            {children}
        </GoogleDriveContext.Provider>
    );
};

// ── Hook ─────────────────────────────────────────────────────────────────────

export const useGoogleDrive = (): GoogleDriveContextType => {
    const ctx = useContext(GoogleDriveContext);
    if (!ctx) throw new Error('useGoogleDrive must be used within GoogleDriveProvider');
    return ctx;
};
