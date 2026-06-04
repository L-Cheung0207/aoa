# Java 透明 WebSocket 网关
> 客户端与 Java 网关之间沿用现有 ASR WebSocket JSON 协议，Java 原样转发至上游 ASR。  
> 基于 `DefaultTranscriptionProvider`、`MainTranscriptionService` 整理。

---

## 1. 架构

```
Renderer → IPC → MainTranscriptionService → DefaultTranscriptionProvider → Java WSS → ASR WebSocket
```

- 客户端 **WebSocket 消息体格式不变**
- 配置变更：`settings.ws.servers[].url` 指向 Java 网关地址
- 可选：握手阶段增加 JWT / `Authorization` Header

---

## 2. 连接与传输

| 项               | 说明                                                          |
| ---------------- | ------------------------------------------------------------- |
| 协议             | WebSocket（WSS）                                              |
| 消息编码         | UTF-8 JSON 字符串，每条消息一次 `send`                        |
| 客户端连接地址   | 配置中的 Java 网关 URL，例如 `wss://your-java-host/asr/ws`    |
| 上游 ASR         | 由 Java 服务配置（URL、`AccessCode`、代理等），对客户端不可见 |
| 业务 HTTP 请求体 | **无**（不新增「创建会话」REST）                              |

### 2.1 握手（非 JSON body）

可选鉴权（二选一或组合）：

- Query：`?token=...` 或 `?AccessCode=...`
- Header：`Authorization: Bearer <jwt>`

握手成功后，客户端按下列 JSON 格式收发消息；Java **原样转发**至上游 ASR，响应 **原样回传**客户端。

---

## 3. 客户端内部参数（不进入 WebSocket JSON）

### 3.1 启动转写（IPC `startTranscription`）

```json
{
  "installationId": "string",
  "language": "RecordingLanguage",
  "sampleRate": 16000
}
```

**`language` 映射（写入 WebSocket 的 `language` 字段）：**

| 客户端 `language`                                                                                            | WebSocket `language` |
| ------------------------------------------------------------------------------------------------------------ | -------------------- |
| `auto`、`cantonese`、`mandarin`、`english`、`korean`、`portuguese`、`japanese`、`thai`、`hindi`、`indonesia` | 原样                 |
| `zh-CN`                                                                                                      | `mandarin`           |
| `en-US`                                                                                                      | `english`            |

> `installationId`、`sampleRate` 仅用于 IPC，不出现在 WebSocket 消息中。

### 3.2 音频帧（IPC `sendTranscriptionAudio`）

```typescript
{
  pcm: Int16Array,      // 单声道 PCM16 小端
  sampleRate: 16000,
  timestampMs: number,
  rms: number
}
```

- 约 **每 100ms 一帧**（16000 Hz × 0.1s = **1600 samples**）
- 写入 WebSocket 前将 `pcm` 编码为 Base64

---

## 4. WebSocket 请求体（客户端 → Java）

### 4.1 实时音频帧（`flag: "real_time"`）

约 10 次/秒：

```json
{
  "voice_id": "550e8400-e29b-41d4-a716-446655440000",
  "pcm": "AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8=",
  "flag": "real_time",
  "language": "mandarin"
}
```

| 字段       | 类型   | 说明                                                     |
| ---------- | ------ | -------------------------------------------------------- |
| `voice_id` | string | 会话 ID（`crypto.randomUUID()` 或 `asr-{hex}-{random}`） |
| `pcm`      | string | PCM16 单声道小端字节的 Base64                            |
| `flag`     | string | 固定 `"real_time"`                                       |
| `language` | string | 见 §3.1 映射表                                           |

### 4.2 结束帧（`flag: "finished"`）

`stop()` 且已发送 ≥1 帧音频时发送一次：

```json
{
  "voice_id": "550e8400-e29b-41d4-a716-446655440000",
  "pcm": "",
  "flag": "finished",
  "language": "mandarin"
}
```

| 字段   | 说明              |
| ------ | ----------------- |
| `pcm`  | 空字符串 `""`     |
| `flag` | 固定 `"finished"` |

**特殊行为：**

- `cancel()`：不发 `finished`，直接关闭连接
- **0 帧音频**：不发 `finished`，不等待 final

---

## 5. WebSocket 响应体（Java → 客户端）

上游 ASR 响应经 Java 原样转发：

```json
{
  "voice_id": "550e8400-e29b-41d4-a716-446655440000",
  "code": "1",
  "result": {
    "voice_text_str": "你好"
  }
}
```

| `code` | 客户端语义                                 |
| ------ | ------------------------------------------ |
| `"1"`  | partial；`voice_text_str` 为空视为静音心跳 |
| `"0"`  | final                                      |
| `"2"`  | final（与 `"0"` 同等）                     |
| 其他   | 仅日志                                     |

- `voice_id` 与会话不一致时丢弃
- `stop` 后等待 final 默认 **60s**，超时用最近 partial 兜底

---

## 6. 会话时序

```
[WSS 握手 → Java]

→ {"voice_id":"...","pcm":"<base64>","flag":"real_time","language":"mandarin"}
→ ...（重复 N 次）

← {"voice_id":"...","code":"1","result":{"voice_text_str":"你"}}
← {"voice_id":"...","code":"1","result":{"voice_text_str":"你好"}}

→ {"voice_id":"...","pcm":"","flag":"finished","language":"mandarin"}

← {"voice_id":"...","code":"0","result":{"voice_text_str":"你好世界"}}

[关闭连接]
```

---

## 7. Java 服务职责

| 模块       | 职责                                              |
| ---------- | ------------------------------------------------- |
| 接入层     | 对外 WSS、握手鉴权                                |
| 会话注册表 | 客户端连接 ↔ 上游 ASR 连接 ↔ `voice_id`           |
| 上游连接器 | WS Client 连真实 ASR（URL、AccessCode、代理）     |
| 消息管道   | 双向 JSON 原样转发；建议只记 pcm 长度、不落库音频 |
| 生命周期   | 客户端断开/超时 → 关上游；上游断线 → 通知客户端   |

### 7.1 实现注意点

- 双向流，避免阻塞线程（WebFlux / Netty 等）
- 多实例：会话粘滞或集中式 session 存储
- 上游读超时 ≥ 客户端 60s final 等待
- 0 帧会话勿向上游误发 `finished`
- 转发队列背压，防止 OOM

---

## 8. 客户端改动范围

| 项                             | 是否变更           |
| ------------------------------ | ------------------ |
| WebSocket JSON 字段            | **不变**           |
| `DefaultTranscriptionProvider` | **不变**           |
| `settings.ws.url`              | 改为 Java 网关地址 |
| WS 握手 Header（JWT）          | **可选**           |

---

## 9. 代码索引

| 文件                                                                    | 说明                                             |
| ----------------------------------------------------------------------- | ------------------------------------------------ |
| `packages/ai/src/transcription/DefaultTranscriptionProvider.ts`         | WebSocket 协议实现                               |
| `packages/ai/src/transcription/transcriptionTypes.ts`                   | `TranscriptionStartInput`、`encodePcm16ToBase64` |
| `apps/desktop/src/main/transcription/mainTranscriptionService.ts`       | 主进程 WS 连接、代理                             |
| `apps/desktop/src/renderer/features/recorder/browserRecorderAdapter.ts` | 100ms 分帧                                       |

---

## 10. 修订记录

| 日期       | 说明                       |
| ---------- | -------------------------- |
| 2026-06-03 | 初稿                       |
| 2026-06-03 | 仅保留 Java 透明网关方案一 |
