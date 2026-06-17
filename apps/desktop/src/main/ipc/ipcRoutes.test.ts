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
import { createIpcRouteHandlers, registerIpcRoutes } from "./ipcRoutes";
import type {
  CreateHistoryRecordInput,
  HistoryRecord,
  HistoryStore
} from "../history/historyStore";
import type { AuthSessionSnapshot } from "../auth/authTypes";

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
  const authSessionSnapshot: AuthSessionSnapshot = {
    status: "unauthenticated"
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
    authService: {
      getSessionSnapshot: () => authSessionSnapshot,
      sendEmailCode: async () => ({ cooldownSeconds: 60 }),
      loginWithEmailCode: async () => authSessionSnapshot,
      loginWithLdap: async () => authSessionSnapshot,
      logout: async () => authSessionSnapshot
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
      update: async (id, input) => ({
        id,
        createdAt: "2026-05-27T08:00:00.000Z",
        startedAt: input.startedAt,
        durationMs: input.durationMs,
        mode: input.mode,
        status: input.status,
        transcript: input.transcript,
        finalText: input.finalText
      }),
      list: async () => [],
      readAudio: async () => undefined,
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
    const selectionReads = ["old\r\nselection", ""];
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
            return selectionReads.shift() ?? "";
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
    expect(selectionCalls).toEqual(["target-123", "target-123"]);
    expect(insertCalls).toEqual([
      {
        text: "replacement",
        strategy: "clipboard",
        targetWindowHandle: "target-123"
      }
    ]);
  });

  it("reports replacement failure when the selected text remains after paste", async () => {
    const insertCalls: Array<{
      text: string;
      strategy: string;
      targetWindowHandle?: string;
    }> = [];
    const selectionReads = ["old selection", "old selection"];
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
            return selectionReads.shift() ?? "";
          }
        },
        getInsertTargetWindowHandle: () => "target-123"
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
      message: "Selected text was not replaced"
    });
    expect(selectionCalls).toEqual(["target-123", "target-123"]);
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

  it("cancels uninstall by quitting the app", () => {
    const quitCalls: string[] = [];
    const handlers = createIpcRouteHandlers(
      createDeps({
        quitApp: () => quitCalls.push("quit")
      })
    );

    handlers.cancelUninstall();

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
      update: async (id: string, input: CreateHistoryRecordInput) => {
        calls.push(["update", id, input]);
        return { ...records[0], ...input, id } as HistoryRecord;
      },
      list: async () => {
        calls.push(["list"]);
        return records;
      },
      readAudio: async (id: string) => {
        calls.push(["readAudio", id]);
        return undefined;
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
    const updated = await handlers.updateHistoryRecord({
      id: "history-1",
      startedAt: "2026-05-27T07:59:00.000Z",
      durationMs: 1200,
      mode: "direct",
      status: "completed",
      transcript: "retry hello",
      finalText: "retry hello"
    });
    const listed = await handlers.listHistoryRecords();
    const deleted = await handlers.deleteHistoryRecord({ id: "history-1" });

    expect(created).toBe(records[0]);
    expect(updated).toMatchObject({
      id: "history-1",
      durationMs: 1200,
      transcript: "retry hello",
      finalText: "retry hello"
    });
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
      [
        "update",
        "history-1",
        {
          startedAt: "2026-05-27T07:59:00.000Z",
          durationMs: 1200,
          mode: "direct",
          status: "completed",
          transcript: "retry hello",
          finalText: "retry hello"
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
      update: async () => records[0] as HistoryRecord,
      list: async () => records,
      readAudio: async () => undefined,
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
          update: async () => {
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

  it("logs history mutations without transcript or audio payloads", async () => {
    const logs: string[] = [];
    const warnings: string[] = [];
    const historyStore: HistoryStore = {
      create: async (input) => ({
        id: "history-1",
        createdAt: "2026-05-27T08:00:00.000Z",
        ...input
      }),
      update: async (id, input) => ({
        id,
        createdAt: "2026-05-27T08:00:00.000Z",
        ...input
      }),
      list: async () => [],
      readAudio: async () => undefined,
      delete: async () => true,
      pruneBefore: async () => ["old-1"]
    };
    const handlers = createIpcRouteHandlers(
      createDeps({
        historyStore,
        logger: {
          log: (message) => logs.push(message),
          warn: (message) => warnings.push(message)
        }
      } as Partial<Parameters<typeof createIpcRouteHandlers>[0]>)
    );

    await handlers.createHistoryRecord({
      startedAt: "2026-05-27T07:59:00.000Z",
      durationMs: 1000,
      mode: "direct",
      status: "completed",
      transcript: "secret transcript",
      finalText: "secret final",
      audio: {
        pcm: new Int16Array([1, -1]),
        sampleRate: 16000
      }
    });
    await handlers.updateHistoryRecord({
      id: "history-1",
      startedAt: "2026-05-27T07:59:00.000Z",
      durationMs: 1200,
      mode: "direct",
      status: "completed",
      transcript: "updated secret",
      finalText: "updated final"
    });
    await handlers.deleteHistoryRecord({ id: "history-1" });
    await handlers.applyHistoryRetention({
      retention: "7d",
      now: "2026-05-28T00:00:00.000Z"
    });

    expect(logs).toContain(
      "[history] create id=history-1 mode=direct status=completed durationMs=1000 transcriptLength=17 finalTextLength=12 hasAudio=true"
    );
    expect(logs).toContain(
      "[history] update id=history-1 status=completed durationMs=1200 transcriptLength=14 finalTextLength=13"
    );
    expect(logs).toContain("[history] delete id=history-1 deleted=true");
    expect(logs).toContain("[history] retention retention=7d deleted=1");
    expect([...logs, ...warnings].join("\n")).not.toContain("secret");
  });

  it("routes auth requests through the auth service", async () => {
    const authCalls: Array<[string, unknown]> = [];
    const authSessionSnapshot: AuthSessionSnapshot = {
      status: "authenticated",
      user: {
        id: "user-1",
        displayName: "Alex",
        email: "user@example.com",
        authType: "email_code"
      }
    };
    const handlers = createIpcRouteHandlers(
      createDeps({
        authService: {
          getSessionSnapshot: () => authSessionSnapshot,
          sendEmailCode: async (input) => {
            authCalls.push(["sendEmailCode", input]);
            return { cooldownSeconds: 60 };
          },
          loginWithEmailCode: async (input) => {
            authCalls.push(["loginWithEmailCode", input]);
            return authSessionSnapshot;
          },
          loginWithLdap: async (input) => {
            authCalls.push(["loginWithLdap", input]);
            return authSessionSnapshot;
          },
          logout: async () => {
            authCalls.push(["logout", undefined]);
            return authSessionSnapshot;
          }
        }
      })
    );

    expect(handlers.getAuthSession()).toBe(authSessionSnapshot);
    await expect(handlers.sendEmailCode({ email: " user@example.com " })).resolves.toEqual({
      cooldownSeconds: 60
    });
    await expect(
      handlers.loginWithEmailCode({
        email: "user@example.com",
        code: "123456",
        rememberMe: true
      })
    ).resolves.toBe(authSessionSnapshot);
    await expect(
      handlers.loginWithLdap({
        account: "alex",
        password: "secret",
        rememberMe: false
      })
    ).resolves.toBe(authSessionSnapshot);
    await expect(handlers.logout()).resolves.toBe(authSessionSnapshot);

    expect(authCalls).toEqual([
      ["sendEmailCode", { email: "user@example.com" }],
      [
        "loginWithEmailCode",
        { email: "user@example.com", code: "123456", rememberMe: true }
      ],
      [
        "loginWithLdap",
        { account: "alex", password: "secret", rememberMe: false }
      ],
      ["logout", undefined]
    ]);
  });

  it("rejects malformed auth input", async () => {
    const handlers = createIpcRouteHandlers(
      createDeps({
        authService: {
          getSessionSnapshot: () => ({ status: "unauthenticated" }),
          sendEmailCode: async () => ({ cooldownSeconds: 60 }),
          loginWithEmailCode: async () => ({ status: "unauthenticated" }),
          loginWithLdap: async () => ({ status: "unauthenticated" }),
          logout: async () => ({ status: "unauthenticated" })
        }
      })
    );

    await expect(handlers.sendEmailCode({ email: "not-an-email" })).rejects.toThrow(
      "Auth email must be a valid email address"
    );
    await expect(
      handlers.loginWithEmailCode({
        email: "user@example.com",
        code: "12",
        rememberMe: true
      })
    ).rejects.toThrow("Auth code must be 6 digits");
    await expect(
      handlers.loginWithEmailCode({
        email: "user@example.com",
        code: "123456"
      })
    ).rejects.toThrow("Auth rememberMe must be a boolean");
    await expect(
      handlers.loginWithEmailCode({
        email: "user@example.com",
        code: "123456",
        rememberMe: "yes"
      })
    ).rejects.toThrow("Auth rememberMe must be a boolean");
    await expect(handlers.loginWithEmailCode("bad")).rejects.toThrow(
      "Auth email login input must be an object"
    );
    await expect(
      handlers.loginWithLdap({
        account: "",
        password: "secret",
        rememberMe: false
      })
    ).rejects.toThrow("Auth LDAP account is required");
    await expect(
      handlers.loginWithLdap({
        account: "alex",
        password: "   ",
        rememberMe: false
      })
    ).rejects.toThrow("Auth LDAP password is required");
    await expect(
      handlers.loginWithLdap({
        account: "alex",
        password: "secret"
      })
    ).rejects.toThrow("Auth rememberMe must be a boolean");
    await expect(
      handlers.loginWithLdap({
        account: "alex",
        password: "secret",
        rememberMe: 1
      })
    ).rejects.toThrow("Auth rememberMe must be a boolean");
    await expect(handlers.loginWithLdap(null)).rejects.toThrow(
      "Auth LDAP login input must be an object"
    );
  });
});

describe("ipc route logging", () => {
  it("logs channel lifecycle with sanitized input and duration", async () => {
    const logs: string[] = [];
    const handles = new Map<
      string,
      (_event: unknown, input?: unknown) => unknown
    >();
    const ipcMain = {
      handle: (
        channel: string,
        listener: (_event: unknown, input?: unknown) => unknown
      ) => {
        handles.set(channel, listener);
      }
    };

    registerIpcRoutes(ipcMain, createDeps(), {
      logger: {
        log: (message) => logs.push(message),
        warn: (message) => logs.push(message)
      },
      now: (() => {
        let current = 1000;
        return () => {
          current += 7;
          return current;
        };
      })()
    });

    await handles.get("voice:copy-text")?.({}, { text: "secret text" });

    expect(logs).toEqual([
      "[ipc] request channel=voice:copy-text requestId=ipc-1 input={\"textLength\":11}",
      "[ipc] response channel=voice:copy-text requestId=ipc-1 status=ok durationMs=7"
    ]);
    expect(logs.join("\n")).not.toContain("secret text");
  });

  it("logs sensitive IPC input in development mode", async () => {
    const logs: string[] = [];
    const handles = new Map<
      string,
      (_event: unknown, input?: unknown) => unknown
    >();
    const ipcMain = {
      handle: (
        channel: string,
        listener: (_event: unknown, input?: unknown) => unknown
      ) => {
        handles.set(channel, listener);
      }
    };

    registerIpcRoutes(ipcMain, createDeps(), {
      logger: {
        log: (message) => logs.push(message),
        warn: (message) => logs.push(message)
      },
      revealSensitiveLogs: true,
      now: (() => {
        let current = 1000;
        return () => {
          current += 7;
          return current;
        };
      })()
    });

    await handles.get("voice:copy-text")?.({}, { text: "secret text" });

    expect(logs).toEqual([
      "[ipc] request channel=voice:copy-text requestId=ipc-1 input={\"text\":\"secret text\"}",
      "[ipc] response channel=voice:copy-text requestId=ipc-1 status=ok durationMs=7"
    ]);
  });

  it("logs failed IPC handlers without leaking sensitive input", async () => {
    const logs: string[] = [];
    const handles = new Map<
      string,
      (_event: unknown, input?: unknown) => unknown
    >();
    registerIpcRoutes(
      {
        handle: (channel, listener) => {
          handles.set(channel, listener);
        }
      },
      createDeps({
        updateService: {
          checkForUpdates: async () => {
            throw new Error("backend down");
          },
          restartToUpdate: () => undefined
        }
      }),
      {
        logger: {
          log: (message) => logs.push(message),
          warn: (message) => logs.push(message)
        },
        now: (() => {
          let current = 2000;
          return () => {
            current += 5;
            return current;
          };
        })()
      }
    );

    await expect(handles.get("voice:check-for-updates")?.({})).rejects.toThrow(
      "backend down"
    );

    expect(logs).toEqual([
      "[ipc] request channel=voice:check-for-updates requestId=ipc-1",
      "[ipc] response channel=voice:check-for-updates requestId=ipc-1 status=error durationMs=5 error=\"backend down\""
    ]);
  });

  it("registers auth ipc routes", async () => {
    const handles = new Map<
      string,
      (_event: unknown, input?: unknown) => unknown
    >();
    const authCalls: Array<[string, unknown]> = [];
    const authSessionSnapshot: AuthSessionSnapshot = {
      status: "authenticated",
      user: {
        id: "user-1",
        displayName: "Alex",
        authType: "ldap"
      }
    };
    registerIpcRoutes(
      {
        handle: (channel, listener) => {
          handles.set(channel, listener);
        }
      },
      createDeps({
        authService: {
          getSessionSnapshot: () => authSessionSnapshot,
          sendEmailCode: async (input) => {
            authCalls.push(["sendEmailCode", input]);
            return { cooldownSeconds: 60 };
          },
          loginWithEmailCode: async (input) => {
            authCalls.push(["loginWithEmailCode", input]);
            return authSessionSnapshot;
          },
          loginWithLdap: async (input) => {
            authCalls.push(["loginWithLdap", input]);
            return authSessionSnapshot;
          },
          logout: async () => {
            authCalls.push(["logout", undefined]);
            return authSessionSnapshot;
          }
        }
      })
    );

    await expect(handles.get("voice:auth:get-session")?.({})).resolves.toBe(
      authSessionSnapshot
    );
    await expect(
      handles.get("voice:auth:send-email-code")?.({}, { email: " user@example.com " })
    ).resolves.toEqual({ cooldownSeconds: 60 });
    await expect(
      handles.get("voice:auth:login-email-code")?.({}, {
        email: "user@example.com",
        code: "123456",
        rememberMe: true
      })
    ).resolves.toBe(authSessionSnapshot);
    await expect(
      handles.get("voice:auth:login-ldap")?.({}, {
        account: "alex",
        password: "secret",
        rememberMe: false
      })
    ).resolves.toBe(authSessionSnapshot);
    await expect(handles.get("voice:auth:logout")?.({})).resolves.toBe(
      authSessionSnapshot
    );

    expect(authCalls).toEqual([
      ["sendEmailCode", { email: "user@example.com" }],
      [
        "loginWithEmailCode",
        { email: "user@example.com", code: "123456", rememberMe: true }
      ],
      [
        "loginWithLdap",
        { account: "alex", password: "secret", rememberMe: false }
      ],
      ["logout", undefined]
    ]);
  });
});
