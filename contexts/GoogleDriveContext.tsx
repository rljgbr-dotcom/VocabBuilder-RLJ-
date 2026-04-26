import React, { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from 'react';
import {
    isSignedIn as driveIsSignedIn,
    getAccessToken,
    signOut as driveSignOut,
    uploadBackup,
    downloadBackup,
    getBackupMetadata,
} from '../services/googleDriveService';
import { Word } from '../types';

// ── Types ───────────────────────────────────────────────────────────────────

export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error';

export interface DriveBackupInfo {
    modifiedTime: string; // ISO
    wordCount?: number;
}

interface GoogleDriveContextType {
    connected: boolean;
    syncStatus: SyncStatus;
    lastSyncTime: string | null;
    newerBackupAvailable: boolean;
    syncError: string | null;
    backupInfo: DriveBackupInfo | null; // info about what's on Drive after connecting
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
    const [newerBackupAvailable, setNewerBackupAvailable] = useState(false);
    const [syncError, setSyncError] = useState<string | null>(null);
    const [backupInfo, setBackupInfo] = useState<DriveBackupInfo | null>(null);

    // Auto-sync: debounced, ONLY fires when words change while already connected.
    // Does NOT fire on initial connect — that would overwrite the Drive backup.
    const autoSyncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isFirstMount = useRef(true);
    const justConnected = useRef(false); // guard: skip first words-change after connect

    useEffect(() => {
        // Skip the very first render
        if (isFirstMount.current) {
            isFirstMount.current = false;
            return;
        }
        if (!connected) return;

        // Skip exactly once right after the user connects — we don't want to
        // overwrite a Drive backup with potentially stale local data.
        if (justConnected.current) {
            justConnected.current = false;
            return;
        }

        if (autoSyncTimer.current) clearTimeout(autoSyncTimer.current);
        autoSyncTimer.current = setTimeout(() => {
            performSync(words);
        }, 5000);

        return () => {
            if (autoSyncTimer.current) clearTimeout(autoSyncTimer.current);
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [words, connected]);

    // On mount, if connected, check for newer backup
    useEffect(() => {
        const checkNewer = async () => {
            if (connected && lastSyncTime) {
                try {
                    const meta = await getBackupMetadata();
                    if (meta && new Date(meta.modifiedTime) > new Date(lastSyncTime)) {
                        setNewerBackupAvailable(true);
                    }
                } catch { /* ignore */ }
            }
        };
        checkNewer();
    }, [connected, lastSyncTime]);

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
            setNewerBackupAvailable(false);
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
            justConnected.current = true; // prevent auto-upload on first words effect
            setConnected(true);
            setSyncError(null);
            // Check if there's already a backup on Drive — without downloading it yet
            try {
                const meta = await getBackupMetadata();
                if (meta) {
                    setBackupInfo({ modifiedTime: meta.modifiedTime });
                    // Check if Drive is newer than our last sync
                    if (lastSyncTime && new Date(meta.modifiedTime) > new Date(lastSyncTime)) {
                        setNewerBackupAvailable(true);
                    }
                }
            } catch {
                // Non-fatal — just means we couldn't check metadata
            }
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
            setNewerBackupAvailable(false);
            setSyncStatus('success');
            setTimeout(() => setSyncStatus('idle'), 3000);
        } catch (err: any) {
            setSyncStatus('error');
            setSyncError(err?.message || 'Restore failed');
        }
    }, []);

    return (
        <GoogleDriveContext.Provider value={{
            connected, syncStatus, lastSyncTime, newerBackupAvailable, syncError, backupInfo,
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
