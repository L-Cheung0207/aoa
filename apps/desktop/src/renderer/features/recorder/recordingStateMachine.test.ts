import { describe, expect, it } from "vitest";
import { createRecordingStateMachine } from "./recordingStateMachine";

describe("recording state machine", () => {
  it("moves through the successful direct flow and keeps the mode until settlement", () => {
    const machine = createRecordingStateMachine();

    expect(machine.getSnapshot()).toEqual({ state: "idle", mode: undefined });
    expect(machine.send({ type: "start", mode: "direct" })).toEqual({
      state: "listening",
      mode: "direct"
    });
    expect(machine.send({ type: "stop" })).toEqual({ state: "processing", mode: "direct" });
    expect(machine.send({ type: "insert" })).toEqual({ state: "inserting", mode: "direct" });
    expect(machine.send({ type: "success" })).toEqual({ state: "success", mode: undefined });
    expect(machine.send({ type: "reset" })).toEqual({ state: "idle", mode: undefined });
  });

  it("preserves processSelection mode while active and clears on failure", () => {
    const machine = createRecordingStateMachine();

    machine.send({ type: "start", mode: "processSelection" });
    expect(machine.send({ type: "stop" })).toEqual({
      state: "processing",
      mode: "processSelection"
    });
    expect(machine.send({ type: "fail", reason: "postprocess" })).toEqual({
      state: "error",
      mode: undefined,
      reason: "postprocess"
    });
    expect(machine.send({ type: "reset" })).toEqual({ state: "idle", mode: undefined });
  });

  it("supports the translate mode end-to-end", () => {
    const machine = createRecordingStateMachine();

    machine.send({ type: "start", mode: "translate" });
    expect(machine.getSnapshot()).toEqual({ state: "listening", mode: "translate" });
    machine.send({ type: "stop" });
    machine.send({ type: "insert" });
    expect(machine.getSnapshot()).toEqual({ state: "inserting", mode: "translate" });
  });

  it("ignores invalid transitions without losing current mode", () => {
    const machine = createRecordingStateMachine();

    expect(machine.send({ type: "success" })).toEqual({ state: "idle", mode: undefined });

    machine.send({ type: "start", mode: "direct" });
    expect(machine.send({ type: "insert" })).toEqual({ state: "listening", mode: "direct" });
  });

  it("carries the reason when failing from idle (e.g. no_selection) and allows restart", () => {
    const machine = createRecordingStateMachine();

    expect(machine.send({ type: "fail", reason: "no_selection" })).toEqual({
      state: "error",
      mode: undefined,
      reason: "no_selection"
    });

    // A new start from error clears the reason and enters listening again.
    expect(machine.send({ type: "start", mode: "direct" })).toEqual({
      state: "listening",
      mode: "direct"
    });
  });

  it("distinguishes mic/transcription/insertion error reasons", () => {
    const machine = createRecordingStateMachine();

    machine.send({ type: "start", mode: "direct" });
    expect(machine.send({ type: "fail", reason: "mic" }).reason).toBe("mic");

    machine.send({ type: "reset" });
    machine.send({ type: "start", mode: "direct" });
    machine.send({ type: "stop" });
    expect(machine.send({ type: "fail", reason: "transcription" }).reason).toBe("transcription");

    machine.send({ type: "reset" });
    machine.send({ type: "start", mode: "direct" });
    machine.send({ type: "stop" });
    machine.send({ type: "insert" });
    expect(machine.send({ type: "fail", reason: "insertion" }).reason).toBe("insertion");
  });

  it("allows starting a new session directly from success without an explicit reset", () => {
    // 回归：第一次会话 success 后若不能重新 start，第二次按 Right ALT 会静默忽略，
    // 导致 UI 卡在 success、recorder 与状态机脱节、新一轮语音"识别不了"。
    const machine = createRecordingStateMachine();

    machine.send({ type: "start", mode: "direct" });
    machine.send({ type: "stop" });
    machine.send({ type: "insert" });
    expect(machine.send({ type: "success" })).toEqual({ state: "success", mode: undefined });

    // 直接 start 应能从 success 回到 listening，mode 也要正确更新为新一轮的模式。
    expect(machine.send({ type: "start", mode: "translate" })).toEqual({
      state: "listening",
      mode: "translate"
    });
  });
});
