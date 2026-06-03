# Mock Update Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a mock update flow for the desktop app's check-update entry points.

**Architecture:** Add a renderer-only `MockUpdateDialog` with a small state machine and timer cleanup. Wire `HomeShell` home/about actions to open it, leaving main-process updater integration for a future IPC service.

**Tech Stack:** Electron, React 19, TypeScript, CSS.

---

### Task 1: Add Mock Update Dialog

**Files:**
- Create: `apps/desktop/src/renderer/features/update/MockUpdateDialog.tsx`
- Create: `apps/desktop/src/renderer/features/update/mock-update-dialog.css`

- [ ] **Step 1: Create the component**

Implement a React component with states `checking`, `available`, `latest`, `installing`, and `completed`. Use timers to move from checking to available, and to advance install progress to completion. Clear timers on unmount and close.

- [ ] **Step 2: Create the styles**

Style the overlay to match the provided dark update screens: centered content, checking ring, release notes, blue primary buttons, gray secondary buttons, and a progress bar.

### Task 2: Wire Existing Entry Points

**Files:**
- Modify: `apps/desktop/src/renderer/app/HomeShell.tsx`

- [ ] **Step 1: Import the component and CSS**

Import `MockUpdateDialog` from the new update feature.

- [ ] **Step 2: Add dialog state**

Add `updateDialogOpen` state and an `openUpdateDialog` callback.

- [ ] **Step 3: Replace placeholder update handlers**

Pass `openUpdateDialog` to `HomePage` and `AboutPage` so both current entry points open the same flow.

- [ ] **Step 4: Render the dialog**

Render `MockUpdateDialog` when `updateDialogOpen` is true and close it from the component's `onClose`.

### Task 3: Verify

**Files:**
- No test files.

- [ ] **Step 1: Typecheck**

Run: `pnpm --filter @voice/desktop typecheck`

Expected: TypeScript completes without errors from the update changes.

- [ ] **Step 2: Visual check**

Run the desktop dev server, open the home window, click "检查更新", and step through checking, available, installing, and completed states. Confirm the latest state is reachable by component state configuration for future real updater results.
