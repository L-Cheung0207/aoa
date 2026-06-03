import { describe, expect, it, vi } from "vitest";
import type { AudioFrame } from "@voice/shared";
import {
  createDefaultTranscriptionProvider,
  type TranscriptionSocket,
  type TranscriptionSocketFactory
} from "./DefaultTranscriptionProvider";
import type { TranscriptionEvent } from "./transcriptionTypes";

interface FakeSocket extends TranscriptionSocket {
  sent: string[];
  closed: boolean;
  openHandler?: () => void;
  messageHandler?: (message: string) => void;
  errorHandler?: (error: Error) => void;
  closeHandler?: (event: { code?: number; reason?: string; wasClean?: boolean }) => void;
}

function createFakeSocket(): FakeSocket {
  const socket: FakeSocket = {
    sent: [],
    closed: false,
    send: (message) => {
      socket.sent.push(message);
    },
    close: () => {
      socket.closed = true;
      socket.closeHandler?.();
    },
    onOpen: (handler) => {
      socket.openHandler = handler;
    },
    onMessage: (handler) => {
      socket.messageHandler = handler;
    },
    onError: (handler) => {
      socket.errorHandler = handler;
    },
    onClose: (handler) => {
      socket.closeHandler = handler;
    },
    emitOpen: () => socket.openHandler?.(),
    emitMessage: (message) => socket.messageHandler?.(message),
    emitError: (error) => socket.errorHandler?.(error),
    emitClose: () => socket.closeHandler?.({})
  };
  return socket;
}

function createFrame(): AudioFrame {
  return {
    pcm: new Int16Array([1, -1, 2, -2]),
    sampleRate: 16000,
    timestampMs: 0,
    rms: 0.05
  };
}

function getLoggedText(spy: { mock: { calls: unknown[][] } }): string {
  return spy.mock.calls.map((args) => args.map(String).join(" ")).join("\n");
}

