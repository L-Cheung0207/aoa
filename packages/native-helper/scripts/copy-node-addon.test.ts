import { describe, expect, it, vi } from "vitest";

import { copyNativeAddon } from "./copy-node-addon";

describe("copyNativeAddon", () => {
  it("skips locked targets and continues copying other outputs", () => {
    const copyFile = vi
      .fn<(source: string, destination: string) => void>()
      .mockImplementationOnce(() => {
        const error = new Error("busy") as NodeJS.ErrnoException;
        error.code = "EBUSY";
        throw error;
      })
      .mockImplementationOnce(() => undefined);
    const mkdir = vi.fn<(path: string, options: { recursive: boolean }) => void>();
    const logger = {
      info: vi.fn<(message: string) => void>(),
      warn: vi.fn<(message: string) => void>()
    };

    copyNativeAddon({
      sourcePath: "D:\\pkg\\target\\debug\\voice_native_helper.dll",
      debugNodePath: "D:\\pkg\\target\\debug\\voice_native_helper.node",
      destinationDirectory: "D:\\pkg\\dist",
      destinationPath: "D:\\pkg\\dist\\voice_native_helper.node",
      exists: () => true,
      copyFile,
      mkdir,
      logger
    });

    expect(copyFile).toHaveBeenNthCalledWith(
      1,
      "D:\\pkg\\target\\debug\\voice_native_helper.dll",
      "D:\\pkg\\target\\debug\\voice_native_helper.node"
    );
    expect(copyFile).toHaveBeenNthCalledWith(
      2,
      "D:\\pkg\\target\\debug\\voice_native_helper.dll",
      "D:\\pkg\\dist\\voice_native_helper.node"
    );
    expect(mkdir).toHaveBeenCalledWith("D:\\pkg\\dist", { recursive: true });
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining("Skipped copying locked native helper binary to D:\\pkg\\target\\debug\\voice_native_helper.node")
    );
    expect(logger.info).toHaveBeenCalledWith(
      "Copied native helper binary to D:\\pkg\\dist\\voice_native_helper.node"
    );
  });
});
