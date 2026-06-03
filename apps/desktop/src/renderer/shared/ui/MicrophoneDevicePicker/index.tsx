import { useCallback, useEffect, useMemo, useState } from "react";

interface MicrophoneDevicePickerProps {
  selectedDeviceId: string;
  onDeviceChange(deviceId: string): void;
  variant?: "modal" | "page";
  selectId?: string;
  openSignal?: number;
  hideTrigger?: boolean;
}

type InputDevice = Pick<MediaDeviceInfo, "deviceId" | "label" | "kind">;

const AUTO_DEVICE_ID = "";
const METER_BARS = 6;
const METER_BAR_THRESHOLDS = [0.02, 0.04, 0.064, 0.096, 0.144, 0.224] as const;
const METER_DROP_MARGIN = 0.012;
const METER_UPDATE_INTERVAL_MS = 120;
const METER_ATTACK_SMOOTHING = 0.24;
const METER_RELEASE_SMOOTHING = 0.08;

export function MicrophoneDevicePicker({
  selectedDeviceId,
  onDeviceChange,
  variant = "modal",
  selectId = "recording-input-device",
  openSignal,
  hideTrigger = false
}: MicrophoneDevicePickerProps): React.JSX.Element {
  const [open, setOpen] = useState(() =>
    getMicrophoneDevicePickerInitialOpen(openSignal !== undefined && openSignal > 0)
  );
  const [devices, setDevices] = useState<InputDevice[]>([]);
  const [activeBars, setActiveBars] = useState(0);
  const [status, setStatus] = useState<string | undefined>(undefined);

  const refreshDevices = useCallback(async (): Promise<void> => {
    if (!canEnumerateDevices()) {
      setStatus("當前環境無法讀取麥克風列表。");
      return;
    }

    try {
      const nextDevices = dedupeInputDevices(await navigator.mediaDevices.enumerateDevices());
      setDevices(nextDevices);
      setStatus(undefined);
    } catch (error) {
      setStatus(`麥克風列表讀取失敗：${formatError(error)}`);
    }
  }, []);

  useEffect(() => {
    void refreshDevices();
  }, [refreshDevices]);

  useEffect(() => {
    if (openSignal !== undefined && openSignal > 0) {
      setOpen(true);
    }
  }, [openSignal]);

  useEffect(() => {
    if (!open || !canOpenMicrophone()) {
      setActiveBars(0);
      return;
    }

    let cancelled = false;
    let stream: MediaStream | undefined;
    let audioContext: AudioContext | undefined;
    let animationFrame = 0;
    let currentActiveBars = 0;
    let lastMeterUpdateMs = 0;
    let smoothedRms = 0;

    const startMeter = async (): Promise<void> => {
      try {
        const AudioContextConstructor =
          window.AudioContext ??
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AudioContextConstructor) {
          setStatus("當前環境無法檢測音量。");
          return;
        }

        stream = await navigator.mediaDevices.getUserMedia({
          audio: buildMicrophoneAudioConstraints(selectedDeviceId)
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        audioContext = new AudioContextConstructor();
        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        const samples = new Uint8Array(analyser.fftSize);

        const tick = (): void => {
          analyser.getByteTimeDomainData(samples);
          const rawRms = calculateRms(samples);
          const smoothing =
            rawRms > smoothedRms ? METER_ATTACK_SMOOTHING : METER_RELEASE_SMOOTHING;
          smoothedRms += (rawRms - smoothedRms) * smoothing;

          const now = window.performance.now();
          if (now - lastMeterUpdateMs >= METER_UPDATE_INTERVAL_MS) {
            lastMeterUpdateMs = now;
            const nextActiveBars = calculateActiveMeterBars(smoothedRms, currentActiveBars);
            if (nextActiveBars !== currentActiveBars) {
              currentActiveBars = nextActiveBars;
              setActiveBars(nextActiveBars);
            }
          }
          animationFrame = window.requestAnimationFrame(tick);
        };

        setStatus(undefined);
        void refreshDevices();
        tick();
      } catch (error) {
        setActiveBars(0);
        setStatus(`音量檢測失敗：${formatError(error)}`);
      }
    };

    void startMeter();

    return () => {
      cancelled = true;
      if (animationFrame) {
        window.cancelAnimationFrame(animationFrame);
      }
      stream?.getTracks().forEach((track) => track.stop());
      void audioContext?.close();
    };
  }, [open, refreshDevices, selectedDeviceId]);

  const selectedLabel = useMemo(() => {
    if (!selectedDeviceId) {
      return "自动检测（麦克风）";
    }
    return devices.find((device) => device.deviceId === selectedDeviceId)?.label || "已選擇麥克風";
  }, [devices, selectedDeviceId]);

  const options = useMemo(
    () => [
      {
        deviceId: AUTO_DEVICE_ID,
        label: "自动检测（麦克风）",
        hint: "使用系统默认麦克风"
      },
      ...devices.map((device, index) => ({
        deviceId: device.deviceId,
        label: device.label || `麥克風 ${index + 1}`,
        hint: describeDevice(device.label)
      }))
    ],
    [devices]
  );

  const chooseDevice = (deviceId: string): void => {
    onDeviceChange(deviceId);
  };

  return (
    <div className={`mic-picker mic-picker--${variant}`}>
      {!hideTrigger && (
        <button
          id={selectId}
          className="mic-picker__trigger"
          type="button"
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={() => setOpen(true)}
        >
          <span className="mic-picker__trigger-text">{selectedLabel}</span>
          <span className="mic-picker__chevron" aria-hidden="true">
            ›
          </span>
        </button>
      )}

      {open && (
        <div className="mic-picker__modal" role="dialog" aria-modal="true" aria-label="麥克風">
          <button
            className="mic-picker__backdrop"
            type="button"
            aria-label="關閉麥克風選擇"
            onClick={() => setOpen(false)}
          />
          <section className="mic-picker__panel">
            <button
              className="mic-picker__close"
              type="button"
              aria-label="關閉麥克風選擇"
              onClick={() => setOpen(false)}
            >
              ×
            </button>
            <header>
              <h3>麥克風</h3>
              <p>選擇能捕捉到您聲音的麥克風。如果指示條沒有移動，請嘗試其他麥克風。</p>
            </header>

            <div className="mic-picker__list">
              {options.map((device) => {
                const selected = device.deviceId === selectedDeviceId;
                return (
                  <button
                    key={device.deviceId || "auto"}
                    className={`mic-picker__option${selected ? " mic-picker__option--selected" : ""}`}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => chooseDevice(device.deviceId)}
                  >
                    <span>
                      <strong>{device.label}</strong>
                      <small>{device.hint}</small>
                    </span>
                    <LevelMeter activeBars={selected ? activeBars : 0} active={selected} />
                  </button>
                );
              })}
            </div>

            {devices.length === 0 && (
              <p className="mic-picker__status">未檢測到外部麥克風，當前會使用系統預設裝置。</p>
            )}
            {status && <p className="mic-picker__status">{status}</p>}
          </section>
        </div>
      )}
    </div>
  );
}

