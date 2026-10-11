# Workspace Rules for VocabBuilder

## Versioning & Commit Protocol
- **Every Commit Must Update Version**: Every commit must increment the patch version (handled automatically by `.githooks/pre-commit` and `scripts/bump-version.js`).
- **Single Source of Truth**: The app version is defined in `package.json` and exported through `version.ts`. `App.tsx` and `GoogleDriveContext.tsx` import `APP_VERSION` from `version.ts`.
- **Mandatory Summary Statement**: In every summary message returned to the user, ALWAYS mention whether the version number has been updated and state the new version number (e.g. "Version updated to vX.Y.Z").
