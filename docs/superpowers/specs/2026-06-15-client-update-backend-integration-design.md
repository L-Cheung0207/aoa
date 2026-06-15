# 客户端升级对接后端设计

## 目标

将现有 mock 升级流程接入后端版本管理契约。后端 `GET /appVersion/check` 接口作为更新可用性、版本元数据和更新类型的可信来源。Electron 主进程仍是唯一允许触发更新检查和重启安装的层。

## 范围

- 将仅由渲染进程驱动的 mock 更新状态改为 IPC 驱动的真实更新状态。
- 新增后端版本检查能力：`GET /appVersion/check?platform={platform}&currentVersion={currentVersion}`。
- 保留 `electron-updater` 作为打包应用的下载和安装机制。
- 保留开发环境假更新能力，仅用于手动验证 UI。
- 展示手动检查状态：检查中、已是最新、发现更新、错误、已就绪。
- 通过 IPC 传递后端元数据：版本号、更新类型、更新说明、安装包大小、安装包名称。

不在本次范围内：

- 后台版本管理页面和上传流程。
- 自定义流式下载和断点续传实现。
- WebSocket `version:update-available` 通知处理。
- 前端测试文件；按项目规则，除非单独要求，不新增前端测试。

## 架构

主进程负责升级编排。

`createUpdateService()` 接收一个轻量后端版本客户端和应用上下文：

- `platform`：从 Electron `process.platform` 映射为 `WINDOWS`、`MAC` 或 `LINUX`。
- `currentVersion`：来自 `app.getVersion()`。
- `isPackaged`：沿用现有打包/运行时判断。
- `autoUpdater`：沿用现有 `electron-updater` 适配器。

检查流程：

1. 手动或自动触发调用 `UpdateService.checkForUpdates()`。
2. 生产打包环境下，服务调用后端 `/appVersion/check`。
3. 如果 `hasUpdate=false`，返回 `up-to-date`。
4. 如果 `hasUpdate=true`，校验后端必需字段，返回带元数据的 `available`。
5. 打包环境下调用 `autoUpdater.checkForUpdates()`，让现有自动下载和 `update-downloaded` 事件继续工作。
6. `update-downloaded` 触发后，广播带版本元数据的 `voice:update-ready`。

开发环境行为保持显式：

- 自动启动检查返回 `disabled`，不调用后端或 updater。
- 手动检查可按 IPC 请求使用现有假更新行为。

## 组件

### 后端版本客户端

新增聚焦的客户端模块，负责 HTTP 请求并规范化 API 响应。它应从运行时配置或环境变量读取 base URL 或完整接口来源；如果没有配置后端更新端点，则返回清晰的 disabled/error 结果。

预期响应数据：

- `hasUpdate`
- `versionCode`
- `phase`
- `updateType`
- `updateLog`
- `downloadUrl`
- `packageSize`
- `packageName`

后端检查接口预期只返回 `RELEASE` 阶段版本。若 `hasUpdate=true` 但缺少必需字段，客户端按服务配置异常处理。

### 更新服务

`UpdateCheckResult` 从当前最小 updater 结果扩展为包含后端元数据：

- `disabled`
- `up-to-date`
- `available`
- `ready`
- `error`

`available` 包含：

- `version`
- `updateType`
- `updateLog`
- `packageSize`
- `packageName`

服务同时跟踪当前状态，确保重复检查复用进行中的 Promise 或当前 ready 状态。

### IPC 与 Preload

保留现有通道：

- `voice:check-for-updates`
- `voice:restart-to-update`
- `voice:update-ready`

只扩展 payload/result 类型。渲染进程继续调用 `window.voiceAI.checkForUpdates()` 和 `window.voiceAI.restartToUpdate()`。

### 渲染进程更新弹窗

当前 `MockUpdateDialog` 演进为真实更新弹窗，或新增 `UpdateDialog` 替换它并复用样式。

打开弹窗后立即触发 `checkForUpdates()` 并展示：

- `checking`：请求进行中。
- `latest`：后端报告无更新。
- `available`：后端报告有更新；展示版本、类型、更新说明、文件名、文件大小。
- `error`：后端、updater 或 IPC 失败；展示重试入口。
- `ready`：收到 `voice:update-ready`；展示重启按钮。

按更新类型处理：

- `FORCED`：available 和 ready 状态下不允许关闭或跳过。
- `RECOMMENDED`：允许“本次不提醒”。
- `OPTIONAL`：允许“跳过此版本”，按版本和平台本地存储。

## 数据流

手动检查：

1. 用户从首页、关于页或托盘点击“检查更新”。
2. 渲染进程打开弹窗并调用 `window.voiceAI.checkForUpdates()`。
3. 主进程调用后端版本检查。
4. 主进程返回规范化结果；需要时启动 updater 检查。
5. 渲染进程展示已最新、发现更新或错误。
6. 随后 `voice:update-ready` 将弹窗切到 ready 状态。
7. 用户点击重启，渲染进程调用 `restartToUpdate()`，主进程调用 `quitAndInstall(false, true)`。

自动启动检查：

1. Bootstrap 调用 `updateService.checkForUpdates()`。
2. 开发环境返回 `disabled`。
3. 打包生产环境调用后端并静默触发 updater。
4. 错误仅记录日志。
5. 下载就绪后打开关于页并展示 ready 提示，沿用现有行为。

## 错误处理

- 后端超时、500、手动检查：返回带 message 的 `error`，允许重试。
- 后端超时、500、自动检查：只记录日志，不打断用户。
- 非法 platform/currentVersion：返回 `error` 并记录应用上下文。
- `hasUpdate=true` 但缺少 `downloadUrl` 或 `versionCode`：返回配置异常错误。
- 后端已报告 available，但 `autoUpdater.checkForUpdates()` 失败：保留后端 available 元数据，同时记录 updater 失败；手动检查场景展示可重试。
- `restartToUpdate()` 失败：向渲染进程抛出错误，允许展示重试或稍后处理。

## 测试

后端版本客户端和主进程更新服务需要测试，因为行为变更集中在主进程逻辑。

必需测试：

- 后端 `hasUpdate=false` 映射为 `up-to-date`。
- 后端 `hasUpdate=true` 映射为带元数据的 `available`。
- `hasUpdate=true` 但缺少必需字段时拒绝。
- 后端请求失败映射为 `error`。
- 开发环境自动检查保持 disabled。
- 保留手动开发假更新。
- 仅在打包环境且后端报告有更新时调用 `autoUpdater.checkForUpdates()`。
- 并发检查复用同一个 in-flight Promise。

除非单独要求，不新增前端测试文件。

## 迁移说明

- 现有 `UpdateReadyDialog` 行为继续兼容 `voice:update-ready`。
- 现有托盘、首页、关于页入口继续使用同一个渲染进程入口。
- 现有 installer 相关用户改动与本任务无关，不触碰。