describe("default transcription provider", () => {
  it("prints old-app-style console logs when sending audio and receiving messages", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    try {
      const socket = createFakeSocket();
      const provider = createDefaultTranscriptionProvider({
        socketFactory: { connect: () => socket },
        generateVoiceId: () => "fixed-voice-id"
      });

      const startPromise = provider.start({
        installationId: "inst",
        language: "zh-CN",
        sampleRate: 16000
      });
      socket.emitOpen?.();
      await startPromise;

      provider.sendAudio(createFrame());
      socket.emitMessage?.(
        JSON.stringify({
          voice_id: "fixed-voice-id",
          code: "1",
          result: { voice_text_str: "你好" }
        })
      );

      expect(
        logSpy.mock.calls.some(([message]) =>
          String(message).includes("已发送 1 个音频包")
        )
      ).toBe(true);
      expect(
        logSpy.mock.calls.some(([message]) => {
          const text = String(message);
          return (
            text.includes("WS ← #1") &&
            text.includes('"voice_text_str":"你好"')
          );
        })
      ).toBe(true);

      await provider.cancel();
    } finally {
      logSpy.mockRestore();
    }
  });

  it("prints full incoming WS payloads and close details without outgoing payloads", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    try {
      const socket = createFakeSocket();
      const provider = createDefaultTranscriptionProvider({
        socketFactory: { connect: () => socket },
        generateVoiceId: () => "full-log-voice"
      });

      const startPromise = provider.start({
        installationId: "inst",
        language: "zh-CN",
        sampleRate: 16000
      });
      socket.emitOpen?.();
      await startPromise;

      provider.sendAudio(createFrame());
      const fullServerText = "完整WS日志".repeat(80);
      const serverPayload = JSON.stringify({
        voice_id: "full-log-voice",
        code: "1",
        result: { voice_text_str: fullServerText },
        trace: "server-extra-field"
      });
      socket.emitMessage?.(serverPayload);

      const stopPromise = provider.stop();
      socket.closeHandler?.({
        code: 4001,
        reason: "server closed with details",
        wasClean: false
      });
      await stopPromise;

      const logs = getLoggedText(logSpy);
      expect(logs).toContain(`[asr] WS ← #1 ${serverPayload}`);
      expect(logs).toContain("code=4001");
      expect(logs).toContain("reason=server closed with details");
      expect(logs).toContain("wasClean=false");
      expect(logs).not.toContain(String(socket.sent[0]));
      expect(logs).not.toContain(String(socket.sent[1]));
    } finally {
      logSpy.mockRestore();
      warnSpy.mockRestore();
    }
  });

  it("发送 real_time 帧并路由 partial/final 消息", async () => {
    const socket = createFakeSocket();
    const factory: TranscriptionSocketFactory = {
      connect: vi.fn(() => socket)
    };
    const provider = createDefaultTranscriptionProvider({
      socketFactory: factory,
      generateVoiceId: () => "fixed-voice-id",
      finalTimeoutMs: 5_000
    });

    const events: TranscriptionEvent[] = [];
    provider.subscribe((event) => events.push(event));

    const startPromise = provider.start({
      installationId: "inst",
      language: "zh-CN",
      sampleRate: 16000
    });
    // open 后 start 才 resolve
    socket.emitOpen?.();
    await startPromise;

    expect(factory.connect).toHaveBeenCalledWith(
      "wss://newswriter.teleone.com.cn/ws/transcribe"
    );
    expect(events.map((e) => e.type)).toEqual(["started"]);

    provider.sendAudio(createFrame());
    const sentFrame = JSON.parse(socket.sent[0] ?? "{}");
    expect(sentFrame).toMatchObject({
      voice_id: "fixed-voice-id",
      flag: "real_time",
      language: "mandarin"
    });
    expect(typeof sentFrame.pcm).toBe("string");
    expect(sentFrame.pcm.length).toBeGreaterThan(0);

    // partial
    socket.emitMessage?.(
      JSON.stringify({
        voice_id: "fixed-voice-id",
        code: "1",
        result: { voice_text_str: "你好" }
      })
    );
    // final (stop 后由服务端下发)
    const stopPromise = provider.stop();
    socket.emitMessage?.(
      JSON.stringify({
        voice_id: "fixed-voice-id",
        code: "0",
        result: { voice_text_str: "你好世界" }
      })
    );
    await stopPromise;

    // finished 帧
    const endPayload = JSON.parse(socket.sent[1] ?? "{}");
    expect(endPayload).toMatchObject({
      voice_id: "fixed-voice-id",
      pcm: "",
      flag: "finished",
      language: "mandarin"
    });

    expect(events.map((e) => e.type)).toEqual([
      "started",
      "partial",
      "final",
      "stopped"
    ]);
    const finalEvent = events.find((e) => e.type === "final");
    expect(finalEvent).toEqual({ type: "final", text: "你好世界" });
    expect(socket.closed).toBe(true);
  });

  it("忽略 voice_id 不匹配的消息", async () => {
    const socket = createFakeSocket();
    const provider = createDefaultTranscriptionProvider({
      socketFactory: { connect: () => socket },
      generateVoiceId: () => "session-a"
    });

    const events: TranscriptionEvent[] = [];
    provider.subscribe((event) => events.push(event));

    const startPromise = provider.start({
      installationId: "inst",
      language: "auto",
      sampleRate: 16000
    });
    socket.emitOpen?.();
    await startPromise;

    socket.emitMessage?.(
      JSON.stringify({
        voice_id: "session-b",
        code: "1",
        result: { voice_text_str: "应该被忽略" }
      })
    );

    expect(events.find((e) => e.type === "partial")).toBeUndefined();
  });

  it("stop 后服务端未下发 final 时走超时兜底，使用最近 partial 作为 final", async () => {
    vi.useFakeTimers();
    try {
      const socket = createFakeSocket();
      const provider = createDefaultTranscriptionProvider({
        socketFactory: { connect: () => socket },
        generateVoiceId: () => "v1",
        finalTimeoutMs: 1_000
      });

      const events: TranscriptionEvent[] = [];
      provider.subscribe((event) => events.push(event));

      const startPromise = provider.start({
        installationId: "inst",
        language: "auto",
        sampleRate: 16000
      });
      socket.emitOpen?.();
      await startPromise;

      socket.emitMessage?.(
        JSON.stringify({
          voice_id: "v1",
          code: "1",
          result: { voice_text_str: "兜底文本" }
        })
      );
      
      // 先发一帧音频，确保 stop 走的是「发过帧 → 等 final → 超时兑底」的正规路径，
      // 而不是 0 帧的快速收尾短路径。
      provider.sendAudio(createFrame());
      
      const stopPromise = provider.stop();
      await vi.advanceTimersByTimeAsync(1_000);
      await stopPromise;

      const finalEvent = events.find((e) => e.type === "final");
      expect(finalEvent).toEqual({ type: "final", text: "兜底文本" });
      expect(events.at(-1)?.type).toBe("stopped");
    } finally {
      vi.useRealTimers();
    }
  });

  it("cancel 立即关闭 socket 并发射 stopped", async () => {
    const socket = createFakeSocket();
    const provider = createDefaultTranscriptionProvider({
      socketFactory: { connect: () => socket },
      generateVoiceId: () => "v1"
    });

    const events: TranscriptionEvent[] = [];
    provider.subscribe((event) => events.push(event));

    const startPromise = provider.start({
      installationId: "inst",
      language: "en-US",
      sampleRate: 16000
    });
    socket.emitOpen?.();
    await startPromise;

    await provider.cancel();

    expect(socket.closed).toBe(true);
    expect(events.at(-1)?.type).toBe("stopped");
    // cancel 不发送 finished 帧
    expect(socket.sent.length).toBe(0);
  });

  it("language 根据 RecordingLanguage 做映射（en-US → english）", async () => {
    const socket = createFakeSocket();
    const provider = createDefaultTranscriptionProvider({
      socketFactory: { connect: () => socket },
      generateVoiceId: () => "v1"
    });

    const startPromise = provider.start({
      installationId: "inst",
      language: "en-US",
      sampleRate: 16000
    });
    socket.emitOpen?.();
    await startPromise;

    provider.sendAudio(createFrame());
    const payload = JSON.parse(socket.sent[0] ?? "{}");
    expect(payload.language).toBe("english");
  });

  it("language 传入 ASR 原生语言时原样发送（cantonese）", async () => {
    const socket = createFakeSocket();
    const provider = createDefaultTranscriptionProvider({
      socketFactory: { connect: () => socket },
      generateVoiceId: () => "v1"
    });

    const startPromise = provider.start({
      installationId: "inst",
      language: "cantonese",
      sampleRate: 16000
    });
    socket.emitOpen?.();
    await startPromise;

    provider.sendAudio(createFrame());
    const payload = JSON.parse(socket.sent[0] ?? "{}");
    expect(payload.language).toBe("cantonese");
  });

  it("languageOverride 优先于 input.language", async () => {
    const socket = createFakeSocket();
    const provider = createDefaultTranscriptionProvider({
      socketFactory: { connect: () => socket },
      generateVoiceId: () => "v1",
      languageOverride: "cantonese"
    });

    const startPromise = provider.start({
      installationId: "inst",
      language: "zh-CN",
      sampleRate: 16000
    });
    socket.emitOpen?.();
    await startPromise;

    provider.sendAudio(createFrame());
    const payload = JSON.parse(socket.sent[0] ?? "{}");
    expect(payload.language).toBe("cantonese");
  });

  it("WebSocket 连接错误时 start 抛异常并 emit error", async () => {
    const socket = createFakeSocket();
    const provider = createDefaultTranscriptionProvider({
      socketFactory: { connect: () => socket },
      generateVoiceId: () => "v1"
    });

    const events: TranscriptionEvent[] = [];
    provider.subscribe((event) => events.push(event));

    const startPromise = provider.start({
      installationId: "inst",
      language: "auto",
      sampleRate: 16000
    });
    socket.emitError?.(new Error("connect failed"));

    await expect(startPromise).rejects.toThrow("connect failed");
    expect(events.find((e) => e.type === "error")).toBeDefined();
  });

  it("未启动时 sendAudio 静默丢帧不报错（避免中断其他 listener）", () => {
    const provider = createDefaultTranscriptionProvider({
      socketFactory: { connect: () => createFakeSocket() }
    });

    expect(() => provider.sendAudio(createFrame())).not.toThrow();
    // 重复调用也不应报错。
    expect(() => provider.sendAudio(createFrame())).not.toThrow();
  });

  it("WS 已创建但未 open 时先缓冲音频帧，open 后补发", async () => {
    const socket = createFakeSocket();
    const provider = createDefaultTranscriptionProvider({
      socketFactory: { connect: () => socket },
      generateVoiceId: () => "v-connecting"
    });

    const startPromise = provider.start({
      installationId: "inst",
      language: "auto",
      sampleRate: 16000
    });

    expect(() => provider.sendAudio(createFrame())).not.toThrow();
    expect(() => provider.sendAudio(createFrame())).not.toThrow();
    expect(socket.sent).toEqual([]);

    socket.emitOpen?.();
    await startPromise;

    expect(socket.sent).toHaveLength(2);
    expect(JSON.parse(socket.sent[0] ?? "{}")).toMatchObject({
      voice_id: "v-connecting",
      flag: "real_time",
      language: "auto"
    });
    expect(JSON.parse(socket.sent[1] ?? "{}")).toMatchObject({
      voice_id: "v-connecting",
      flag: "real_time",
      language: "auto"
    });

    provider.sendAudio(createFrame());
    expect(socket.sent).toHaveLength(3);
  });

  it("stop 在 0 帧音频时跳过 finished 帧和 final 等待，直接收尾", async () => {
    const socket = createFakeSocket();
    const provider = createDefaultTranscriptionProvider({
      socketFactory: { connect: () => socket },
      generateVoiceId: () => "v-zero",
      finalTimeoutMs: 60_000
    });

    const events: TranscriptionEvent[] = [];
    provider.subscribe((event) => events.push(event));

    const startPromise = provider.start({
      installationId: "inst",
      language: "auto",
      sampleRate: 16000
    });
    socket.emitOpen?.();
    await startPromise;

    // 未发任何音频，直接 stop —— 不应挂在 60s final 等待上。
    await provider.stop();

    // 没发过 finished 帧（sent 应为空）。
    expect(socket.sent).toEqual([]);
    // 已发射 stopped，但没有 final（服务端也不会回 final）。
    expect(events.some((e) => e.type === "stopped")).toBe(true);
    expect(events.some((e) => e.type === "final")).toBe(false);
    expect(socket.closed).toBe(true);
  });
});
