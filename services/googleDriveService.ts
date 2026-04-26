/**
 * googleDriveService.ts
 *
 * Handles all Google Drive interaction:
 *   - OAuth2 sign-in / sign-out via Google Identity Services (token model)
 *   - Upload backup to drive.appdata (hidden, private to this app)
 *   - Download latest backup
 *   - List backup metadata (last modified time)
 *
 * The backup file is always called "vocabbuilder_backup.json".
 * Only one copy is ever kept — each upload overwrites the previous one.
 */

const CLIENT_ID = '68462351446-u4st4fd101h00psjm8tfbaok94deqb9g.apps.googleusercontent.com';
const SCOPES = 'https://www.googleapis.com/auth/drive.appdata';
const BACKUP_FILENAME = 'vocabbuilder_backup.json';
const DRIVE_API = 'https://www.googleapis.com/drive/v3';
const UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3';
const TOKEN_STORAGE_KEY = 'gd_access_token';
const TOKEN_EXPIRY_KEY = 'gd_token_expiry';

// ── Token management ────────────────────────────────────────────────────────

let _tokenClient: any = null;
let _resolveToken: ((token: string) => void) | null = null;
let _rejectToken: ((err: any) => void) | null = null;

function saveToken(token: string, expiresInSeconds: number) {
    const expiry = Date.now() + expiresInSeconds * 1000 - 60_000; // 1 min buffer
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
    localStorage.setItem(TOKEN_EXPIRY_KEY, String(expiry));
}

function getStoredToken(): string | null {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    const expiry = Number(localStorage.getItem(TOKEN_EXPIRY_KEY) || 0);
    if (!token || Date.now() > expiry) return null;
    return token;
}

function clearToken() {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(TOKEN_EXPIRY_KEY);
}

/**
 * Returns a valid access token, prompting Google sign-in if needed.
 * Resolves with the token string, rejects on error/cancel.
 */
export async function getAccessToken(): Promise<string> {
    const stored = getStoredToken();
    if (stored) return stored;

    return new Promise((resolve, reject) => {
        _resolveToken = resolve;
        _rejectToken = reject;

        const google = (window as any).google;
        if (!google?.accounts?.oauth2) {
            reject(new Error('Google Identity Services not loaded yet. Please try again.'));
            return;
        }

        if (!_tokenClient) {
            _tokenClient = google.accounts.oauth2.initTokenClient({
                client_id: CLIENT_ID,
                scope: SCOPES,
                callback: (response: any) => {
                    if (response.error) {
                        clearToken();
                        _rejectToken?.(new Error(response.error_description || response.error));
                    } else {
                        saveToken(response.access_token, Number(response.expires_in || 3600));
                        _resolveToken?.(response.access_token);
                    }
                    _resolveToken = null;
                    _rejectToken = null;
                },
                error_callback: (err: any) => {
                    _rejectToken?.(new Error(err?.message || 'OAuth cancelled'));
                    _resolveToken = null;
                    _rejectToken = null;
                },
            });
        }

        _tokenClient.requestAccessToken({ prompt: '' });
    });
}

/**
 * Signs the user out by revoking their token.
 */
export async function signOut(): Promise<void> {
    const token = getStoredToken();
    clearToken();
    _tokenClient = null;

    if (token) {
        const google = (window as any).google;
        google?.accounts?.oauth2?.revoke(token);
    }
}

/** Returns true if the user currently has a valid token in session. */
export function isSignedIn(): boolean {
    return getStoredToken() !== null;
}

// ── Drive API helpers ───────────────────────────────────────────────────────

async function driveRequest(url: string, options: RequestInit, token: string): Promise<Response> {
    return fetch(url, {
        ...options,
        headers: {
            ...(options.headers || {}),
            Authorization: `Bearer ${token}`,
        },
    });
}

/**
 * Finds the file ID of our backup file in appDataFolder, or null if not found.
 */
async function findBackupFileId(token: string): Promise<string | null> {
    const res = await driveRequest(
        `${DRIVE_API}/files?spaces=appDataFolder&fields=files(id,name,modifiedTime)&q=name='${BACKUP_FILENAME}'`,
        { method: 'GET' },
        token
    );
    if (!res.ok) throw new Error(`Drive list error: ${res.status}`);
    const data = await res.json();
    return data.files?.[0]?.id ?? null;
}

// ── Public API ──────────────────────────────────────────────────────────────

export interface BackupMetadata {
    fileId: string;
    modifiedTime: string; // ISO string
}

/**
 * Uploads the backup JSON to Google Drive (create or update).
 */
export async function uploadBackup(payload: object): Promise<void> {
    const token = await getAccessToken();
    const json = JSON.stringify(payload);
    const blob = new Blob([json], { type: 'application/json' });

    const existingId = await findBackupFileId(token);

    if (existingId) {
        // PATCH — update existing file content
        const res = await driveRequest(
            `${UPLOAD_API}/files/${existingId}?uploadType=media`,
            { method: 'PATCH', body: blob, headers: { 'Content-Type': 'application/json' } },
            token
        );
        if (!res.ok) throw new Error(`Drive update error: ${res.status}`);
    } else {
        // POST — create new file in appDataFolder
        const metadata = { name: BACKUP_FILENAME, parents: ['appDataFolder'] };
        const form = new FormData();
        form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
        form.append('file', blob);
        const res = await driveRequest(
            `${UPLOAD_API}/files?uploadType=multipart`,
            { method: 'POST', body: form },
            token
        );
        if (!res.ok) throw new Error(`Drive create error: ${res.status}`);
    }
}

/**
 * Downloads and parses the latest backup from Google Drive.
 * Returns null if no backup exists yet.
 */
export async function downloadBackup(): Promise<any | null> {
    const token = await getAccessToken();
    const fileId = await findBackupFileId(token);
    if (!fileId) return null;

    const res = await driveRequest(
        `${DRIVE_API}/files/${fileId}?alt=media`,
        { method: 'GET' },
        token
    );
    if (!res.ok) throw new Error(`Drive download error: ${res.status}`);
    return res.json();
}

/**
 * Gets metadata about the backup file (last modified time).
 * Returns null if no backup exists.
 */
export async function getBackupMetadata(): Promise<BackupMetadata | null> {
    const token = await getAccessToken();
    const res = await driveRequest(
        `${DRIVE_API}/files?spaces=appDataFolder&fields=files(id,name,modifiedTime)&q=name='${BACKUP_FILENAME}'`,
        { method: 'GET' },
        token
    );
    if (!res.ok) throw new Error(`Drive list error: ${res.status}`);
    const data = await res.json();
    const file = data.files?.[0];
    if (!file) return null;
    return { fileId: file.id, modifiedTime: file.modifiedTime };
}
