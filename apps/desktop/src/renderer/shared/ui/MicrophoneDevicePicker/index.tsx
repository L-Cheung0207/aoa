import { useCallback, useEffect, useMemo, useState } from "react";
import type { InterfaceLanguage } from "@voice/shared";
import {
  calculateActiveMeterBars,
  calculateRms,
  MICROPHONE_METER_ATTACK_SMOOTHING,
  MICROPHONE_METER_BARS,
  MICROPHONE_METER_RELEASE_SMOOTHING,
  MICROPHONE_METER_UPDATE_INTERVAL_MS
} from "./meterStrategy";

interface MicrophoneDevicePickerProps {
  selectedDeviceId: string;
  onDeviceChange(deviceId: string): void;
  language?: InterfaceLanguage | undefined;
  variant?: "modal" | "page";
  selectId?: string;
  openSignal?: number;
  hideTrigger?: boolean;
}

type InputDevice = Pick<MediaDeviceInfo, "deviceId" | "label" | "kind">;

const AUTO_DEVICE_ID = "";
type MicrophonePickerText = {
  cannotReadDevices: string;
  deviceListFailedPrefix: string;
  cannotDetectVolume: string;
  volumeFailedPrefix: string;
  autoDevice: string;
  selectedFallback: string;
  autoHint: string;
  microphoneNamePrefix: string;
  modalLabel: string;
  closePicker: string;
  title: string;
  description: string;
  noDevices: string;
  inputVolume: string;
  audioInputDevice: string;
  externalMicrophone: string;
  microphone: string;
};

const MICROPHONE_PICKER_TEXT: Record<InterfaceLanguage, MicrophonePickerText> = {
  "zh-CN": {
    cannotReadDevices: "当前环境无法读取麦克风列表。",
    deviceListFailedPrefix: "麦克风列表读取失败：",
    cannotDetectVolume: "当前环境无法检测音量。",
    volumeFailedPrefix: "音量检测失败：",
    autoDevice: "自动检测（麦克风）",
    selectedFallback: "已选择麦克风",
    autoHint: "使用系统默认麦克风",
    microphoneNamePrefix: "麦克风",
    modalLabel: "麦克风",
    closePicker: "关闭麦克风选择",
    title: "麦克风",
    description: "选择能捕捉到您声音的麦克风。如果指示条没有移动，请尝试其他麦克风。",
    noDevices: "未检测到外部麦克风，当前会使用系统默认设备。",
    inputVolume: "输入音量",
    audioInputDevice: "音频输入设备",
    externalMicrophone: "外部麦克风",
    microphone: "麦克风"
  },
  "zh-TW": {
    cannotReadDevices: "當前環境無法讀取麥克風列表。",
    deviceListFailedPrefix: "麥克風列表讀取失敗：",
    cannotDetectVolume: "當前環境無法檢測音量。",
    volumeFailedPrefix: "音量檢測失敗：",
    autoDevice: "自動檢測（麥克風）",
    selectedFallback: "已選擇麥克風",
    autoHint: "使用系統預設麥克風",
    microphoneNamePrefix: "麥克風",
    modalLabel: "麥克風",
    closePicker: "關閉麥克風選擇",
    title: "麥克風",
    description: "選擇能捕捉到您聲音的麥克風。如果指示條沒有移動，請嘗試其他麥克風。",
    noDevices: "未檢測到外部麥克風，當前會使用系統預設裝置。",
    inputVolume: "輸入音量",
    audioInputDevice: "音訊輸入裝置",
    externalMicrophone: "外部麥克風",
    microphone: "麥克風"
  },
  "en-US": {
    cannotReadDevices: "This environment cannot read the microphone list.",
    deviceListFailedPrefix: "Failed to read microphones: ",
    cannotDetectVolume: "This environment cannot detect input volume.",
    volumeFailedPrefix: "Volume detection failed: ",
    autoDevice: "Auto detect (microphone)",
    selectedFallback: "Selected microphone",
    autoHint: "Use the system default microphone",
    microphoneNamePrefix: "Microphone",
    modalLabel: "Microphone",
    closePicker: "Close microphone picker",
    title: "Microphone",
    description:
      "Choose a microphone that can capture your voice. If the meter does not move, try another microphone.",
    noDevices: "No external microphone detected. The system default device will be used.",
    inputVolume: "Input volume",
    audioInputDevice: "Audio input device",
    externalMicrophone: "External microphone",
    microphone: "Microphone"
  }
};

