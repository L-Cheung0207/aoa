export const MICROPHONE_METER_BARS = 6;
export const MICROPHONE_METER_BAR_THRESHOLDS = [0.02, 0.04, 0.064, 0.096, 0.144, 0.224] as const;
export const MICROPHONE_METER_DROP_MARGIN = 0.012;
export const MICROPHONE_METER_UPDATE_INTERVAL_MS = 120;
export const MICROPHONE_METER_ATTACK_SMOOTHING = 0.24;
export const MICROPHONE_METER_RELEASE_SMOOTHING = 0.08;

export function calculateRms(samples: Uint8Array): number {
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

export function calculateActiveMeterBars(
  rms: number,
  currentActiveBars = 0,
  barCount = MICROPHONE_METER_BARS
): number {
  const safeBarCount = Math.max(0, Math.floor(barCount));
  const thresholds = buildMeterThresholds(safeBarCount);
  const nextActiveBars = thresholds.filter((threshold) => rms >= threshold).length;

  if (nextActiveBars >= currentActiveBars || currentActiveBars <= 1) {
    return nextActiveBars;
  }

  const currentThreshold = thresholds[currentActiveBars - 1] ?? 0;
  return rms >= currentThreshold - MICROPHONE_METER_DROP_MARGIN ? currentActiveBars : nextActiveBars;
}

function buildMeterThresholds(barCount: number): number[] {
  if (barCount <= 0) {
    return [];
  }

  if (barCount === MICROPHONE_METER_BAR_THRESHOLDS.length) {
    return [...MICROPHONE_METER_BAR_THRESHOLDS];
  }

  const first = MICROPHONE_METER_BAR_THRESHOLDS[0] ?? 0;
  const last =
    MICROPHONE_METER_BAR_THRESHOLDS[MICROPHONE_METER_BAR_THRESHOLDS.length - 1] ?? first;
  if (barCount === 1) {
    return [first];
  }

  return Array.from({ length: barCount }, (_unused, index) => {
    const ratio = index / (barCount - 1);
    return first + (last - first) * ratio;
  });
}
