/**
 * deviceUtils.ts
 *
 * Utilities for identifying and naming the current device across app sessions.
 * Allows users to recognize which device created or uploaded cloud backups.
 */

const DEVICE_ID_KEY = 'vb_device_id';
const DEVICE_NAME_KEY = 'vb_device_name';

/** Detects a sensible default name for the user's current device / browser */
export function getDefaultDeviceName(): string {
    const userAgent = navigator.userAgent;

    let os = 'Unknown Device';
    if (/Windows NT 10.0/i.test(userAgent)) os = 'Windows PC';
    else if (/Windows/i.test(userAgent)) os = 'Windows PC';
    else if (/Macintosh|Mac OS X/i.test(userAgent)) os = 'Mac';
    else if (/iPhone/i.test(userAgent)) os = 'iPhone';
    else if (/iPad/i.test(userAgent)) os = 'iPad';
    else if (/Android/i.test(userAgent)) {
        os = /Mobile/i.test(userAgent) ? 'Android Phone' : 'Android Tablet';
    } else if (/Linux/i.test(userAgent)) os = 'Linux PC';

    let browser = '';
    if (/Edg\//i.test(userAgent)) browser = 'Edge';
    else if (/Chrome\//i.test(userAgent) && !/Edg\//i.test(userAgent)) browser = 'Chrome';
    else if (/Firefox\//i.test(userAgent)) browser = 'Firefox';
    else if (/Safari\//i.test(userAgent) && !/Chrome\//i.test(userAgent)) browser = 'Safari';

    return browser ? `${os} (${browser})` : os;
}

/** Returns the unique stable ID for this device installation (persisted in localStorage) */
export function getDeviceId(): string {
    let id = localStorage.getItem(DEVICE_ID_KEY);
    if (!id) {
        id = typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID()
            : 'dev_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now();
        localStorage.setItem(DEVICE_ID_KEY, id);
    }
    return id;
}

/** Returns the user-configurable device name, defaulting to browser/OS auto-detection */
export function getDeviceName(): string {
    const custom = localStorage.getItem(DEVICE_NAME_KEY);
    if (custom && custom.trim()) {
        return custom.trim();
    }
    const defaultName = getDefaultDeviceName();
    localStorage.setItem(DEVICE_NAME_KEY, defaultName);
    return defaultName;
}

/** Allows user to update the nickname of their device (e.g. "Work Laptop", "Home PC", "Living Room iPad") */
export function setDeviceName(name: string): void {
    const trimmed = name.trim();
    if (trimmed) {
        localStorage.setItem(DEVICE_NAME_KEY, trimmed);
    } else {
        localStorage.removeItem(DEVICE_NAME_KEY);
    }
}
