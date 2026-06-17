# 客户端登录门禁设计

日期：2026-06-17
状态：已确认，待实现计划

## 背景

客户端需要在完成安装后先要求用户登录。主应用必须登录后才可使用。登录界面复用安装向导视觉，但登录发生在已安装 app 内，安装器只负责安装和启动正式 app，不接触账号凭证或 session。

本设计基于现有 Electron 桌面端结构：

- `apps/desktop/src/main/bootstrap.ts` 负责主进程启动编排。
- `apps/desktop/src/main/windows/createHomeWindow.ts` 创建首页窗口。
- `apps/desktop/src/main/windows/createInstallerWindow.ts` 创建当前安装向导窗口。
- `apps/desktop/src/preload/voiceApi.ts` 暴露 `window.voiceAI` API。
- `apps/desktop/src/renderer/main.tsx` 按 hash 分发首页、安装器、卸载器、悬浮窗等页面。
- `apps/desktop/src/renderer/features/installer/InstallerPage.tsx` 是现有安装器页面，可作为视觉参考，但不承载正式登录逻辑。

外部详细设计参考：

- `D:/workspace/AOA/doc/01-项目工程/04-设计/02-系统设计/详细设计/客户端登录功能-详细设计.md`

## 已确认决策

- 门禁模式：严格门禁。未登录时只允许登录窗口；首页、悬浮窗、托盘业务入口、全局快捷键、语音请求都不启动。
- 登录方式：邮箱验证码登录和 LDAP/AD 登录都实现。
- 后端接口：正式认证接口已可用，首期直接接真实 HTTP，不以 mock 为主路径。
- 离线启动：本地有 refresh token 但网络不可达、无法刷新时，停在登录窗口并提示网络异常，不允许离线进入主应用。
- UI 形态：复用安装向导视觉壳，调整成“登录 → 设置 → 体验 → 就绪”的向导。
- 进程边界：登录在已安装 app 内完成，安装器进程不处理账号凭证、不保存 token、不转移 session。

## 推荐方案

采用“主进程 AuthService + 独立 LoginSetupPage”的方案。

正式 app 启动时先进入登录门禁。主进程读取本地配置和 `installationId`，匿名 `bootstrap` 可 best-effort 并行执行；同时 `AuthService.restoreSession()` 判断是否存在有效登录态。只有恢复成功时才继续启动主应用。未登录、refresh 过期、refresh 失败、网络不可达时，打开 `#/login-setup` 登录向导。

登录成功后，主进程保存 session，广播认证状态变化，关闭登录向导，再创建首页、托盘、悬浮窗 follower、全局快捷键和业务服务。用户主动退出、会话失效、业务请求 401 且刷新失败时，主进程清理 session，关闭或隐藏业务窗口，重新打开登录向导。

不采用把登录塞进 `InstallerPage` 的方案，因为安装状态和认证状态边界会混在一起；也不采用首页内登录覆盖层，因为首页副作用会提前发生，不满足严格门禁。

## 启动编排

新增启动入口分层：

1. `startApplication()`：现有 app ready 后的总入口，负责读取配置、创建基础依赖。
2. `runStartupGate()`：执行匿名 bootstrap 和 `AuthService.restoreSession()`。
3. `showLoginSetupWindow()`：未认证时创建登录向导窗口。
4. `startAuthenticatedApp()`：认证成功后创建首页、托盘、悬浮窗、快捷键和语音相关服务。
5. `returnToLogin()`：退出或会话失效时停止业务能力并回到登录向导。

门禁规则：

- `restoreSession()` 返回 `authenticated` 前，不创建首页窗口。
- 认证前不注册全局录音快捷键。
- 认证前不创建或跟随悬浮窗。
- 认证前不发起需要账号身份的 HTTP/WebSocket 请求。
- 匿名 bootstrap 失败不阻止显示登录窗口。
- refresh 因网络失败无法完成时，返回 `offline`，保留本地 session，但停在登录窗口等待重试。

## AuthService

新增 `apps/desktop/src/main/auth/` 模块。

职责：

