#!/usr/bin/env node

/**
 * scripts/bump-version.js
 * Automatically bumps the patch version in package.json, package-lock.json,
 * and updates cache versioning in public/sw.js.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const packageJsonPath = path.join(rootDir, 'package.json');
const packageLockJsonPath = path.join(rootDir, 'package-lock.json');
const swJsPath = path.join(rootDir, 'public', 'sw.js');

// 1. Read package.json
const pkgRaw = fs.readFileSync(packageJsonPath, 'utf-8');
const pkg = JSON.parse(pkgRaw);

const currentVersion = pkg.version || '1.0.0';
const parts = currentVersion.split('.').map(Number);
if (parts.length !== 3 || parts.some(isNaN)) {
    console.error(`Invalid semver version: ${currentVersion}`);
    process.exit(1);
}

// Increment patch version
parts[2] += 1;
const newVersion = parts.join('.');

pkg.version = newVersion;
fs.writeFileSync(packageJsonPath, JSON.stringify(pkg, null, 2) + '\n', 'utf-8');
console.log(`[bump-version] Bumped package.json: ${currentVersion} -> ${newVersion}`);

// 2. Update package-lock.json if present
if (fs.existsSync(packageLockJsonPath)) {
    try {
        const lockRaw = fs.readFileSync(packageLockJsonPath, 'utf-8');
        const lock = JSON.parse(lockRaw);
        lock.version = newVersion;
        if (lock.packages && lock.packages['']) {
            lock.packages[''].version = newVersion;
        }
        fs.writeFileSync(packageLockJsonPath, JSON.stringify(lock, null, 2) + '\n', 'utf-8');
        console.log(`[bump-version] Updated package-lock.json version to ${newVersion}`);
    } catch (e) {
        console.warn(`[bump-version] Warning updating package-lock.json:`, e.message);
    }
}

// 3. Update public/sw.js cache name if present
if (fs.existsSync(swJsPath)) {
    try {
        const swContent = fs.readFileSync(swJsPath, 'utf-8');
        const updatedSw = swContent.replace(
            /vocab-builder-cache-v[0-9.]+/g,
            `vocab-builder-cache-v${newVersion}`
        );
        if (updatedSw !== swContent) {
            fs.writeFileSync(swJsPath, updatedSw, 'utf-8');
            console.log(`[bump-version] Updated public/sw.js cache version to v${newVersion}`);
        }
    } catch (e) {
        console.warn(`[bump-version] Warning updating public/sw.js:`, e.message);
    }
}

process.stdout.write(newVersion);
