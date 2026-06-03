# Mock Update Flow Design

## Goal

Complete the current "check updates" entry points with a mock update experience that can later be wired to a real Electron updater.

## Scope

- The home footer, about page action, and tray menu should all open the same update flow.
- The flow includes: checking, update available, already latest, installing with progress, and completed.
- The default mock path should find version `v1.2.1`, show release notes, simulate install progress, and finish.
- The "already latest" state should exist in the UI so the real updater can return it later.
- No frontend test files are added unless explicitly requested.

## Architecture

The renderer owns a focused mock update dialog for now. `HomeShell` tracks whether the dialog is open and passes one shared `openUpdateDialog` handler to home and about entry points. Tray already opens the home window's about section; the about action can then launch the same dialog.

The component contains a small state machine and mock service constants. Real updater integration should replace the mock check/install timers with preload IPC methods while keeping the dialog states and data shape.

## UI

The dialog is a full-window overlay matching the provided dark update screens. It uses centered layouts for checking, latest, installing, and completed states, plus a release-note layout for the available update state.

## Verification

- Typecheck the desktop package.
- Run the app and visually verify the five states from the update entry point.
