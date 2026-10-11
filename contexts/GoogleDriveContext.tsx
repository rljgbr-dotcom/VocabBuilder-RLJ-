import React, { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from 'react';
import {
    isSignedIn as driveIsSignedIn,
    getAccessToken,
    signOut as driveSignOut,
    uploadBackup,
    downloadBackup,
    getBackupMetadata,
    BackupMetadata,
} from '../services/googleDriveService';
import { Word } from '../types';
import { getDeviceId, getDeviceName, setDeviceName as persistDeviceName } from '../utils/deviceUtils';

// ── Types ───────────────────────────────────────────────────────────────────

export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error';

export interface DriveBackupInfo {
    modifiedTime: string; // ISO
    wordCount?: number;
    deviceId?: string;
    deviceName?: string;
    exportedAt?: string;
    appVersion?: string;
    isFromOtherDevice?: boolean;
}

interface GoogleDriveContextType {
    connected: boolean;
    syncStatus: SyncStatus;
    lastSyncTime: string | null;
    newerBackupAvailable: boolean;
    syncError: string | null;
    backupInfo: DriveBackupInfo | null;
    currentDeviceId: string;
    currentDeviceName: string;
    updateDeviceName: (name: string) => void;
    connect: () => Promise<void>;
    disconnect: () => void;
    syncNow: (words: Word[]) => Promise<void>;
    restoreFromBackup: (onRestore: (words: Word[]) => void) => Promise<void>;
    checkForUpdates: () => Promise<DriveBackupInfo | null>;
    dismissNewerBackupNotification: () => void;
}

// ── Context ─────────────────────────────────────────────────────────────────

const GoogleDriveContext = createContext<GoogleDriveContextType | undefined>(undefined);

// ── Provider ────────────────────────────────────────────────────────────────

const LAST_SYNC_KEY = 'gd_last_sync_time';
const DISMISSED_BACKUP_TIME_KEY = 'gd_dismissed_backup_time';

export const GoogleDriveProvider: React.FC<{ children: ReactNode; words: Word[] }> = ({ children, words }) => {
    const [connected, setConnected] = useState(driveIsSignedIn());
    const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
    const [lastSyncTime, setLastSyncTime] = useState<string | null>(
        localStorage.getItem(LAST_SYNC_KEY)
    );
    const [newerBackupAvailable, setNewerBackupAvailable] = useState(false);
    const [syncError, setSyncError] = useState<string | null>(null);
    const [backupInfo, setBackupInfo] = useState<DriveBackupInfo | null>(null);
    const [currentDeviceName, setCurrentDeviceName] = useState(getDeviceName());
    const currentDeviceId = getDeviceId();

    // Auto-sync: debounced, ONLY fires when words change while already connected.
    // Does NOT fire on initial connect — that would overwrite the Drive backup.
    const autoSyncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isFirstMount = useRef(true);
    const justConnected = useRef(false); // guard: skip first words-change after connect

    const updateDeviceName = useCallback((name: string) => {
        persistDeviceName(name);
        setCurrentDeviceName(getDeviceName());
    }, []);

    const dismissNewerBackupNotification = useCallback(() => {
        if (backupInfo?.modifiedTime) {
            localStorage.setItem(DISMISSED_BACKUP_TIME_KEY, backupInfo.modifiedTime);
        }
        setNewerBackupAvailable(false);
    }, [backupInfo]);

    // Check Google Drive for the latest backup metadata and determine if it's newer / from another device
    const checkDriveBackup = useCallback(async (): Promise<DriveBackupInfo | null> => {
        if (!driveIsSignedIn()) return null;

        try {
            const meta = await getBackupMetadata();
            if (!meta) {
                setBackupInfo(null);
                return null;
            }

            const isFromOtherDevice = !!(meta.deviceId && meta.deviceId !== currentDeviceId);
            const info: DriveBackupInfo = {
                modifiedTime: meta.modifiedTime,
                wordCount: meta.wordCount,
                deviceId: meta.deviceId,
                deviceName: meta.deviceName,
                exportedAt: meta.exportedAt,
                appVersion: meta.appVersion,
                isFromOtherDevice,
            };
            setBackupInfo(info);

            // Check if backup is newer than local last sync time
            const lastLocalSync = localStorage.getItem(LAST_SYNC_KEY);
            const dismissedTime = localStorage.getItem(DISMISSED_BACKUP_TIME_KEY);

            const isNewerThanLocal = !lastLocalSync || new Date(meta.modifiedTime).getTime() > new Date(lastLocalSync).getTime() + 1000;
            const notDismissed = !dismissedTime || new Date(meta.modifiedTime).getTime() > new Date(dismissedTime).getTime();

            if (isNewerThanLocal && notDismissed) {
                setNewerBackupAvailable(true);
            } else if (!isNewerThanLocal) {
                setNewerBackupAvailable(false);
            }

            return info;
        } catch (err: any) {
            console.warn('Could not check Google Drive backup on load:', err?.message);
            return null;
        }
    }, [currentDeviceId]);

    // On initial mount / app opening: check Drive for newer versions
    useEffect(() => {
        if (connected) {
            checkDriveBackup();
        }
    }, [connected, checkDriveBackup]);

    // Auto-sync debounced when word collection modifies
    useEffect(() => {
        if (isFirstMount.current) {
            isFirstMount.current = false;
            return;
        }
        if (!connected) return;

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

    const performSync = useCallback(async (wordsToSync: Word[]) => {
        setSyncStatus('syncing');
        setSyncError(null);
        try {
            const savedStates = JSON.parse(localStorage.getItem('vocabuilder_word_states') || '{}');
            const now = new Date().toISOString();
            const devId = getDeviceId();
            const devName = getDeviceName();

            await uploadBackup(
                {
                    exportedAt: now,
                    words: wordsToSync,
                    savedStates,
                    deviceId: devId,
                    deviceName: devName,
                    appVersion: '5.8.2',
                },
                {
                    deviceId: devId,
                    deviceName: devName,
                    wordCount: wordsToSync.length,
                    appVersion: '5.8.2',
                }
            );

            setLastSyncTime(now);
            localStorage.setItem(LAST_SYNC_KEY, now);
            localStorage.removeItem(DISMISSED_BACKUP_TIME_KEY);
            setNewerBackupAvailable(false);
            setBackupInfo({
                modifiedTime: now,
                wordCount: wordsToSync.length,
                deviceId: devId,
                deviceName: devName,
                exportedAt: now,
                appVersion: '5.8.2',
                isFromOtherDevice: false,
            });
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
            await checkDriveBackup();
        } catch (err: any) {
            setSyncError(err?.message || 'Connection failed');
        }
    }, [checkDriveBackup]);

    const disconnect = useCallback(() => {
        driveSignOut();
        setConnected(false);
        setSyncStatus('idle');
        setSyncError(null);
        setBackupInfo(null);
        setNewerBackupAvailable(false);
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
            localStorage.removeItem(DISMISSED_BACKUP_TIME_KEY);
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
            connected,
            syncStatus,
            lastSyncTime,
            newerBackupAvailable,
            syncError,
            backupInfo,
            currentDeviceId,
            currentDeviceName,
            updateDeviceName,
            connect,
            disconnect,
            syncNow,
            restoreFromBackup,
            checkForUpdates: checkDriveBackup,
            dismissNewerBackupNotification,
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