function getMicrophonePickerText(language: InterfaceLanguage | undefined): MicrophonePickerText {
  return MICROPHONE_PICKER_TEXT[language ?? "zh-CN"] ?? MICROPHONE_PICKER_TEXT["zh-CN"];
}

export function MicrophoneDevicePicker({
  selectedDeviceId,
  onDeviceChange,
  language,
  variant = "modal",
  selectId = "recording-input-device",
  openSignal,
  hideTrigger = false
}: MicrophoneDevicePickerProps): React.JSX.Element {
  const text = getMicrophonePickerText(language);
  const [open, setOpen] = useState(() =>
    getMicrophoneDevicePickerInitialOpen(openSignal !== undefined && openSignal > 0)
  );
  const [devices, setDevices] = useState<InputDevice[]>([]);
  const [activeBars, setActiveBars] = useState(0);
  const [status, setStatus] = useState<string | undefined>(undefined);

  const refreshDevices = useCallback(async (): Promise<void> => {
    if (!canEnumerateDevices()) {
      setStatus(text.cannotReadDevices);
      return;
    }

    try {
      const nextDevices = dedupeInputDevices(await navigator.mediaDevices.enumerateDevices());
      setDevices(nextDevices);
      setStatus(undefined);
    } catch (error) {
      setStatus(`${text.deviceListFailedPrefix}${formatError(error)}`);
    }
  }, [text]);

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
          setStatus(text.cannotDetectVolume);
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
            rawRms > smoothedRms
              ? MICROPHONE_METER_ATTACK_SMOOTHING
              : MICROPHONE_METER_RELEASE_SMOOTHING;
          smoothedRms += (rawRms - smoothedRms) * smoothing;

          const now = window.performance.now();
          if (now - lastMeterUpdateMs >= MICROPHONE_METER_UPDATE_INTERVAL_MS) {
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
        setStatus(`${text.volumeFailedPrefix}${formatError(error)}`);
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
  }, [open, refreshDevices, selectedDeviceId, text]);

  const selectedLabel = useMemo(() => {
    if (!selectedDeviceId) {
      return text.autoDevice;
    }
    return devices.find((device) => device.deviceId === selectedDeviceId)?.label || text.selectedFallback;
  }, [devices, selectedDeviceId, text]);

  const options = useMemo(
    () => [
      {
        deviceId: AUTO_DEVICE_ID,
        label: text.autoDevice,
        hint: text.autoHint
      },
      ...devices.map((device, index) => ({
        deviceId: device.deviceId,
        label: device.label || `${text.microphoneNamePrefix} ${index + 1}`,
        hint: describeDevice(device.label, text)
      }))
    ],
    [devices, text]
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
        <div className="mic-picker__modal" role="dialog" aria-modal="true" aria-label={text.modalLabel}>
          <button
            className="mic-picker__backdrop"
            type="button"
            aria-label={text.closePicker}
            onClick={() => setOpen(false)}
          />
          <section className="mic-picker__panel">
            <button
              className="mic-picker__close"
              type="button"
              aria-label={text.closePicker}
              onClick={() => setOpen(false)}
            >
              ×
            </button>
            <header>
              <h3>{text.title}</h3>
              <p>{text.description}</p>
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
                    <MicrophoneLevelMeter
                      activeBars={selected ? activeBars : 0}
                      active={selected}
                      label={text.inputVolume}
                    />
                  </button>
                );
              })}
            </div>

            {devices.length === 0 && (
              <p className="mic-picker__status">{text.noDevices}</p>
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

export function MicrophoneLevelMeter({
  activeBars,
  active,
  label,
  barCount = MICROPHONE_METER_BARS
}: {
  activeBars: number;
  active: boolean;
  label: string;
  barCount?: number;
}): React.JSX.Element {
  const safeBarCount = Math.max(1, Math.floor(barCount));
  const safeActiveBars = active ? Math.max(0, Math.min(safeBarCount, activeBars)) : 0;
  const levelPercent = Math.round((safeActiveBars / safeBarCount) * 100);

  return (
    <span
      className="mic-level-meter"
      data-active={active}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={levelPercent}
      style={{ "--mic-level": levelPercent / 100 } as React.CSSProperties}
    >
      {Array.from({ length: safeBarCount }, (_, index) => {
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

function describeDevice(label: string, text: MicrophonePickerText): string {
  if (!label) {
    return text.audioInputDevice;
  }
  return /usb|ugreen|audio/i.test(label) ? text.externalMicrophone : text.microphone;
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
