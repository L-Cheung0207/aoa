import { describe, expect, it } from "vitest";
import { shouldEnableEscCancelForState } from "./escCancelController";

describe("esc cancel controller", () => {
  it("enables Escape cancel while a voice operation is active", () => {
    expect(shouldEnableEscCancelForState("listening")).toBe(true);
    expect(shouldEnableEscCancelForState("processing")).toBe(true);
    expect(shouldEnableEscCancelForState("inserting")).toBe(true);
    expect(shouldEnableEscCancelForState("result")).toBe(true);
  });

  it("disables Escape cancel outside active voice operation states", () => {
    expect(shouldEnableEscCancelForState("idle")).toBe(false);
    expect(shouldEnableEscCancelForState("success")).toBe(false);
    expect(shouldEnableEscCancelForState("error")).toBe(false);
    expect(shouldEnableEscCancelForState("shortcut_conflict")).toBe(false);
  });
});