- 调用后端认证接口。
- 保存、读取、刷新、清理本地 session。
- LDAP 登录前获取和缓存登录公钥。
- 在主进程内加密 LDAP 密码。
- 对业务请求提供 access token。
- 合并并发 refresh，避免重复刷新。
- 将 HTTP、网络、本地存储错误标准化为 renderer 可展示的认证错误。
- 广播 `voice:auth:session-changed`。

依赖：

- `electron.safeStorage`
- `electron-store`
- `settings.backend.baseUrl`
- `installationId`
- `app.getVersion()`
- `os.hostname()`

主要方法：

```ts
interface AuthService {
  getSessionSnapshot(): AuthSessionSnapshot;
  restoreSession(): Promise<AuthSessionSnapshot>;
  sendEmailCode(input: SendEmailCodeInput): Promise<SendEmailCodeResult>;
  loginWithEmailCode(input: EmailCodeLoginInput): Promise<AuthSessionSnapshot>;
  loginWithLdap(input: LdapLoginInput): Promise<AuthSessionSnapshot>;
  logout(): Promise<AuthSessionSnapshot>;
  getAccessTokenForRequest(): Promise<string>;
  clearSession(reason: AuthSessionReason): Promise<AuthSessionSnapshot>;
}
```

`getAccessTokenForRequest()` 内部判断 access token 是否过期。过期时使用 refresh token 刷新，并用单飞锁合并并发刷新。刷新成功后更新内存和安全存储；刷新永久失败后清理 session 并广播过期。

## Preload 与 IPC API

`window.voiceAI` 增加认证 API。renderer 只拿 session 快照，不拿 token。

```ts
getAuthSession(): Promise<AuthSessionSnapshot>;
sendEmailCode(input: SendEmailCodeInput): Promise<SendEmailCodeResult>;
loginWithEmailCode(input: EmailCodeLoginInput): Promise<AuthSessionSnapshot>;
loginWithLdap(input: LdapLoginInput): Promise<AuthSessionSnapshot>;
logout(): Promise<AuthSessionSnapshot>;
onAuthSessionChanged(callback: (snapshot: AuthSessionSnapshot) => void): () => void;
```

IPC channel 使用现有命名风格：

- `voice:auth:get-session`
- `voice:auth:send-email-code`
- `voice:auth:login-email-code`
- `voice:auth:login-ldap`
- `voice:auth:logout`
- `voice:auth:session-changed`

`AuthSessionSnapshot`：

```ts
type AuthSessionStatus =
  | "authenticated"
  | "unauthenticated"
  | "expired"
  | "offline"
  | "error";

interface AuthSessionSnapshot {
  status: AuthSessionStatus;
  user?: {
    id: string;
    displayName: string;
    email?: string;
    authType: "email_code" | "ldap";
  };
  featureFlags?: Record<string, boolean>;
  message?: string;
}
```

## 后端接口

按登录详细设计接正式后端：

- `POST /aoa_api/auth/email-code/send`
- `POST /aoa_api/auth/login/email-code`
- `GET /aoa_api/auth/crypto/public-key`
- `POST /aoa_api/auth/login/ldap`
- `POST /aoa_api/auth/refresh`
- `POST /aoa_api/auth/logout`

所有认证请求携带设备上下文：

- `installationId`
- `deviceName`
- `platform: "windows"`
- `appVersion`
- `locale`

邮箱验证码登录：

- renderer 校验邮箱格式和 6 位数字验证码。
- 发送验证码成功后进入倒计时。倒计时优先使用后端返回值；后端未返回时使用默认值。
- 登录成功后主进程保存 session，renderer 清空验证码。

LDAP/AD 登录：

- renderer 只做账号和密码非空校验。
- 密码只通过 IPC 进入主进程内存。
- 主进程获取公钥，按 RSA-OAEP(SHA-256) 加密 `{ password, nonce, timestamp }`。
- 收到 `key_expired` 时重新获取公钥并重试一次。
- 密码不落盘、不进日志、不进入 preload 返回值。

## Session 存储

存储原则：

- `accessToken` 优先只保存在主进程内存。
- `refreshToken` 使用 `safeStorage` 加密后写入 `electron-store`。
- `user`、`expiresAt`、`refreshExpiresAt` 可持久化，用于启动恢复判断和显示。
- LDAP 密码不保存。
- 邮箱验证码不保存。

