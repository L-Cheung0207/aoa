import { describe, expect, it, vi } from "vitest";
import { join } from "node:path";
import {
  applyPendingInstallOptions,
  parsePendingInstallOptions,
  resolvePendingInstallOptionsPath,
} from "./installOptions";

describe("pending install options", () => {
  it("reads launch-at-login from the NSIS payload handoff file", () => {
    expect(
      parsePendingInstallOptions('{"appBehavior":{"launchAtLogin":false}}'),
    ).toEqual({
      appBehavior: {
        launchAtLogin: false,
      },
    });
  });

  it("ignores invalid handoff data", () => {
    expect(parsePendingInstallOptions("{}")).toBeUndefined();
    expect(
      parsePendingInstallOptions('{"appBehavior":{"launchAtLogin":"yes"}}'),
    ).toBeUndefined();
    expect(parsePendingInstallOptions("not json")).toBeUndefined();
  });

  it("applies pending install options once and removes the handoff file", () => {
    const update = vi.fn();
    const unlink = vi.fn();
    const applied = applyPendingInstallOptions({
      installOptionsPath: "C:/app/resources/install-options.json",
      configStore: { update },
      existsSync: () => true,
      readFileSync: () => '{"appBehavior":{"launchAtLogin":false}}',
      unlinkSync: unlink,
    });

    expect(applied).toBe(true);
    expect(update).toHaveBeenCalledWith({
      appBehavior: {
        launchAtLogin: false,
      },
    });
    expect(unlink).toHaveBeenCalledWith("C:/app/resources/install-options.json");
  });

  it("resolves the handoff file from packaged resources", () => {
    expect(
      resolvePendingInstallOptionsPath({
        isPackaged: true,
        appPath: "C:/ignored/app.asar",
        resourcesPath: "C:/app/resources",
      }),
    ).toBe(join("C:/app/resources", "install-options.json"));
  });
});
