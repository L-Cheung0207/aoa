import { globalShortcut } from "electron";

const ACCELERATOR = "Escape";
const ESC_CANCEL_STATES = new Set(["listening", "processing", "inserting", "result"]);

export interface EscCancelController {
  /** 进入 processing/inserting 时调用：动态注册全局 Escape。幂等，重复 enable 不会重复注册。 */
  enable(): void;
  /** 离开 processing/inserting 时调用：注销 Escape，恢复其他应用对 ESC 的正常使用。 */
  disable(): void;
  /** 应用退出时调用，等价于 disable()。 */
  dispose(): void;
}

export interface CreateEscCancelControllerOptions {
  /** Escape 触发时执行；通常用于通知 renderer 走 controller.cancel() 链路。 */
  onTrigger(): void;
  /** 可选注入，便于单测。默认使用 electron.globalShortcut。 */
  shortcut?: Pick<typeof globalShortcut, "register" | "unregister" | "isRegistered">;
}

export function shouldEnableEscCancelForState(state: string): boolean {
  return ESC_CANCEL_STATES.has(state);
}

/**
 * 仅在录音结束后的「处理阶段」（processing / inserting）临时占用全局 Escape，
 * 提供一种独立于 Right ALT 的快速退出途径。会话结束（success/idle/error）后立即注销，
 * 不长期劫持系统级 Escape，避免影响其他应用。
 */
export function createEscCancelController(
  options: CreateEscCancelControllerOptions
): EscCancelController {
  const sc = options.shortcut ?? globalShortcut;
  let registered = false;

  const enable = (): void => {
    if (registered) {
      return;
    }
    try {
      const ok = sc.register(ACCELERATOR, () => {
        console.log("[esc-cancel] 检测到 Escape，转发取消请求");
        try {
          options.onTrigger();
        } catch (error) {
          console.error("[esc-cancel] onTrigger 抛错（已吞下）", error);
        }
      });
      if (!ok) {
        console.warn("[esc-cancel] 注册 Escape 失败（可能被其他应用占用），跳过");
        return;
      }
      registered = true;
      console.log("[esc-cancel] Escape 已注册（处理阶段）");
    } catch (error) {
      console.error("[esc-cancel] 注册 Escape 异常", error);
    }
  };

  const disable = (): void => {
    if (!registered) {
      return;
    }
    try {
      sc.unregister(ACCELERATOR);
      console.log("[esc-cancel] Escape 已注销");
    } catch (error) {
      console.warn("[esc-cancel] 注销 Escape 异常（已忽略）", error);
    } finally {
      registered = false;
    }
  };

  return {
    enable,
    disable,
    dispose: disable
  };
}