若 `safeStorage.isEncryptionAvailable()` 返回 false：

- 禁用“记住登录”。
- 登录页提示当前系统不支持安全保存登录状态。
- 本次登录仍可使用内存 session；重启后需要重新登录。

logout 行为：

- 调用后端 logout。
- 无论后端 logout 成功或失败，都清理本地 session。
- 清理后广播 `unauthenticated` 并回到登录向导。

## LoginSetupPage

新增 renderer 页面，hash 为 `#/login-setup`。窗口视觉复用安装向导：

- 灰色背景。
- 无边框标题栏。
- 标题：`Voice Assistant 安装向导`。
- 顶部步骤：`登录 → 设置 → 体验 → 就绪`。
- 主体白色面板。
- 底部右侧主按钮。

步骤规则：

1. 登录：展示邮箱验证码和 LDAP/AD 两种方式。必须登录成功才能进入后续步骤。
2. 设置：展示轻量初始化设置，例如语言、主题、开机启动、快捷方式等。具体字段优先复用现有设置模型。
3. 体验：展示快捷键和麦克风权限提示，执行轻量检查。
4. 就绪：按钮“进入主应用”，通知主进程关闭向导并启动首页。

首次启动和失效重登区别：

- 首次安装后启动：登录成功后继续走设置、体验、就绪。
- 非首次启动但 session 失效：打开同一页面，但只显示登录步骤；登录成功后直接进入首页，除非本地 `setupCompleted=false`。

## 错误处理

renderer 负责即时输入校验：

- 邮箱格式合法。
- 验证码为 6 位数字。
- LDAP 账号非空。
- LDAP 密码非空。

主进程负责错误标准化：

- 验证码错误。
- 账号或密码错误。
- 账号被禁用。
- 请求过于频繁。
- 网络异常。
- 会话已过期。
- 安全存储不可用。
- 服务端异常。

启动 restore 时：

- 无 refresh token：`unauthenticated`，显示登录。
- refresh 已过期：清 session，显示登录。
- 网络不可达：`offline`，停在登录窗口并提示网络异常。
- refresh 401 或复用检测：清 session，显示登录。
- refresh 成功：进入主应用。

业务请求时：

- access token 过期：自动 refresh 后重试请求。
- 业务 401：触发 refresh 并重试一次。
- refresh 失败：清 session，关闭业务能力，回登录向导。

## 安全要求

- token 不出主进程。
- preload 不暴露 token、refresh token、公钥缓存或安全存储细节。
- renderer 不解析服务端敏感错误结构，只显示标准文案。
- LDAP 密码不落盘、不缓存、不写日志。
- 邮箱验证码提交后即清理。
- 日志需要经过现有 sanitizer，过滤 `accessToken`、`refreshToken`、`password`、`code`、`Authorization`。
- 安装器进程不接触认证数据。

## 测试与验证

遵循项目规则：生成或修改前端代码时，默认不创建或更新前端测试文件；只有用户明确要求时才添加前端测试。

需要增加或更新主进程测试：

- AuthService session 存储和恢复。
- `safeStorage` 可用和不可用分支。
- refresh 成功、过期、网络失败、复用检测。
- refresh 单飞锁。
- logout 无论后端成功失败都清本地。
- 认证错误映射。
- 启动门禁：未登录不创建首页、悬浮窗、全局快捷键。
- 登录成功后启动主应用。

建议验证命令：

```bash
pnpm --filter @voice/desktop typecheck
pnpm --filter @voice/desktop test -- auth
pnpm --filter @voice/desktop test -- bootstrap
```

若项目没有按过滤参数拆分测试，使用最近等价的 vitest 目标命令。

## 实施边界

本设计覆盖客户端登录门禁、认证 IPC、主进程 session 管理、登录向导 UI 和主应用解锁流程。

不纳入本轮：

- 服务端认证接口实现。
- 管理端用户管理。
- OAuth、短信验证码、注册、忘记密码。
- 细粒度 RBAC。
- 前端自动化测试。
