import { describe, expect, it } from "vitest";
import { isRightCommandEvent, isRightShiftEvent, isSlashEvent } from "./HomeShell";

function keyEvent(
  event: Pick<KeyboardEvent, "code" | "key"> & Partial<Pick<KeyboardEvent, "location">>,
): KeyboardEvent {
  return {
    code: event.code,
    key: event.key,
    location: event.location ?? 0,
  } as KeyboardEvent;
}

describe("HomeShell foreground shortcut fallback", () => {
  it("recognizes the macOS Right Cmd shortcut keys", () => {
    expect(isRightCommandEvent(keyEvent({ code: "MetaRight", key: "Meta" }))).toBe(true);
    expect(isRightCommandEvent(keyEvent({ code: "MetaLeft", key: "Meta" }))).toBe(false);
    expect(isRightCommandEvent(keyEvent({ code: "", key: "Meta", location: 2 }))).toBe(true);
    expect(isRightShiftEvent(keyEvent({ code: "ShiftRight", key: "Shift" }))).toBe(true);
    expect(isRightShiftEvent(keyEvent({ code: "ShiftLeft", key: "Shift" }))).toBe(false);
    expect(isSlashEvent(keyEvent({ code: "Slash", key: "/" }))).toBe(true);
  });
});
