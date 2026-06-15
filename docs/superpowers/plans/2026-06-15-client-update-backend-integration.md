# Client Update Backend Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 接入后端 `/appVersion/check`，让现有升级入口由真实后端检查和 Electron updater 事件驱动。

**Architecture:** 主进程新增后端版本检查客户端，`createUpdateService()` 先查后端，再按结果触发 `electron-updater`。IPC 只扩展现有 `voice:check-for-updates` 和 `voice:update-ready` 类型；渲染层复用现有更新弹窗样式，从 mock 定时器切换为真实 IPC 状态。

**Tech Stack:** Electron, React, TypeScript, Vitest, undici/electron-updater。

---

### Task 1: Backend Version Check Client

**Files:**
- Create: `apps/desktop/src/main/update/versionCheckClient.ts`
- Create: `apps/desktop/src/main/update/versionCheckClient.test.ts`

- [ ] **Step 1: Write failing tests**

Add tests for successful no-update, successful update, invalid update payload, missing endpoint, and network failure.

- [ ] **Step 2: Run tests to verify failure**

Run: `pnpm vitest run apps/desktop/src/main/update/versionCheckClient.test.ts`

Expected: fail because `versionCheckClient.ts` does not exist.

- [ ] **Step 3: Implement client**

Create `createHttpVersionCheckClient()` with injected `fetch`, endpoint normalization, response unwrapping from `{ data }`, required-field validation for `hasUpdate=true`, and error mapping.

- [ ] **Step 4: Verify tests pass**

Run: `pnpm vitest run apps/desktop/src/main/update/versionCheckClient.test.ts`

Expected: all client tests pass.

### Task 2: Update Service Uses Backend Check

**Files:**
- Modify: `apps/desktop/src/main/update/updateService.ts`
- Modify: `apps/desktop/src/main/update/updateService.test.ts`

- [ ] **Step 1: Write failing service tests**

Update existing tests so packaged checks use `versionCheckClient.check({ platform, currentVersion })`. Cover `up-to-date`, `available` metadata, missing required backend fields, backend failure, updater failure after backend available, in-flight reuse, development disabled, and manual development fake update.

- [ ] **Step 2: Run tests to verify failure**

Run: `pnpm vitest run apps/desktop/src/main/update/updateService.test.ts`

Expected: fail because `createUpdateService()` does not yet accept the backend client and app context.

- [ ] **Step 3: Implement update service changes**

Add update metadata types, inject `versionCheckClient`, `platform`, and `currentVersion`, track `lastReadyPayload`, preserve fake dev update, and call `autoUpdater.checkForUpdates()` only after backend reports an update.

- [ ] **Step 4: Verify tests pass**

Run: `pnpm vitest run apps/desktop/src/main/update/updateService.test.ts`

Expected: all update service tests pass.

### Task 3: Wire Main Process And IPC Types

**Files:**
- Modify: `apps/desktop/src/main/bootstrap.ts`
- Modify: `apps/desktop/src/preload/voiceApi.ts`
- Modify: `apps/desktop/src/main/ipc/ipcRoutes.test.ts`

- [ ] **Step 1: Wire backend endpoint config**

Use `process.env.AOA_VERSION_CHECK_URL` first, otherwise derive `/appVersion/check` from `AOA_BACKEND_BASE_URL` when present. Pass the resulting client into `createUpdateService()`.

- [ ] **Step 2: Expand preload result types**

Mirror `UpdateCheckResult`, `UpdateReadyPayload`, and update metadata fields in preload types so renderer can consume the new data.

- [ ] **Step 3: Adjust IPC tests**

Update update-related expectations in `ipcRoutes.test.ts` only if type shape requires it. Do not fix unrelated pre-existing `postprocess` baseline failure.

- [ ] **Step 4: Verify focused compile**

Run: `pnpm --filter @voice/desktop typecheck`

Expected: no TypeScript errors from update changes.

### Task 4: Replace Mock Flow With IPC-Driven Dialog

**Files:**
- Modify: `apps/desktop/src/renderer/features/update/MockUpdateDialog.tsx`
- Modify: `apps/desktop/src/renderer/features/update/mock-update-dialog.css`
- Modify: `apps/desktop/src/renderer/app/HomeShell.tsx`

- [ ] **Step 1: Rename behavior, not necessarily file**

Keep exports compatible but change `MockUpdateDialog` to call `window.voiceAI.checkForUpdates()` on open and render real states.

- [ ] **Step 2: Render backend metadata**

Show version, update type, release notes, package name, and formatted package size in available state. Show retry in error state and restart in ready state.

- [ ] **Step 3: Handle update type actions**

FORCED hides close/snooze, RECOMMENDED supports current-session close, OPTIONAL supports skip-version in localStorage.

- [ ] **Step 4: Wire ready payload**

`HomeShell` passes `voice:update-ready` payload into the dialog so duplicate ready events update the existing dialog instead of opening a separate toast-only prompt.

- [ ] **Step 5: Verify focused compile**

Run: `pnpm --filter @voice/desktop typecheck`

Expected: no TypeScript errors from renderer changes.

### Task 5: Final Verification

**Files:**
- All update files from previous tasks.

- [ ] **Step 1: Run focused tests**

Run: `pnpm vitest run apps/desktop/src/main/update/versionCheckClient.test.ts apps/desktop/src/main/update/updateService.test.ts`

Expected: all focused update tests pass.

- [ ] **Step 2: Run desktop typecheck**

Run: `pnpm --filter @voice/desktop typecheck`

Expected: no TypeScript errors.

- [ ] **Step 3: Check git diff**

Run: `git diff --stat`

Expected: only update integration files and the plan file changed.
