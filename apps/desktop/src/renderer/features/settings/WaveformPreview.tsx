import type { WaveformStyle } from "@voice/shared";
import { VolumeMeter } from "../../shared/ui/VolumeMeter";
import { useEffect, useMemo, useState } from "react";

interface WaveformPreviewProps {
  styleName: WaveformStyle;
  label?: string;
  compact?: boolean;
}

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

export function WaveformPreview({
  styleName,
  label = "預覽",
  compact = false
}: WaveformPreviewProps): React.JSX.Element {
  const [level, setLevel] = useState(0.12);
  const motionOK = useMemo(() => !prefersReducedMotion(), []);

  useEffect(() => {
    if (!motionOK) {
      setLevel(0.12);
      return;
    }

    let raf = 0;
    const seed = styleName
      .split("")
      .reduce((acc, ch) => (acc * 33 + ch.charCodeAt(0)) % 997, 11);
    const start = performance.now();

    const tick = (now: number) => {
      const t = (now - start) / 1000;
      // 0~0.18：接近真實麥克風 RMS（再由 VolumeMeter 內部 gain 放大）
      const wobble =
        0.06 +
        0.055 * (0.5 + 0.5 * Math.sin(t * (2.2 + (seed % 7) * 0.08))) +
        0.035 * (0.5 + 0.5 * Math.sin(t * (3.4 + (seed % 5) * 0.11) + seed * 0.07));
      const micro =
        0.01 *
        (0.5 + 0.5 * Math.sin(t * (7.4 + (seed % 9) * 0.13) + seed * 0.19));
      setLevel(clamp01((wobble + micro) / 1.0) * 0.18);
      raf = window.requestAnimationFrame(tick);
    };

    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, [motionOK, styleName]);

  return (
    <div
      className={`waveform-preview waveform-preview--${styleName}${
        compact ? " waveform-preview--compact" : ""
      }`}
      aria-label={`${label}聲波效果`}
    >
      <span className="waveform-preview__button waveform-preview__button--cancel" aria-hidden="true">
        <svg viewBox="0 0 16 16" width="16" height="16">
          <path
            d="M4.2 4.2 11.8 11.8M11.8 4.2 4.2 11.8"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="2.6"
          />
        </svg>
      </span>
      <VolumeMeter level={level} active={true} styleName={styleName} />
      <span
        className="waveform-preview__button waveform-preview__button--confirm"
        aria-hidden="true"
      >
        <svg viewBox="0 0 20 20" width="22" height="22">
          <path
            d="m4.2 10.4 4 4.1 7.6-9"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2.5"
          />
        </svg>
      </span>
    </div>
  );
}
