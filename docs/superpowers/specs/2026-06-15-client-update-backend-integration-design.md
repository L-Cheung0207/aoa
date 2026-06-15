# Client Update Backend Integration Design

## Goal

Wire the existing mock update flow to the backend version-management contract. The backend `GET /appVersion/check` endpoint becomes the trusted source for update availability, metadata, and update type. The Electron main process remains the only layer allowed to trigger updater checks and restart installation.

## Scope

- Replace renderer-only mock update state with IPC-driven update state.
- Add backend version check support for `GET /appVersion/check?platform={platform}&currentVersion={currentVersion}`.
- Keep `electron-updater` as the packaged-app download and install mechanism.
- Preserve development fake update behavior for manual UI validation only.
- Surface manual check states: checking, latest, available, error, and ready.
- Carry backend metadata through IPC: version code, update type, release notes, package size, and package name.

Out of scope:

- Backend management pages and upload flows.
- Custom stream download and resumable download implementation.
- WebSocket `version:update-available` notification handling.
- Frontend test files, per project rule, unless requested separately.

## Architecture

The main process owns update orchestration.

`createUpdateService()` will accept a small backend version client plus app context:

- `platform`: mapped from Electron `process.platform` to `WINDOWS`, `MAC`, or `LINUX`.
- `currentVersion`: from `app.getVersion()`.
- `isPackaged`: existing packaged/runtime guard.
- `autoUpdater`: existing `electron-updater` adapter.

The check flow:

1. Manual or automatic trigger calls `UpdateService.checkForUpdates()`.
2. In production packaged mode, the service calls backend `/appVersion/check`.
3. If `hasUpdate=false`, return `up-to-date`.
4. If `hasUpdate=true`, validate required backend fields and return `available` with metadata.
5. In packaged mode, call `autoUpdater.checkForUpdates()` so existing auto-download and `update-downloaded` events continue to work.
6. When `update-downloaded` fires, broadcast `voice:update-ready` with version metadata.

Development behavior stays explicit:

- Automatic startup checks return `disabled` and do not call backend or updater.
- Manual checks may use existing fake update behavior when requested by IPC.

## Components

### Backend Version Client

A focused client module performs the HTTP request and normalizes the API response. It should accept a base URL or full endpoint source from runtime config/env, with a clear disabled/error result if no backend update endpoint is configured.

Expected response data:

- `hasUpdate`
- `versionCode`
- `phase`
- `updateType`
- `updateLog`
- `downloadUrl`
- `packageSize`
- `packageName`

Only `RELEASE` phase responses are expected from the backend check endpoint. The client treats missing required fields for `hasUpdate=true` as a configuration error.

### Update Service

`UpdateCheckResult` expands from the current minimal updater result to include backend metadata:

- `disabled`
- `up-to-date`
- `available`
- `ready`
- `error`

For `available`, include:

- `version`
- `updateType`
- `updateLog`
- `packageSize`
- `packageName`

The service also tracks current state so duplicate checks reuse the in-flight promise or current ready state.

### IPC And Preload

Keep existing channels:

- `voice:check-for-updates`
- `voice:restart-to-update`
- `voice:update-ready`

Only widen the payload/result types. Renderer code continues to call `window.voiceAI.checkForUpdates()` and `window.voiceAI.restartToUpdate()`.

### Renderer Update Dialog

The current `MockUpdateDialog` becomes a real update dialog, or a new `UpdateDialog` replaces it while reusing styles.

Opening the dialog immediately triggers `checkForUpdates()` and displays:

- `checking`: request in progress.
- `latest`: backend reports no update.
- `available`: backend reports update; show version, type, release notes, file name, and file size.
- `error`: backend/updater/IPC failed; show retry.
- `ready`: `voice:update-ready` received; show restart button.

Rules by update type:

- `FORCED`: no close/skip in available or ready states.
- `RECOMMENDED`: allow "not this session".
- `OPTIONAL`: allow "skip this version", stored locally by version and platform.

## Data Flow

Manual check:

1. User clicks "Check for updates" from home/about/tray.
2. Renderer opens dialog and calls `window.voiceAI.checkForUpdates()`.
3. Main process calls backend version check.
4. Main process returns normalized result and starts updater check when applicable.
5. Renderer displays latest, available, or error.
6. Later `voice:update-ready` moves the dialog to ready state.
7. User clicks restart, renderer calls `restartToUpdate()`, main process calls `quitAndInstall(false, true)`.

Automatic startup check:

1. Bootstrap calls `updateService.checkForUpdates()`.
2. Development returns `disabled`.
3. Packaged production calls backend and updater silently.
4. Errors are logged only.
5. Download ready opens the about window with ready prompt, matching current behavior.

## Error Handling

- Backend timeout/500/manual: return `error` with message for retry.
- Backend timeout/500/automatic: log and do not interrupt user.
- Invalid platform/current version: return `error` and log app context.
- `hasUpdate=true` with missing `downloadUrl` or `versionCode`: return `error` with config-invalid message.
- `autoUpdater.checkForUpdates()` failure after backend says available: return `available` metadata if backend check succeeded, but also log updater failure and surface retry for manual checks.
- `restartToUpdate()` failure: propagate error so renderer can show retry/snooze.

## Testing

Backend version client and main update service need tests because behavior changes are in main process logic.

Required tests:

- maps backend `hasUpdate=false` to `up-to-date`.
- maps backend `hasUpdate=true` to `available` metadata.
- rejects `hasUpdate=true` with missing required fields.
- maps backend request failure to `error`.
- keeps development automatic checks disabled.
- preserves manual development fake update.
- calls `autoUpdater.checkForUpdates()` only when packaged and backend reports update.
- reuses in-flight check promise for concurrent checks.

No frontend test files unless separately requested.

## Migration Notes

- Existing `UpdateReadyDialog` behavior remains compatible with `voice:update-ready`.
- Existing tray/home/about entry points continue to use the same renderer entry.
- Existing user changes in installer files are unrelated and should not be touched.
