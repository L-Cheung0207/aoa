import { describe, expect, it, vi } from "vitest";
import type {
  BackendClient,
  ClientBootstrapRequest,
  ClientBootstrapSnapshot,
  PostprocessRequest,
  PostprocessResult,
  ServiceStatusSnapshot,
  TranscriptionSession,
  TranscriptionSessionRequest
} from "@voice/backend-client";
import type { AudioFrame } from "@voice/shared";
import type { InsertService } from "../insertion/insertService";
import type { MainTranscriptionService } from "../transcription/mainTranscriptionService";
import type { UninstallService } from "../uninstall/uninstallService";
import { createIpcRouteHandlers } from "./ipcRoutes";
import type {
  CreateHistoryRecordInput,
  HistoryRecord,
  HistoryStore
} from "../history/historyStore";

interface FakeBackendCalls {
  bootstrap: ClientBootstrapRequest[];
  getServiceStatus: string[];
  createSession: TranscriptionSessionRequest[];
  postprocess: PostprocessRequest[];
}

function createFakeBackendClient(): {
  client: BackendClient;
  calls: FakeBackendCalls;
} {
  const calls: FakeBackendCalls = {
    bootstrap: [],
    getServiceStatus: [],
    createSession: [],
    postprocess: []
  };
  const featureFlags = {
    realtimeTranscription: true,
    postprocess: true,
    history: true
  };
  const anonymousQuota = {
    transcriptionSecondsRemaining: 100,
    postprocessRequestsRemaining: 10
  };
  const client: BackendClient = {
    bootstrap: async (request): Promise<ClientBootstrapSnapshot> => {
      calls.bootstrap.push(request);
      return {
        clientId: "fake-client",
        serviceStatus: "ok",
        featureFlags,
        anonymousQuota
      };
    },
    getServiceStatus: async (installationId): Promise<ServiceStatusSnapshot> => {
      calls.getServiceStatus.push(installationId);
      return {
        serviceStatus: "ok",
        message: "",
        featureFlags,
        anonymousQuota
      };
    },
    createTranscriptionSession: async (
      request
    ): Promise<TranscriptionSession> => {
      calls.createSession.push(request);
      return {
        sessionId: "fake-session",
        transport: "websocket",
        url: "ws://fake",
        token: "fake-token",
        expiresInSeconds: 60,
        provider: "mock"
      };
    },
    postprocess: async (request): Promise<PostprocessResult> => {
      calls.postprocess.push(request);
      return {
        action: "insert",
        finalText: `processed:${request.rawText}`,
        confidence: 0.9,
        usedDictionaryTermIds: [],
        warnings: []
      };
    }
  };
  return { client, calls };
}

function createDeps(overrides: Partial<Parameters<typeof createIpcRouteHandlers>[0]> = {}): Parameters<typeof createIpcRouteHandlers>[0] {
  const insertService: InsertService = {
    insertText: async (text, options) => ({ ok: true, strategy: options.strategy })
  };
  const uninstallService: UninstallService = {
    performUninstall: async () => ({
      ok: true,
      mode: "development",
      launchedCleanup: false,
      cleanupPaths: []
    })
  };
  const { client } = createFakeBackendClient();
  return {
    configStore: {
      get: () => ({ insertion: { strategy: "clipboard" } }) as never,
      update: (patch) => patch as never
    },
    clipboard: {
      writeText: () => undefined
    },
    insertService,
    selectionService: {
      getSelectedText: async () => ""
    },
    backendClient: client,
    postprocessService: {
      postprocess: (request) => client.postprocess(request)
    },
    transcriptionService: {
      subscribe: () => () => undefined,
      start: async () => undefined,
      sendAudio: () => undefined,
      stop: async () => ({}),
      cancel: async () => undefined
    },
    uninstallService,
    updateService: {
      checkForUpdates: async () => ({ status: "disabled" }),
      restartToUpdate: () => undefined
    },
    quitApp: () => undefined,
    historyStore: {
      create: async (input) => ({
        id: "history-1",
        createdAt: "2026-05-27T08:00:00.000Z",
        startedAt: input.startedAt,
        durationMs: input.durationMs,
        mode: input.mode,
        status: input.status,
        transcript: input.transcript,
        finalText: input.finalText
      }),
      list: async () => [],
      delete: async () => false
    },
    installationId: "install-abc",
    appInfo: { deviceName: "dev-host", appVersion: "0.1.0" },
    ...overrides
  };
}

