import { describe, expect, it } from "vitest";
import type { RecordingSnapshot } from "../features/recorder/recordingStateMachine";
import {
  createInitialVoiceOverlayState,
  selectPendingStartMode,
  selectVoiceOverlayProjection,
  voiceOverlayReducer,
} from "./voiceOverlayState";

const now = 1_000;

function snapshot(
  input: RecordingSnapshot,
): RecordingSnapshot {
  return input;
}

describe("voice overlay state", () => {
  it("shows the start loading state while the controller is still idle", () => {
    const overlay = voiceOverlayReducer(createInitialVoiceOverlayState(), {
      type: "beginStart",
      mode: "direct",
      nowMs: now,
    });

    const projection = selectVoiceOverlayProjection({
      overlay,
      snapshot: snapshot({ state: "idle", mode: undefined }),
      nowMs: now + 100,
    });

    expect(projection.state).toBe("listening");
    expect(projection.mode).toBe("direct");
  });

  it("lets controller start errors override the start loading hold", () => {
    const overlay = voiceOverlayReducer(createInitialVoiceOverlayState(), {
      type: "beginStart",
      mode: "processSelection",
      nowMs: now,
    });

    const projection = selectVoiceOverlayProjection({
      overlay,
      snapshot: snapshot({
        state: "error",
        mode: undefined,
        reason: "no_selection",
      }),
      nowMs: now + 100,
    });

    expect(projection.state).toBe("error");
    expect(projection.mode).toBeUndefined();
    expect(projection.reason).toBe("no_selection");
    expect(projection.shouldClearPendingTransition).toBe(true);
  });

  it("holds stop thinking while the controller is still listening", () => {
    const overlay = voiceOverlayReducer(createInitialVoiceOverlayState(), {
      type: "beginStop",
      mode: "direct",
      nowMs: now,
    });

    const projection = selectVoiceOverlayProjection({
      overlay,
      snapshot: snapshot({ state: "listening", mode: "direct" }),
      nowMs: now + 1_500,
    });

    expect(projection.state).toBe("processing");
    expect(projection.mode).toBe("direct");
  });

  it("keeps stop thinking after the minimum hold if the controller is still listening", () => {
    const overlay = voiceOverlayReducer(createInitialVoiceOverlayState(), {
      type: "beginStop",
      mode: "direct",
      nowMs: now,
    });

    const projection = selectVoiceOverlayProjection({
      overlay,
      snapshot: snapshot({ state: "listening", mode: "direct" }),
      nowMs: now + 2_001,
    });

    expect(projection.state).toBe("processing");
    expect(projection.shouldClearPendingTransition).toBe(false);
  });

  it("lets controller success end stop thinking immediately", () => {
    const overlay = voiceOverlayReducer(createInitialVoiceOverlayState(), {
      type: "beginStop",
      mode: "direct",
      nowMs: now,
    });

    const projection = selectVoiceOverlayProjection({
      overlay,
      snapshot: snapshot({ state: "success", mode: undefined }),
      nowMs: now + 100,
    });

    expect(projection.state).toBe("success");
    expect(projection.shouldClearPendingTransition).toBe(true);
  });

  it("does not expose stop thinking as a pending start", () => {
    const overlay = voiceOverlayReducer(createInitialVoiceOverlayState(), {
      type: "beginStop",
      mode: "direct",
      nowMs: now,
    });

    expect(selectPendingStartMode(overlay)).toBeUndefined();
  });

  it("projects dismissed controller transcription errors to idle", () => {
    const overlay = voiceOverlayReducer(createInitialVoiceOverlayState(), {
      type: "dismissNetworkError",
    });

    const projection = selectVoiceOverlayProjection({
      overlay,
      snapshot: snapshot({
        state: "error",
        mode: undefined,
        reason: "transcription",
      }),
      nowMs: now,
    });

    expect(projection.state).toBe("idle");
    expect(projection.reason).toBeUndefined();
  });

  it("shows thinking immediately on network retry and returns to network error after two seconds if retry still fails", () => {
    const overlay = voiceOverlayReducer(createInitialVoiceOverlayState(), {
      type: "beginRetry",
      mode: "direct",
      nowMs: now,
    });
    const unavailable = snapshot({
      state: "listening",
      mode: "direct",
      transcriptionStatus: "unavailable",
    });

    expect(
      selectVoiceOverlayProjection({
        overlay,
        snapshot: unavailable,
        nowMs: now,
      }).state,
    ).toBe("processing");

    const projection = selectVoiceOverlayProjection({
      overlay,
      snapshot: unavailable,
      nowMs: now + 2_001,
    });

    expect(projection.state).toBe("error");
    expect(projection.reason).toBe("transcription");
  });

  it("returns to listening after retry succeeds and the two second hold ends", () => {
    const overlay = voiceOverlayReducer(createInitialVoiceOverlayState(), {
      type: "beginRetry",
      mode: "direct",
      nowMs: now,
    });

    const projection = selectVoiceOverlayProjection({
      overlay,
      snapshot: snapshot({
        state: "listening",
        mode: "direct",
        transcriptionStatus: "ready",
      }),
      nowMs: now + 2_001,
    });

    expect(projection.state).toBe("listening");
    expect(projection.mode).toBe("direct");
  });

  it("projects canceled to idle after three seconds without user action", () => {
    let overlay = voiceOverlayReducer(createInitialVoiceOverlayState(), {
      type: "syncSnapshot",
      snapshot: snapshot({ state: "canceled", mode: "direct" }),
      nowMs: now,
    });
    const canceled = snapshot({ state: "canceled", mode: "direct" });

    expect(
      selectVoiceOverlayProjection({
        overlay,
        snapshot: canceled,
        nowMs: now + 2_999,
      }).state,
    ).toBe("canceled");

    const projection = selectVoiceOverlayProjection({
      overlay,
      snapshot: canceled,
      nowMs: now + 3_000,
    });

    expect(projection.state).toBe("idle");
    expect(projection.shouldAutoCloseCanceled).toBe(true);

    overlay = voiceOverlayReducer(overlay, {
      type: "syncSnapshot",
      snapshot: snapshot({ state: "processing", mode: "direct" }),
      nowMs: now + 1_000,
    });
    expect(
      selectVoiceOverlayProjection({
        overlay,
        snapshot: snapshot({ state: "processing", mode: "direct" }),
        nowMs: now + 3_000,
      }).state,
    ).toBe("processing");
  });

  it("lets result override the controller snapshot", () => {
    const overlay = voiceOverlayReducer(createInitialVoiceOverlayState(), {
      type: "showResult",
      result: {
        rawText: "hello",
        selectedText: "",
        finalText: "hello",
        warnings: [],
      },
    });

    const projection = selectVoiceOverlayProjection({
      overlay,
      snapshot: snapshot({ state: "listening", mode: "direct" }),
      nowMs: now,
    });

    expect(projection.state).toBe("result");
    expect(projection.result?.finalText).toBe("hello");
    expect(projection.mode).toBeUndefined();
  });

  it("projects thinking timeout to a retryable transcription error", () => {
    const overlay = voiceOverlayReducer(createInitialVoiceOverlayState(), {
      type: "beginStop",
      mode: "direct",
      nowMs: now,
    });

    const projection = selectVoiceOverlayProjection({
      overlay,
      snapshot: snapshot({ state: "processing", mode: "direct" }),
      nowMs: now + 10_000,
    });

    expect(projection.state).toBe("error");
    expect(projection.reason).toBe("transcription");
    expect(projection.shouldCancelForThinkingTimeout).toBe(true);
  });
});
