import packageJson from './package.json';

/**
 * Single source of truth for the application version.
 * Synchronized with package.json automatically on every commit.
 */
export const APP_VERSION = packageJson.version;