describe("ipc route handlers", () => {
  it("returns app info from the current Electron runtime", () => {
    const handlers = createIpcRouteHandlers(
      createDeps({
        appInfo: { deviceName: "my-host", appVersion: "1.2.3" }
      })
    );

    expect(handlers.getAppInfo()).toEqual({
      deviceName: "my-host",
      appVersion: "1.2.3"
    });
  });

  it("routes insert text through the insert service using current settings strategy", async () => {
    const calls: Array<{ text: string; strategy: string; targetWindowHandle?: string }> = [];
    const insertService: InsertService = {
      insertText: async (text, options) => {
        calls.push({
          text,
          strategy: options.strategy,
          targetWindowHandle: options.targetWindowHandle
        });
        return { ok: true, strategy: options.strategy };
      }
    };
    const handlers = createIpcRouteHandlers(
      createDeps({
        insertService,
        getInsertTargetWindowHandle: () => "target-123"
      })
    );

    const result = await handlers.insertText({ text: "hello" });

    expect(result).toEqual({ ok: true, strategy: "clipboard" });
    expect(calls).toEqual([
      { text: "hello", strategy: "clipboard", targetWindowHandle: "target-123" }
    ]);
  });

  it("copies result text through the main process clipboard", () => {
    const writes: string[] = [];
    const handlers = createIpcRouteHandlers(
      createDeps({
        clipboard: {
          writeText: (text: string) => {
            writes.push(text);
          }
        }
      })
    );

    handlers.copyText({ text: "answer text" });

    expect(writes).toEqual(["answer text"]);
  });

  it("notifies the app after settings are updated so shortcuts can be reconfigured", () => {
    const updatedSettings = {
      shortcuts: {
        toggleRecording: "RightAlt+Space",
        processSelection: "RightAlt",
        translateDictation: "RightAlt+RightShift"
      }
    };
    const updates: unknown[] = [];
    const handlers = createIpcRouteHandlers(
      createDeps({
        configStore: {
          get: () => ({ insertion: { strategy: "clipboard" } }) as never,
          update: () => updatedSettings as never
        },
        onSettingsUpdated: (settings: unknown) => {
          updates.push(settings);
        }
      } as Partial<Parameters<typeof createIpcRouteHandlers>[0]>)
    );

    const result = handlers.updateSettings({
      shortcuts: {
        toggleRecording: "RightAlt+Space",
        processSelection: "RightAlt"
      }
    });

    expect(result).toBe(updatedSettings);
    expect(updates).toEqual([updatedSettings]);
  });

  it("bootstraps the backend client with current installationId and app info", async () => {
    const { client, calls } = createFakeBackendClient();
    const handlers = createIpcRouteHandlers(
      createDeps({
        backendClient: client,
        installationId: "install-xyz",
        appInfo: { deviceName: "my-host", appVersion: "1.2.3" }
      })
    );

    const snapshot = await handlers.bootstrapClient();

    expect(calls.bootstrap).toEqual([
      {
        installationId: "install-xyz",
        deviceName: "my-host",
        platform: "windows",
        appVersion: "1.2.3"
      }
    ]);
    expect(snapshot.installationId).toBe("install-xyz");
    expect(snapshot.clientId).toBe("fake-client");
  });

  it("delegates postprocess to backend client after schema validation", async () => {
    const { client, calls } = createFakeBackendClient();
    const postprocessCalls: PostprocessRequest[] = [];
    const handlers = createIpcRouteHandlers(
      createDeps({
        backendClient: client,
        postprocessService: {
          postprocess: async (request): Promise<PostprocessResult> => {
            postprocessCalls.push(request);
            return {
              action: "insert",
              finalText: `llm:${request.rawText}`,
              confidence: 0.8,
              usedDictionaryTermIds: [],
              warnings: []
            };
          }
        }
      })
    );

    const result = await handlers.postprocess({
      installationId: "install-abc",
      rawText: "raw",
      selectedText: "",
      appContext: { platform: "windows", appName: "App", windowTitle: "Title" },
      mode: "clean",
      language: "zh-CN",
      style: "natural",
      dictionaryTerms: []
    });

    expect(result.finalText).toBe("llm:raw");
    expect(postprocessCalls).toHaveLength(1);
    expect(postprocessCalls[0]?.mode).toBe("clean");
    expect(calls.postprocess).toHaveLength(0);
  });

  it("returns a placeholder active window while native helper is unavailable", async () => {
    const handlers = createIpcRouteHandlers(createDeps());
    await expect(handlers.getActiveWindow()).resolves.toEqual({
      platform: "windows",
      appName: "Unknown",
      windowTitle: ""
    });
    await expect(handlers.getSelectedText()).resolves.toBe("");
  });

  it("routes selected text reads through the selection service using the captured target window", async () => {
    const calls: Array<string | undefined> = [];
    const handlers = createIpcRouteHandlers(
      createDeps({
        selectionService: {
          getSelectedText: async (targetWindowHandle) => {
            calls.push(targetWindowHandle);
            return "selected text";
          }
        },
        getInsertTargetWindowHandle: () => "target-123"
      })
    );

    await expect(handlers.getSelectedText()).resolves.toBe("selected text");
    expect(calls).toEqual(["target-123"]);
  });

  it("replaces selected text only when the current selection matches the captured selection", async () => {
    const insertCalls: Array<{
      text: string;
      strategy: string;
      targetWindowHandle?: string;
    }> = [];
    const selectionCalls: Array<string | undefined> = [];
    const insertService: InsertService = {
      insertText: async (text, options) => {
        insertCalls.push({
          text,
          strategy: options.strategy,
          targetWindowHandle: options.targetWindowHandle
        });
        return { ok: true, strategy: options.strategy };
      }
    };
    const handlers = createIpcRouteHandlers(
      createDeps({
        insertService,
        selectionService: {
          getSelectedText: async (targetWindowHandle) => {
            selectionCalls.push(targetWindowHandle);
            return "old\r\nselection";
          }
        },
        getInsertTargetWindowHandle: () => "target-123"
      })
    );

    const result = await handlers.replaceSelectedText({
      text: "replacement",
      expectedSelectedText: "old\nselection"
    });

    expect(result).toEqual({ ok: true, strategy: "clipboard" });
    expect(selectionCalls).toEqual(["target-123"]);
    expect(insertCalls).toEqual([
      {
        text: "replacement",
        strategy: "clipboard",
        targetWindowHandle: "target-123"
      }
    ]);
  });

  it("continues replacement when the captured selection is no longer active", async () => {
    const insertCalls: Array<{
      text: string;
      strategy: string;
      targetWindowHandle?: string;
    }> = [];
    const insertService: InsertService = {
      insertText: async (text, options) => {
        insertCalls.push({
          text,
          strategy: options.strategy,
          targetWindowHandle: options.targetWindowHandle
        });
        return { ok: true, strategy: options.strategy };
      }
    };
    const handlers = createIpcRouteHandlers(
      createDeps({
        insertService,
        selectionService: {
          getSelectedText: async () => ""
        },
        getInsertTargetWindowHandle: () => "target-123"
      })
    );

    const result = await handlers.replaceSelectedText({
      text: "replacement",
      expectedSelectedText: "old selection"
    });

    expect(result).toEqual({ ok: true, strategy: "clipboard" });
    expect(insertCalls).toEqual([
      {
        text: "replacement",
        strategy: "clipboard",
        targetWindowHandle: "target-123"
      }
    ]);
  });

  it("rejects replacement when the active selection no longer matches", async () => {
    const insertCalls: string[] = [];
    const insertService: InsertService = {
      insertText: async (text, options) => {
        insertCalls.push(text);
        return { ok: true, strategy: options.strategy };
      }
    };
    const handlers = createIpcRouteHandlers(
      createDeps({
        insertService,
        selectionService: {
          getSelectedText: async () => "another selection"
        }
      })
    );

    const result = await handlers.replaceSelectedText({
      text: "replacement",
      expectedSelectedText: "old selection"
    });

    expect(result).toEqual({
      ok: false,
      strategy: "clipboard",
      fallbackText: "replacement",
      errorCode: "insert_failed",
      message: "Selected text changed before replacement"
    });
    expect(insertCalls).toEqual([]);
  });

  it("routes transcription commands through the main transcription service", async () => {
    const calls: Array<unknown[]> = [];
    const transcriptionService: MainTranscriptionService = {
      subscribe: () => () => undefined,
      start: async (input) => {
        calls.push(["start", input]);
      },
      sendAudio: (frame: AudioFrame) => {
        calls.push(["audio", Array.from(frame.pcm), frame.timestampMs]);
      },
      stop: async () => {
        calls.push(["stop"]);
        return { finalText: "hi" };
      },
      cancel: async () => {
        calls.push(["cancel"]);
      }
    };
    const handlers = createIpcRouteHandlers(
      createDeps({ transcriptionService })
    );

    await handlers.startTranscription({
      installationId: "install-1",
      language: "cantonese",
      sampleRate: 16000
    });
    handlers.sendTranscriptionAudio({
      pcm: new Int16Array([1, 2, -3]),
      sampleRate: 16000,
      timestampMs: 88,
      rms: 0.4
    });
    const stopResult = await handlers.stopTranscription();
    await handlers.cancelTranscription();

    expect(calls).toEqual([
      [
        "start",
        { installationId: "install-1", language: "cantonese", sampleRate: 16000 }
      ],
      ["audio", [1, 2, -3], 88],
      ["stop"],
      ["cancel"]
    ]);
    expect(stopResult).toEqual({ finalText: "hi" });
  });

  it("routes uninstall through the uninstall service", async () => {
    const uninstallResult = {
      ok: true,
      mode: "packaged" as const,
      launchedCleanup: true,
      cleanupPaths: ["C:\\Program Files\\Voice Assistant"]
    };
    const uninstallService: UninstallService = {
      performUninstall: vi.fn(async () => uninstallResult)
    };
    const handlers = createIpcRouteHandlers(
      createDeps({ uninstallService })
    );

    await expect(handlers.performUninstall()).resolves.toBe(uninstallResult);
    expect(uninstallService.performUninstall).toHaveBeenCalledTimes(1);
  });

  it("finishes uninstall by quitting the app", () => {
    const quitCalls: string[] = [];
    const handlers = createIpcRouteHandlers(
      createDeps({
        quitApp: () => quitCalls.push("quit")
      })
    );

    handlers.finishUninstall();

    expect(quitCalls).toEqual(["quit"]);
  });

  it("restarts the app through the update service after an update is ready", () => {
    const restartCalls: string[] = [];
    const handlers = createIpcRouteHandlers(
      createDeps({
        updateService: {
          checkForUpdates: async () => ({ status: "disabled" }),
          restartToUpdate: () => restartCalls.push("restart")
        }
      })
    );

    handlers.restartToUpdate();

    expect(restartCalls).toEqual(["restart"]);
  });

  it("starts update checks through the update service", async () => {
    const checkCalls: unknown[] = [];
    const handlers = createIpcRouteHandlers(
      createDeps({
        updateService: {
          checkForUpdates: async (options) => {
            checkCalls.push(options);
            return { status: "up-to-date" };
          },
          restartToUpdate: () => undefined
        }
      })
    );

    await expect(handlers.checkForUpdates()).resolves.toEqual({
      status: "up-to-date"
    });
    expect(checkCalls).toEqual([{ allowDevelopmentFakeUpdate: true }]);
  });

  it("routes history create, list, and delete through the history store", async () => {
    const calls: Array<unknown[]> = [];
    const records: HistoryRecord[] = [
      {
        id: "history-1",
        createdAt: "2026-05-27T08:00:00.000Z",
        startedAt: "2026-05-27T07:59:00.000Z",
        durationMs: 1000,
        mode: "direct",
        status: "completed",
        transcript: "hello",
        finalText: "hello"
      }
    ];
    const historyStore: HistoryStore = {
      create: async (input: CreateHistoryRecordInput) => {
        calls.push(["create", input]);
        return records[0] as HistoryRecord;
      },
      list: async () => {
        calls.push(["list"]);
        return records;
      },
      delete: async (id: string) => {
        calls.push(["delete", id]);
        return true;
      }
    };
    const handlers = createIpcRouteHandlers(createDeps({ historyStore }));

    const created = await handlers.createHistoryRecord({
      startedAt: "2026-05-27T07:59:00.000Z",
      durationMs: 1000,
      mode: "direct",
      status: "completed",
      transcript: "hello",
      finalText: "hello",
      audio: {
        pcm: new Int16Array([1, -1]),
        sampleRate: 16000
      }
    });
    const listed = await handlers.listHistoryRecords();
    const deleted = await handlers.deleteHistoryRecord({ id: "history-1" });

    expect(created).toBe(records[0]);
    expect(listed).toBe(records);
    expect(deleted).toEqual({ deleted: true });
    expect(calls).toEqual([
      [
        "create",
        {
          startedAt: "2026-05-27T07:59:00.000Z",
          durationMs: 1000,
          mode: "direct",
          status: "completed",
          transcript: "hello",
          finalText: "hello",
          audio: {
            pcm: new Int16Array([1, -1]),
            sampleRate: 16000
          }
        }
      ],
      ["list"],
      ["delete", "history-1"]
    ]);
  });

  it("notifies listeners when a history record is created", async () => {
    const records: HistoryRecord[] = [
      {
        id: "history-1",
        createdAt: "2026-05-27T08:00:00.000Z",
        startedAt: "2026-05-27T07:59:00.000Z",
        durationMs: 1000,
        mode: "direct",
        status: "completed",
        transcript: "hello",
        finalText: "hello"
      }
    ];
    const notifications: HistoryRecord[] = [];
    const historyStore: HistoryStore = {
      create: async () => records[0] as HistoryRecord,
      list: async () => records,
      delete: async () => false
    };
    const handlers = createIpcRouteHandlers(
      createDeps({
        historyStore,
        onHistoryRecordCreated: (record) => notifications.push(record)
      })
    );

    const created = await handlers.createHistoryRecord({
      startedAt: "2026-05-27T07:59:00.000Z",
      durationMs: 1000,
      mode: "direct",
      status: "completed",
      transcript: "hello",
      finalText: "hello"
    });

    expect(notifications).toEqual([created]);
  });

  it("applies history retention and notifies deleted records", async () => {
    const deletedIds: string[] = [];
    const updatedSettings = {
      privacy: {
        saveHistory: true,
        historyRetention: "7d",
        restoreClipboard: true,
        allowCrashReports: false
      }
    };
    const handlers = createIpcRouteHandlers(
      createDeps({
        configStore: {
          get: () => updatedSettings as never,
          update: () => updatedSettings as never
        },
        historyStore: {
          create: async () => {
            throw new Error("not used");
          },
          list: async () => [],
          readAudio: async () => undefined,
          delete: async () => false,
          clear: async () => [],
          pruneBefore: async () => ["old-1", "old-2"]
        },
        onHistoryRecordDeleted: (id) => deletedIds.push(id)
      } as Partial<Parameters<typeof createIpcRouteHandlers>[0]>)
    );

    const result = await handlers.applyHistoryRetention({
      retention: "7d",
      now: "2026-05-28T00:00:00.000Z"
    });

    expect(result).toEqual({
      settings: updatedSettings,
      deletedIds: ["old-1", "old-2"]
    });
    expect(deletedIds).toEqual(["old-1", "old-2"]);
  });
});
