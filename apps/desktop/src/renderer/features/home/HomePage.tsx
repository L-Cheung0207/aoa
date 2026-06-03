import type { AppSettings } from "@voice/shared";
import type { ReactNode } from "react";
import { formatShortcutLabel } from "../../shared/keyboard/shortcutCapture";
import { EMPTY_HOME_USAGE_STATS, type HomeUsageStats } from "./homeUsageStats";

export {
  shouldSuspendGlobalShortcutsForOnboardingStep,
  calculateMicrophoneLevel,
  buildMicrophoneLevelBarStyles,
  buildOnboardingShortcutDemoClassName,
} from "./components/OnboardingGuide";

interface HomePageProps {
  settings?: AppSettings;
  usageStats?: HomeUsageStats;
  versionLabel?: string;
  onOpenOnboarding?(): void;
  onCheckUpdates?(): void;
  onContact?(): void;
  initialSettings?: AppSettings;
  initialSettingsOpen?: boolean;
  initialOnboardingOpen?: boolean;
  initialOnboardingStep?: number;
}

type EditableShortcutKey =
  | "toggleRecording"
  | "processSelection"
  | "translateDictation";

const DEFAULT_VERSION_LABEL = "v0.0.0";

export function HomePage({
  initialSettings,
  onCheckUpdates,
  onContact,
  onOpenOnboarding,
  settings,
  usageStats = EMPTY_HOME_USAGE_STATS,
  versionLabel = DEFAULT_VERSION_LABEL,
}: HomePageProps): React.JSX.Element {
  const displayedSettings = settings ?? initialSettings;

  return (
    <>
      <section className="home-hero" aria-label="歡迎">
        <header className="home-hero__header">
          <div className="home-hero__title">
            <span className="home-hero__title-icon" aria-hidden="true">
              <BrandIcon />
            </span>
            <div>
              <h1>歡迎使用 Voice Assistant Service</h1>
              <p>
                輕觸一次開始說話。按{" "}
                <kbd>
                  {getShortcutDisplay(displayedSettings, "toggleRecording")}
                </kbd>{" "}
                來完成。
              </p>
            </div>
          </div>
          <button
            className="home-hero__help"
            type="button"
            aria-label="開啟首次引導"
            onClick={onOpenOnboarding}
          >
            <span className="home-hero__help-icon" aria-hidden="true">
              ?
            </span>
            使用教程
          </button>
        </header>

        <ul className="home-shortcuts" aria-label="快捷鍵說明">
          <ShortcutItem
            dot="blue"
            label="語音輸入"
            keys={getShortcutDisplay(displayedSettings, "toggleRecording")}
          />
          <ShortcutItem
            dot="purple"
            label="智慧翻譯"
            keys={getShortcutDisplay(displayedSettings, "translateDictation")}
          />
          <ShortcutItem
            dot="green"
            label="智慧改寫"
            keys={getShortcutDisplay(displayedSettings, "processSelection")}
          />
        </ul>
      </section>

      <section className="home-stats" aria-label="使用概覽">
        <MetricCard
          tone="duration"
          icon={<DurationMetricIcon />}
          value={formatInteger(usageStats.durationMinutes)}
          unit="min"
          label="累計口述時長"
          watermark={<DurationWatermarkIcon />}
        />
        <MetricCard
          tone="characters"
          icon={<CharactersMetricIcon />}
          value={formatInteger(usageStats.dictatedCharacters)}
          unit="字元"
          label="口述字元數"
          watermark={<CharactersWatermarkIcon />}
        />
        <MetricCard
          tone="rewrite"
          icon={<RewriteMetricIcon />}
          value={formatInteger(usageStats.rewriteCount)}
          unit="次"
          label="改寫輔助次數"
          watermark={<RewriteWatermarkIcon />}
        />
        <MetricCard
          tone="translation"
          icon={<TranslationMetricIcon />}
          value={formatInteger(usageStats.translationCount)}
          unit="次"
          label="翻譯次數"
          watermark={<TranslationWatermarkIcon />}
        />
      </section>

      <footer className="home-footer" aria-label="底部資訊">
        <div className="home-footer__left">
          <span>當前版本 {versionLabel}</span>
          <button
            type="button"
            className="home-footer__link"
            onClick={onCheckUpdates}
          >
            檢查更新
          </button>
        </div>
        <button type="button" className="home-footer__link" onClick={onContact}>
          聯絡我們
        </button>
      </footer>
    </>
  );
}

function ShortcutItem({
  dot,
  label,
  keys,
}: {
  dot: "green" | "purple" | "blue";
  label: string;
  keys: string;
}): React.JSX.Element {
  return (
    <li className="home-shortcuts__item">
      <span
        className={`home-shortcuts__dot home-shortcuts__dot--${dot}`}
        aria-hidden="true"
      />
      <span className="home-shortcuts__label">{label}</span>
      <kbd className="home-shortcuts__keys">{keys}</kbd>
    </li>
  );
}

