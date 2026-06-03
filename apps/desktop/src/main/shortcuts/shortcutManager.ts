import type { RecordingMode } from "@voice/shared";

export interface ShortcutRegistrar {
  configureShortcuts?(config: ShortcutConfig): void;
  register(accelerator: string, callback: () => void): boolean;
  unregister(accelerator: string): void;
  unregisterAll(): void;
}

export interface ShortcutConfig {
  /** 单击 Right ALT：开启/结束语音直写 */
  toggleRecording: string;
  /** Right ALT + Space：对选中文本用语音指令调用 LLM */
  processSelection: string;
  /** Right ALT + Right Shift：语音原文直接调用 LLM 翻译 */
  translateDictation: string;
}

export interface ShortcutHandlers {
  /** 单击主快捷键：按模式进入/退出录音 */
  onToggle(mode: RecordingMode): void;
  /** 长按主快捷键：展示快捷键提示。 */
  onShortcutHelp?(): void;
  /** 松开主快捷键：关闭快捷键提示。 */
  onShortcutHelpDismiss?(): void;
}

export interface ConfiguredShortcut {
  key: keyof ShortcutConfig;
  accelerator: string;
  mode: RecordingMode;
}

export type ShortcutConfigureResult =
  | {
      ok: true;
      registered: ConfiguredShortcut[];
    }
  | {
      ok: false;
      registered: ConfiguredShortcut[];
      conflicts: ConfiguredShortcut[];
    };

export interface ShortcutManager {
  configure(config: ShortcutConfig, handlers: ShortcutHandlers): ShortcutConfigureResult;
  /** 暂停全局快捷键监听（录入快捷键时使用）。 */
  suspend(): void;
  /** 恢复最近一次 configure 的快捷键绑定。 */
  resume(): ShortcutConfigureResult | undefined;
  dispose(): void;
}

interface ShortcutBinding {
  key: keyof ShortcutConfig;
  mode: RecordingMode;
}

const BINDINGS: ShortcutBinding[] = [
  { key: "toggleRecording", mode: "direct" },
  { key: "processSelection", mode: "processSelection" },
  { key: "translateDictation", mode: "translate" }
];

export function createShortcutManager(registrar: ShortcutRegistrar): ShortcutManager {
  const active: ConfiguredShortcut[] = [];
  let shortcutHelpShowRegistered = false;
  let shortcutHelpDismissRegistered = false;
  let savedConfig: ShortcutConfig | undefined;
  let savedHandlers: ShortcutHandlers | undefined;

  const unregisterAll = (): void => {
    if (shortcutHelpShowRegistered) {
      registrar.unregister("shortcutHelp");
      shortcutHelpShowRegistered = false;
    }
    if (shortcutHelpDismissRegistered) {
      registrar.unregister("shortcutHelpDismiss");
      shortcutHelpDismissRegistered = false;
    }
    for (const entry of active) {
      registrar.unregister(entry.accelerator);
    }
    active.length = 0;
  };

  const configureBindings = (
    config: ShortcutConfig,
    handlers: ShortcutHandlers
  ): ShortcutConfigureResult => {
    unregisterAll();
    registrar.configureShortcuts?.(config);

    const registered: ConfiguredShortcut[] = [];
    const conflicts: ConfiguredShortcut[] = [];

    for (const binding of BINDINGS) {
      const accelerator = config[binding.key];
      if (!accelerator) {
        continue;
      }

      const entry: ConfiguredShortcut = {
        key: binding.key,
        accelerator,
        mode: binding.mode
      };

      const ok = registrar.register(accelerator, () => handlers.onToggle(binding.mode));

      if (ok) {
        active.push(entry);
        registered.push(entry);
      } else {
        conflicts.push(entry);
      }
    }

    if (conflicts.length > 0) {
      return { ok: false, registered, conflicts };
    }

    if (handlers.onShortcutHelp) {
      registrar.register("shortcutHelp", handlers.onShortcutHelp);
      shortcutHelpShowRegistered = true;
    }
    if (handlers.onShortcutHelpDismiss) {
      registrar.register("shortcutHelpDismiss", handlers.onShortcutHelpDismiss);
      shortcutHelpDismissRegistered = true;
    }

    return { ok: true, registered };
  };

  return {
    configure: (config, handlers) => {
      savedConfig = config;
      savedHandlers = handlers;
      return configureBindings(config, handlers);
    },
    suspend: () => {
      registrar.unregisterAll();
      shortcutHelpShowRegistered = false;
      shortcutHelpDismissRegistered = false;
      active.length = 0;
    },
    resume: () => {
      if (!savedConfig || !savedHandlers) {
        return undefined;
      }
      return configureBindings(savedConfig, savedHandlers);
    },
    dispose: () => {
      registrar.unregisterAll();
      shortcutHelpShowRegistered = false;
      shortcutHelpDismissRegistered = false;
      active.length = 0;
      savedConfig = undefined;
      savedHandlers = undefined;
    }
  };
}
