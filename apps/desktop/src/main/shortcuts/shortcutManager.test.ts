import { describe, expect, it, vi } from "vitest";
import {
  createShortcutManager,
  type ShortcutConfig,
  type ShortcutRegistrar
} from "./shortcutManager";

const DEFAULT_CONFIG: ShortcutConfig = {
  toggleRecording: "RightAlt",
  processSelection: "RightAlt+Space",
  translateDictation: "RightAlt+RightShift"
};

function createRegistrar(failingAccelerators = new Set<string>()): ShortcutRegistrar & {
  registered: Array<{ accelerator: string; callback: () => void }>;
  unregistered: string[];
  configured: ShortcutConfig[];
} {
  const registered: Array<{ accelerator: string; callback: () => void }> = [];
  const unregistered: string[] = [];
  const configured: ShortcutConfig[] = [];

  return {
    registered,
    unregistered,
    configured,
    configureShortcuts: (config) => {
      configured.push(config);
    },
    register: (accelerator, callback) => {
      if (failingAccelerators.has(accelerator)) {
        return false;
      }
      registered.push({ accelerator, callback });
      return true;
    },
    unregister: (accelerator) => {
      unregistered.push(accelerator);
      for (let index = registered.length - 1; index >= 0; index -= 1) {
        if (registered[index]?.accelerator === accelerator) {
          registered.splice(index, 1);
        }
      }
    },
    unregisterAll: () => {
      unregistered.push("*");
      registered.length = 0;
    }
  };
}

describe("shortcut manager", () => {
  it("registers all three shortcuts with their recording mode", () => {
    const registrar = createRegistrar();
    const manager = createShortcutManager(registrar);
    const onToggle = vi.fn();

    const result = manager.configure(DEFAULT_CONFIG, { onToggle });

    expect(result.ok).toBe(true);
    expect(registrar.registered.map((entry) => entry.accelerator)).toEqual([
      "RightAlt",
      "RightAlt+Space",
      "RightAlt+RightShift"
    ]);

    for (const entry of registrar.registered) {
      entry.callback();
    }

    expect(onToggle.mock.calls).toEqual([
      ["direct"],
      ["processSelection"],
      ["translate"]
    ]);
    expect(registrar.configured).toEqual([DEFAULT_CONFIG]);
  });

  it("registers the virtual shortcut help callbacks when configured", () => {
    const registrar = createRegistrar();
    const manager = createShortcutManager(registrar);
    const onShortcutHelp = vi.fn();
    const onShortcutHelpDismiss = vi.fn();

    manager.configure(DEFAULT_CONFIG, {
      onToggle: () => undefined,
      onShortcutHelp,
      onShortcutHelpDismiss
    });

    const helpEntry = registrar.registered.find((entry) => entry.accelerator === "shortcutHelp");
    const dismissEntry = registrar.registered.find(
      (entry) => entry.accelerator === "shortcutHelpDismiss"
    );
    expect(helpEntry).toBeDefined();
    expect(dismissEntry).toBeDefined();

    helpEntry?.callback();
    dismissEntry?.callback();
    expect(onShortcutHelp).toHaveBeenCalledTimes(1);
    expect(onShortcutHelpDismiss).toHaveBeenCalledTimes(1);

    manager.configure(DEFAULT_CONFIG, { onToggle: () => undefined });
    expect(registrar.unregistered).toContain("shortcutHelp");
    expect(registrar.unregistered).toContain("shortcutHelpDismiss");
  });

  it("unregisters the previous shortcuts before reconfiguring", () => {
    const registrar = createRegistrar();
    const manager = createShortcutManager(registrar);

    manager.configure(DEFAULT_CONFIG, { onToggle: () => undefined });
    manager.configure(
      { ...DEFAULT_CONFIG, toggleRecording: "Ctrl+Shift+Space" },
      { onToggle: () => undefined }
    );

    expect(registrar.unregistered).toEqual(
      expect.arrayContaining(["RightAlt", "RightAlt+Space", "RightAlt+RightShift"])
    );
    expect(registrar.registered.map((entry) => entry.accelerator)).toEqual([
      "Ctrl+Shift+Space",
      "RightAlt+Space",
      "RightAlt+RightShift"
    ]);
  });

  it("reports conflicts when a subset of accelerators fail to register", () => {
    const registrar = createRegistrar(new Set(["RightAlt+Space"]));
    const manager = createShortcutManager(registrar);

    const result = manager.configure(DEFAULT_CONFIG, { onToggle: () => undefined });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.conflicts.map((c) => c.accelerator)).toEqual(["RightAlt+Space"]);
    expect(result.registered.map((c) => c.accelerator)).toEqual([
      "RightAlt",
      "RightAlt+RightShift"
    ]);
  });

  it("skips empty accelerators without treating them as conflict", () => {
    const registrar = createRegistrar();
    const manager = createShortcutManager(registrar);

    const result = manager.configure(
      { ...DEFAULT_CONFIG, translateDictation: "" },
      { onToggle: () => undefined }
    );

    expect(result.ok).toBe(true);
    expect(registrar.registered.map((entry) => entry.accelerator)).toEqual([
      "RightAlt",
      "RightAlt+Space"
    ]);
  });

  it("suspends and resumes the last configured shortcuts", () => {
    const registrar = createRegistrar();
    const manager = createShortcutManager(registrar);
    const onToggle = vi.fn();

    manager.configure(DEFAULT_CONFIG, { onToggle });
    manager.suspend();

    expect(registrar.registered).toHaveLength(0);
    expect(registrar.unregistered).toContain("*");

    onToggle.mockClear();

    const resumeResult = manager.resume();
    expect(resumeResult?.ok).toBe(true);
    expect(registrar.registered.map((entry) => entry.accelerator)).toEqual([
      "RightAlt",
      "RightAlt+Space",
      "RightAlt+RightShift"
    ]);

    for (const entry of registrar.registered) {
      entry.callback();
    }
    expect(onToggle).toHaveBeenCalledTimes(3);
  });
});
