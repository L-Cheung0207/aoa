import type { WaveformStyle } from "@voice/shared";

export interface VolumeMeterProps {
  level: number;
  active: boolean;
  styleName: WaveformStyle;
  ariaLabel?: string;
  samples?: Int16Array;
}

const METER_BAR_COUNT = 14;
const LEVEL_GAIN = 3.2;
const LEVEL_CURVE_EXPONENT = 1.35;
const PCM_MAX = 32768;
const WAVEFORM_GAIN = 6.4;

const WAVEFORM_AMPLITUDE_PATTERNS: Record<WaveformStyle, readonly number[]> = {
  "waveform-sunset": [
    0.28, 0.38, 0.5, 0.62, 0.74, 0.86, 0.98, 1, 0.96, 0.86, 0.72, 0.58, 0.46, 0.4
  ],
  "waveform-mono": [
    0.34, 0.42, 0.52, 0.62, 0.74, 0.86, 0.96, 1, 0.96, 0.84, 0.68, 0.52, 0.42, 0.38
  ],
  "waveform-candy": [
    0.3, 0.42, 0.58, 0.76, 0.94, 0.86, 0.66, 0.74, 0.98, 0.84, 0.58, 0.7, 1, 0.8
  ]
};

export function VolumeMeter({
  level,
  active,
  styleName,
  ariaLabel = "Microphone volume",
  samples
}: VolumeMeterProps): React.JSX.Element {
  const normalized = active ? Math.min(1, Math.max(0, level * LEVEL_GAIN)) : 0;
  const voicedLevel = active ? Math.pow(normalized, LEVEL_CURVE_EXPONENT) : 0;
  const pattern =
    WAVEFORM_AMPLITUDE_PATTERNS[styleName] ??
    WAVEFORM_AMPLITUDE_PATTERNS["waveform-sunset"];
  const bars = Array.from({ length: METER_BAR_COUNT }, (_unused, index) => {
    const waveformWeight =
      active && samples !== undefined && samples.length > 0
        ? getWaveformWeight(samples, index)
        : undefined;
    const phase = Math.sin(index * 1.7) * 0.08;
    const fallbackWeight = pattern[index] ?? 0.5;
    const weight = waveformWeight ?? fallbackWeight;
    const scale = active
      ? Math.min(
          1,
          waveformWeight === undefined
            ? 0.16 + voicedLevel * fallbackWeight + phase * normalized
            : 0.12 + weight * WAVEFORM_GAIN
        )
      : 0.1;
    const opacity = active ? 0.92 : 0.38;
    const colorStop = index / Math.max(1, METER_BAR_COUNT - 1);
    return { colorStop, index, opacity, phase, scale, weight };
  });
  const className = `volume-meter volume-meter--${styleName}`;

  return (
    <div
      className={className}
      aria-label={ariaLabel}
      data-active={active}
      data-style={styleName}
      style={{ "--meter-level": normalized.toFixed(3) } as React.CSSProperties}
    >
      {bars.map((bar) => (
        <span
          key={bar.index}
          className="volume-meter__bar"
          style={
            {
              "--bar-index": bar.index,
              "--bar-opacity": bar.opacity.toFixed(3),
              "--bar-phase": bar.phase.toFixed(3),
              "--bar-weight": bar.weight.toFixed(3),
              "--bar-color-stop": bar.colorStop.toFixed(3),
              transform: `scaleY(${bar.scale.toFixed(3)})`
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}

function getWaveformWeight(samples: Int16Array, barIndex: number): number {
  const segmentStart = Math.floor((barIndex / METER_BAR_COUNT) * samples.length);
  const segmentEnd = Math.max(
    segmentStart + 1,
    Math.floor(((barIndex + 1) / METER_BAR_COUNT) * samples.length)
  );
  let peak = 0;
  let sumSquares = 0;

  for (let index = segmentStart; index < segmentEnd; index += 1) {
    const amplitude = Math.abs(samples[index] ?? 0) / PCM_MAX;
    peak = Math.max(peak, amplitude);
    sumSquares += amplitude * amplitude;
  }

  const rms = Math.sqrt(sumSquares / Math.max(1, segmentEnd - segmentStart));
  return Math.min(1, peak * 0.72 + rms * 0.28);
}
