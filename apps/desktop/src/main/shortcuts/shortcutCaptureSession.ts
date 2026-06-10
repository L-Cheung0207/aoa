export interface ShortcutCaptureSession {
  start(): void;
  stop(): void;
  isActive(): boolean;
}

export function createShortcutCaptureSession(): ShortcutCaptureSession {
  let started = false;

  return {
    start: () => {
      started = true;
    },
    stop: () => {
      started = false;
    },
    isActive: () => started
  };
}
