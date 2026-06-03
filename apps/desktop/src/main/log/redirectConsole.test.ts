import { describe, expect, it } from "vitest";
import { formatLogFileLine } from "./redirectConsole";

describe("redirectConsole", () => {
  it("formats file log lines with timestamp and level", () => {
    const line = formatLogFileLine("warn", ["hello", { code: 42 }], new Date("2026-05-14T08:00:00.000Z"));

    expect(line).toBe('2026-05-14T08:00:00.000Z [WARN] hello { code: 42 }\n');
  });
});
