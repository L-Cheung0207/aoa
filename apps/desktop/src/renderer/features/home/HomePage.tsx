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
type HomePageLanguage = AppSettings["ui"]["language"];

const DEFAULT_VERSION_LABEL = "v0.0.0";

type HomePageText = {
  welcomeAria: string;
  title: string;
  shortcutPrefix: string;
  shortcutSuffix: string;
  openGuide: string;
  guide: string;
  shortcutsLabel: string;
  voiceInput: string;
  smartTranslate: string;
  smartRewrite: string;
  overview: string;
  dictatedDuration: string;
  dictatedCharacters: string;
  rewriteCount: string;
  translationCount: string;
  charactersUnit: string;
  timesUnit: string;
  translationGlyph: string;
  footer: string;
  currentVersionPrefix: string;
  checkUpdates: string;
  contact: string;
};

const HOME_PAGE_TEXT: Record<HomePageLanguage, HomePageText> = {
  "zh-CN": {
    welcomeAria: "欢迎",
    title: "欢迎使用 Voice Assistant Service",
    shortcutPrefix: "轻触一次开始说话。按",
    shortcutSuffix: "来完成。",
    openGuide: "打开首次引导",
    guide: "使用教程",
    shortcutsLabel: "快捷键说明",
    voiceInput: "语音输入",
    smartTranslate: "智能翻译",
    smartRewrite: "智能改写",
    overview: "使用概览",
    dictatedDuration: "累计口述时长",
    dictatedCharacters: "口述字数",
    rewriteCount: "改写辅助次数",
    translationCount: "翻译次数",
    charactersUnit: "字",
    timesUnit: "次",
    translationGlyph: "文",
    footer: "底部信息",
    currentVersionPrefix: "当前版本 ",
    checkUpdates: "检查更新",
    contact: "意见反馈"
  },
  "zh-TW": {
    welcomeAria: "歡迎",
    title: "歡迎使用 Voice Assistant Service",
    shortcutPrefix: "輕觸一次開始說話。按",
    shortcutSuffix: "來完成。",
    openGuide: "開啟首次引導",
    guide: "使用教程",
    shortcutsLabel: "快捷鍵說明",
    voiceInput: "語音輸入",
    smartTranslate: "智慧翻譯",
    smartRewrite: "智慧改寫",
    overview: "使用概覽",
    dictatedDuration: "累計口述時長",
    dictatedCharacters: "口述字元數",
    rewriteCount: "改寫輔助次數",
    translationCount: "翻譯次數",
    charactersUnit: "字元",
    timesUnit: "次",
    translationGlyph: "文",
    footer: "底部資訊",
    currentVersionPrefix: "當前版本 ",
    checkUpdates: "檢查更新",
    contact: "意見回饋"
  },
  "en-US": {
    welcomeAria: "Welcome",
    title: "Welcome to Voice Assistant Service",
    shortcutPrefix: "Tap once to start speaking. Press",
    shortcutSuffix: "to finish.",
    openGuide: "Open onboarding guide",
    guide: "Guide",
    shortcutsLabel: "Shortcut guide",
    voiceInput: "Voice Input",
    smartTranslate: "Smart Translate",
    smartRewrite: "Smart Rewrite",
    overview: "Usage Overview",
    dictatedDuration: "Dictation Time",
    dictatedCharacters: "Dictated Characters",
    rewriteCount: "Rewrite Assists",
    translationCount: "Translations",
    charactersUnit: "chars",
    timesUnit: "times",
    translationGlyph: "A",
    footer: "Footer",
    currentVersionPrefix: "Current version ",
    checkUpdates: "Check for updates",
    contact: "Feedback"
  }
};

function getHomePageText(language: HomePageLanguage | undefined): HomePageText {
  return HOME_PAGE_TEXT[language ?? "zh-CN"] ?? HOME_PAGE_TEXT["zh-CN"];
}

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
  const text = getHomePageText(displayedSettings?.ui.language);

  return (
    <>
      <section className="home-hero" aria-label={text.welcomeAria}>
        <header className="home-hero__header">
          <div className="home-hero__title">
            <span className="home-hero__title-icon" aria-hidden="true">
              <BrandIcon />
            </span>
            <div>
              <h1>{text.title}</h1>
              <p>
                {text.shortcutPrefix}{" "}
                <kbd>
                  {getShortcutDisplay(displayedSettings, "toggleRecording")}
                </kbd>{" "}
                {text.shortcutSuffix}
              </p>
            </div>
          </div>
          <button
            className="home-hero__help"
            type="button"
            aria-label={text.openGuide}
            onClick={onOpenOnboarding}
          >
            <span className="home-hero__help-icon" aria-hidden="true">
              ?
            </span>
            {text.guide}
          </button>
        </header>

        <ul className="home-shortcuts" aria-label={text.shortcutsLabel}>
          <ShortcutItem
            dot="blue"
            label={text.voiceInput}
            keys={getShortcutDisplay(displayedSettings, "toggleRecording")}
          />
          <ShortcutItem
            dot="purple"
            label={text.smartTranslate}
            keys={getShortcutDisplay(displayedSettings, "translateDictation")}
          />
          <ShortcutItem
            dot="green"
            label={text.smartRewrite}
            keys={getShortcutDisplay(displayedSettings, "processSelection")}
          />
        </ul>
      </section>

      <section className="home-stats" aria-label={text.overview}>
        <MetricCard
          tone="duration"
          icon={<DurationMetricIcon />}
          value={formatInteger(usageStats.durationMinutes)}
          unit="min"
          label={text.dictatedDuration}
          watermark={<DurationWatermarkIcon />}
        />
        <MetricCard
          tone="characters"
          icon={<CharactersMetricIcon />}
          value={formatInteger(usageStats.dictatedCharacters)}
          unit={text.charactersUnit}
          label={text.dictatedCharacters}
          watermark={<CharactersWatermarkIcon />}
        />
        <MetricCard
          tone="rewrite"
          icon={<RewriteMetricIcon />}
          value={formatInteger(usageStats.rewriteCount)}
          unit={text.timesUnit}
          label={text.rewriteCount}
          watermark={<RewriteWatermarkIcon />}
        />
        <MetricCard
          tone="translation"
          icon={<TranslationMetricIcon />}
          value={formatInteger(usageStats.translationCount)}
          unit={text.timesUnit}
          label={text.translationCount}
          watermark={<TranslationWatermarkIcon glyph={text.translationGlyph} />}
        />
      </section>

      <footer className="home-footer" aria-label={text.footer}>
        <div className="home-footer__left">
          <span>
            {text.currentVersionPrefix}
            {versionLabel}
          </span>
          <button
            type="button"
            className="home-footer__link"
            onClick={onCheckUpdates}
          >
            {text.checkUpdates}
          </button>
        </div>
        <button type="button" className="home-footer__link" onClick={onContact}>
          {text.contact}
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

function TranslationWatermarkIcon({ glyph }: { glyph: string }): React.JSX.Element {
  return (
    <svg viewBox="0 0 124 112" fill="none">
      <rect x="24" y="28" width="64" height="64" rx="4" />
      <path d="M36 16h64v64" />
      <path d="M44 50h28M58 39v34M48 72c7-5 12-13 15-22" />
      <text x="62" y="73" textAnchor="middle">
        {glyph}
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
