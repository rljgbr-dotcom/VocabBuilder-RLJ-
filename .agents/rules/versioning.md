# Automatic Versioning & Commit Protocol

1. **Version Update on Every Commit**:
   - The application version must be bumped (incrementing patch version) for every single commit.
   - The automated pre-commit hook (`.githooks/pre-commit` via `scripts/bump-version.js`) automatically increments the patch version in `package.json`, `package-lock.json`, and `public/sw.js`.
   - The code imports `APP_VERSION` from `version.ts` (which sources from `package.json`).
   - If committing code manually or programmatically, ensure `package.json`, `package-lock.json`, `public/sw.js`, and `version.ts` are included.

2. **Mandatory Reporting in Summary**:
   - In the summary message returned to the user after any task involving a commit or code update, ALWAYS explicitly state the updated version number (e.g., "Updated to version vX.Y.Z").
