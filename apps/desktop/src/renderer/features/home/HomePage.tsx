import type { AppSettings } from "@voice/shared";
import type { ReactNode } from "react";
import { formatShortcutLabel } from "../../shared/keyboard/shortcutCapture";
import { ThemedIcon } from "../../shared/ui/ThemedIcon";
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
  return <ThemedIcon name="metricDuration" mode="image" />;
}

function CharactersMetricIcon(): React.JSX.Element {
  return <ThemedIcon name="metricCharacters" mode="image" />;
}

function RewriteMetricIcon(): React.JSX.Element {
  return <ThemedIcon name="metricRewrite" mode="image" />;
}

function TranslationMetricIcon(): React.JSX.Element {
  return <ThemedIcon name="metricTranslation" mode="image" />;
}

function DurationWatermarkIcon(): React.JSX.Element {
  return <ThemedIcon name="watermarkDuration" mode="image" />;
}

function CharactersWatermarkIcon(): React.JSX.Element {
  return <ThemedIcon name="watermarkCharacters" mode="image" />;
}

function RewriteWatermarkIcon(): React.JSX.Element {
  return <ThemedIcon name="watermarkRewrite" mode="image" />;
}

function TranslationWatermarkIcon({ glyph }: { glyph: string }): React.JSX.Element {
  void glyph;
  return <ThemedIcon name="watermarkTranslation" mode="image" />;
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
  return <ThemedIcon name="brand" mode="image" />;
}