function MetricCard({
  tone,
  icon,
  value,
  unit,
  label,
  watermark,
}: {
  tone: "duration" | "characters" | "rewrite" | "translation";
  icon: ReactNode;
  value: string;
  unit: string;
  label: string;
  watermark: ReactNode;
}): React.JSX.Element {
  return (
    <article className={`home-metric home-metric--${tone}`}>
      <span className="home-metric__watermark" aria-hidden="true">
        {watermark}
      </span>
      <div className="home-metric__row">
        <span className="home-metric__icon" aria-hidden="true">
          {icon}
        </span>
        <strong className="home-metric__value">
          {value} <small>{unit}</small>
        </strong>
      </div>
      <p className="home-metric__label">{label}</p>
    </article>
  );
}

function DurationMetricIcon(): React.JSX.Element {
  return (
    <svg viewBox="0 0 32 32" fill="none">
      <path d="M9 3h14M9 29h14" />
      <path d="M11 3c0 6 10 7 10 13S11 23 11 29" />
      <path d="M21 3c0 6-10 7-10 13s10 7 10 13" />
    </svg>
  );
}

function CharactersMetricIcon(): React.JSX.Element {
  return (
    <svg viewBox="0 0 32 32" fill="none">
      <path
        className="home-metric__accent-stroke"
        d="M5 9c1-2 3-2 4 0M4 14c2-3 5-3 7 0"
      />
      <rect x="11" y="6" width="14" height="20" rx="4" />
      <path d="M14 11h8M18 11v10" />
    </svg>
  );
}

function RewriteMetricIcon(): React.JSX.Element {
  return (
    <svg viewBox="0 0 32 32" fill="none">
      <path
        className="home-metric__accent-stroke"
        d="M9 4v6M6 7h6M23 5v5M20.5 7.5h5"
      />
      <path d="M9 25 25 9" />
      <path d="m20 8 4 4" />
    </svg>
  );
}

function TranslationMetricIcon(): React.JSX.Element {
  return (
    <svg viewBox="0 0 32 32" fill="none">
      <path
        className="home-metric__accent-stroke"
        d="M7 7h10M12 4v15M8 18c3-2 5-5 6-11"
      />
      <path className="home-metric__accent-stroke" d="M7 25h4M7 25v-4" />
      <path d="m19 24 4-12 4 12M21 20h4" />
    </svg>
  );
}

function DurationWatermarkIcon(): React.JSX.Element {
  return (
    <svg viewBox="0 0 112 112" fill="none">
      <path d="M56 22v-9M43 12h26" />
      <circle cx="56" cy="64" r="34" />
      <path d="M56 64 74 47" />
      <path d="M90 38h8M97 55h6M94 74h8" />
      <circle cx="89" cy="26" r="4" fill="currentColor" stroke="none" />
    </svg>
  );
}

function CharactersWatermarkIcon(): React.JSX.Element {
  return (
    <svg viewBox="0 0 124 112" fill="none">
      <circle cx="39" cy="24" r="11" />
      <rect x="26" y="49" width="40" height="48" rx="3" />
      <path d="M83 24h22M83 50h22M83 77h22" />
      <path d="M65 49h12M66 97h12" />
      <circle cx="112" cy="18" r="5" fill="currentColor" stroke="none" />
      <circle cx="111" cy="52" r="4" fill="currentColor" stroke="none" />
      <circle cx="111" cy="78" r="4" fill="currentColor" stroke="none" />
    </svg>
  );
}

function RewriteWatermarkIcon(): React.JSX.Element {
  return (
    <svg viewBox="0 0 124 112" fill="none">
      <rect x="24" y="22" width="58" height="72" rx="4" />
      <path d="M36 41h26M36 56h20M36 71h16" />
      <circle cx="83" cy="76" r="20" />
      <path d="m83 64 4 8 9 1-7 6 2 9-8-5-8 5 2-9-7-6 9-1 4-8z" />
      <path d="M80 15h24v72" />
    </svg>
  );
}

function TranslationWatermarkIcon(): React.JSX.Element {
  return (
    <svg viewBox="0 0 124 112" fill="none">
      <rect x="24" y="28" width="64" height="64" rx="4" />
      <path d="M36 16h64v64" />
      <path d="M44 50h28M58 39v34M48 72c7-5 12-13 15-22" />
      <text x="62" y="73" textAnchor="middle">
        文
      </text>
    </svg>
  );
}

function formatInteger(value: number): string {
  return Math.round(value).toLocaleString("en-US");
}

function getShortcutDisplay(
  settings: AppSettings | undefined,
  key: EditableShortcutKey,
): string {
  const shortcut = settings?.shortcuts[key];
  return shortcut ? formatShortcutLabel(shortcut) : "-";
}

function BrandIcon(): React.JSX.Element {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
      <path d="M8 9h8" />
      <path d="M8 13h5" />
    </svg>
  );
}