export function dedupeInputDevices(devices: MediaDeviceInfo[]): InputDevice[] {
  const audioInputs = devices.filter((device) => device.kind === "audioinput");
  const deduped = new Map<string, InputDevice>();

  for (const device of audioInputs) {
    const normalizedLabel = normalizeDeviceLabel(device.label);
    const groupId = "groupId" in device ? String(device.groupId || "") : "";
    const key = groupId || normalizedLabel || device.deviceId;
    const existing = deduped.get(key);

    if (!existing || rankDevice(device) > rankDevice(existing)) {
      deduped.set(key, {
        deviceId: device.deviceId,
        label: normalizedLabel || device.label,
        kind: device.kind
      });
    }
  }

  return [...deduped.values()];
}

export function getMicrophoneDevicePickerInitialOpen(open?: boolean): boolean {
  return open === true;
}

export function buildMicrophoneAudioConstraints(
  selectedDeviceId: string
): true | MediaTrackConstraints {
  return selectedDeviceId ? { deviceId: { exact: selectedDeviceId } } : true;
}

function normalizeDeviceLabel(label: string): string {
  return label
    .replace(/^(Default|Communications)\s*-\s*/i, "")
    .replace(/\s+\(([0-9a-f]{4}:[0-9a-f]{4})\)\s*$/i, "")
    .trim();
}

function rankDevice(device: Pick<MediaDeviceInfo, "deviceId">): number {
  if (device.deviceId !== "default" && device.deviceId !== "communications") {
    return 3;
  }
  if (device.deviceId === "default") {
    return 2;
  }
  return 1;
}

function LevelMeter({
  activeBars,
  active
}: {
  activeBars: number;
  active: boolean;
}): React.JSX.Element {
  const safeActiveBars = active ? Math.max(0, Math.min(METER_BARS, activeBars)) : 0;
  const levelPercent = Math.round((safeActiveBars / METER_BARS) * 100);

  return (
    <span
      className="mic-level-meter"
      data-active={active}
      role="progressbar"
      aria-label="輸入音量"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={levelPercent}
      style={{ "--mic-level": levelPercent / 100 } as React.CSSProperties}
    >
      {Array.from({ length: METER_BARS }, (_, index) => {
        const barActive = index < safeActiveBars;
        return (
          <span
            key={index}
            className="mic-level-meter__bar"
            data-filled={barActive}
            aria-hidden="true"
          />
        );
      })}
    </span>
  );
}

function calculateRms(samples: Uint8Array): number {
  if (samples.length === 0) {
    return 0;
  }

  let sum = 0;
  for (const sample of samples) {
    const centered = (sample - 128) / 128;
    sum += centered * centered;
  }

  return Math.sqrt(sum / samples.length);
}

function calculateActiveMeterBars(rms: number, currentActiveBars = 0): number {
  const nextActiveBars = METER_BAR_THRESHOLDS.filter((threshold) => rms >= threshold).length;

  if (nextActiveBars >= currentActiveBars || currentActiveBars <= 0) {
    return nextActiveBars;
  }

  const currentThreshold = METER_BAR_THRESHOLDS[currentActiveBars - 1] ?? 0;
  return rms >= currentThreshold - METER_DROP_MARGIN ? currentActiveBars : nextActiveBars;
}

function canEnumerateDevices(): boolean {
  return typeof navigator !== "undefined" && Boolean(navigator.mediaDevices?.enumerateDevices);
}

function canOpenMicrophone(): boolean {
  return (
    typeof navigator !== "undefined" &&
    typeof window !== "undefined" &&
    Boolean(navigator.mediaDevices?.getUserMedia)
  );
}

function describeDevice(label: string): string {
  if (!label) {
    return "音訊輸入裝置";
  }
  return /usb|ugreen|audio/i.test(label) ? "外部麥克風" : "麥克風";
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
