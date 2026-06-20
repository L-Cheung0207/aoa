import { useCallback, useEffect, useMemo, useState } from "react";
import type { AppSettings, HistoryRecord } from "@voice/shared";
import { HistoryPage } from "../features/history/HistoryPage";
import { HomePage } from "../features/home/HomePage";
import { MicrophoneHelpDialog } from "../features/home/MicrophoneHelpDialog";
import { OnboardingGuide } from "../features/home/components/OnboardingGuide";
import { buildHomeUsageStats } from "../features/home/homeUsageStats";
import privacyPolicyMarkdown from "../features/home/legal-documents/privacy-policy.md?raw";
import userAgreementMarkdown from "../features/home/legal-documents/user-agreement.md?raw";
import microphoneUnavailableHelpMarkdown from "../features/home/microphone-unavailable-help.md?raw";
import { normalizeConnectionSettings } from "../features/settings/connectionSettings";
import { SettingsPage } from "../features/settings/SettingsPage";
import { MarkdownContent } from "../shared/ui/MarkdownContent";
import { ThemedIcon } from "../shared/ui/ThemedIcon";
import { UpdateDialog } from "../features/update/UpdateDialog";
import type { UpdateReadyPayload } from "../../preload/voiceApi";

interface HomeShellProps {
  initialSettings?: AppSettings;
  initialSection?: HomeSection;
  initialOnboardingOpen?: boolean;
  initialOnboardingStep?: number;
}

type HomeSection = "home" | "history" | "settings" | "about";
type HomeShellLanguage = AppSettings["ui"]["language"];
type LegalDocumentKind = "agreement" | "privacy";

const DEFAULT_VERSION_LABEL = "v0.0.0";
const DEFAULT_DEVICE_NAME = "";
const FOREGROUND_SHORTCUT_THROTTLE_MS = 500;

type HomeShellText = {
  mainNav: string;
  home: string;
  history: string;
  settings: string;
  openSettings: string;
  about: string;
  localDevice: string;
  userArea: string;
  exitApp: string;
  contactPending: string;
  updateChecking: string;
  updateUpToDate: string;
  updateFoundVersionPrefix: string;
  updateFoundVersionSuffix: string;
  updateFoundGeneric: string;
  updateDisabled: string;
  updateFailed: string;
  aboutPage: string;
  aboutActions: string;
  welcome: string;
  description: string;
  currentVersionPrefix: string;
  checkUpdates: string;
  contact: string;
  userAgreement: string;
  privacyPolicy: string;
  contactPendingToast: string;
  closeLegalDocument: string;
  windowControls: string;
  minimize: string;
  maximize: string;
  close: string;
};

const HOME_SHELL_TEXT: Record<HomeShellLanguage, HomeShellText> = {
  "zh-CN": {
    mainNav: "主导航",
    home: "首页",
    history: "历史记录",
    settings: "设置",
    openSettings: "打开设置",
    about: "关于",
    localDevice: "本机设备",
    userArea: "用户区",
    exitApp: "退出登录",
    contactPending: "联系我们待接入",
    updateChecking: "正在检查更新...",
    updateUpToDate: "目前已是最新版本",
    updateFoundVersionPrefix: "发现新版本 ",
    updateFoundVersionSuffix: "，正在下载...",
    updateFoundGeneric: "发现新版本，正在下载...",
    updateDisabled: "开发模式下无法检查更新",
    updateFailed: "检查更新失败",
    aboutPage: "关于页面",
    aboutActions: "关于页面操作",
    welcome: "欢迎使用 Voice Assistant Service",
    description:
      "Voice Assistant Service 介绍内容，Voice Assistant Service 介绍内容，Voice Assistant Service 介绍内容，Voice Assistant Service 介绍内容，Voice Assistant Service 介绍内容，Voice Assistant Service 介绍内容，Voice Assistant Service 介绍内容，Voice Assistant Service 介绍内容，Voice Assistant Service 介绍内容，Voice Assistant Service 介绍内容",
    currentVersionPrefix: "当前版本 ",
    checkUpdates: "检查更新",
    contact: "联系我们",
    userAgreement: "用户服务协议",
    privacyPolicy: "隐私政策",
    contactPendingToast: "联系我们：功能开发中",
    closeLegalDocument: "关闭",
    windowControls: "窗口控制",
    minimize: "最小化",
    maximize: "最大化",
    close: "关闭",
  },
  "zh-TW": {
    mainNav: "主導航",
    home: "首頁",
    history: "歷史記錄",
    settings: "設定",
    openSettings: "開啟設定",
    about: "關於",
    localDevice: "本機裝置",
    userArea: "使用者區",
    exitApp: "登出",
    contactPending: "聯絡我們待接入",
    updateChecking: "正在檢查更新...",
    updateUpToDate: "目前已是最新版本",
    updateFoundVersionPrefix: "發現新版本 ",
    updateFoundVersionSuffix: "，正在下載...",
    updateFoundGeneric: "發現新版本，正在下載...",
    updateDisabled: "開發模式下無法檢查更新",
    updateFailed: "檢查更新失敗",
    aboutPage: "關於頁面",
    aboutActions: "關於頁面操作",
    welcome: "歡迎使用 Voice Assistant Service",
    description: "欢迎来到 告别打字的时代。欢迎使用 Voice Assistant。",
    currentVersionPrefix: "當前版本 ",
    checkUpdates: "檢查更新",
    contact: "聯絡我們",
    userAgreement: "用户服务协议",
    privacyPolicy: "隱私政策",
    contactPendingToast: "聯絡我們：功能開發中",
    closeLegalDocument: "關閉",
    windowControls: "視窗控制",
    minimize: "最小化",
    maximize: "最大化",
    close: "關閉",
  },
  "en-US": {
    mainNav: "Main navigation",
    home: "Home",
    history: "History",
    settings: "Settings",
    openSettings: "Open settings",
    about: "About",
    localDevice: "Local device",
    userArea: "User area",
    exitApp: "Log out",
    contactPending: "Contact us is not available yet",
    updateChecking: "Checking for updates...",
    updateUpToDate: "You're up to date",
    updateFoundVersionPrefix: "Version ",
    updateFoundVersionSuffix: " found, downloading...",
    updateFoundGeneric: "New version found, downloading...",
    updateDisabled: "Update checks are unavailable in development mode",
    updateFailed: "Update check failed",
    aboutPage: "About page",
    aboutActions: "About page actions",
    welcome: "Welcome to Voice Assistant Service",
    description:
      "Voice Assistant Service introduction content. Voice Assistant Service introduction content. Voice Assistant Service introduction content. Voice Assistant Service introduction content. Voice Assistant Service introduction content.",
    currentVersionPrefix: "Current version ",
    checkUpdates: "Check for updates",
    contact: "Contact us",
    userAgreement: "User Agreement",
    privacyPolicy: "Privacy Policy",
    contactPendingToast: "Contact us: coming soon",
    closeLegalDocument: "Close",
    windowControls: "Window controls",
    minimize: "Minimize",
    maximize: "Maximize",
    close: "Close",
  },
};

function getHomeShellText(
  language: HomeShellLanguage | undefined,
): HomeShellText {
  return HOME_SHELL_TEXT[language ?? "zh-CN"] ?? HOME_SHELL_TEXT["zh-CN"];
}

export function HomeShell({
  initialSettings,
  initialSection,
  initialOnboardingOpen,
  initialOnboardingStep,
}: HomeShellProps): React.JSX.Element {
  const [settings, setSettings] = useState<AppSettings | undefined>(() => {
    if (!initialSettings) {
      return undefined;
    }
    return normalizeConnectionSettings(initialSettings);
  });
  const [loadError, setLoadError] = useState<string | undefined>(undefined);
  const [onboardingOpen, setOnboardingOpen] = useState<boolean>(
    () => initialOnboardingOpen ?? false,
  );
  const [onboardingStep, setOnboardingStep] = useState<number | undefined>(
    initialOnboardingStep,
  );
  const [toast, setToast] = useState<string | undefined>(undefined);
  const [activeSection, setActiveSection] = useState<HomeSection>(
    () => initialSection ?? "home",
  );
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [microphoneHelpOpen, setMicrophoneHelpOpen] = useState(false);
  const [legalDocument, setLegalDocument] = useState<
    LegalDocumentKind | undefined
  >(undefined);
  const [updateReady, setUpdateReady] = useState<
    UpdateReadyPayload | undefined
  >(undefined);
  const [historyRecords, setHistoryRecords] = useState<HistoryRecord[]>([]);
  const [versionLabel, setVersionLabel] = useState(DEFAULT_VERSION_LABEL);
  const [deviceName, setDeviceName] = useState(DEFAULT_DEVICE_NAME);
  const usageStats = useMemo(
    () => buildHomeUsageStats(historyRecords),
    [historyRecords],
  );
  const shellText = getHomeShellText(settings?.ui.language);

  const openUpdateDialog = useCallback((): void => {
    setUpdateDialogOpen(true);
    setToast(undefined);
  }, []);

  const updateSettings = useCallback(
    (updater: AppSettings | ((draft: AppSettings) => AppSettings)): void => {
      setSettings((current) => {
        if (!current) {
          return current;
        }
        const next =
          typeof updater === "function"
            ? (updater as (draft: AppSettings) => AppSettings)(current)
            : updater;
        void window.voiceAI
          .updateSettings({
            shortcuts: next.shortcuts,
            developer: next.developer,
            translation: next.translation,
            recording: next.recording,
            ws: next.ws,
            llm: next.llm,
          })
          .then((persisted) => {
            setSettings(normalizeConnectionSettings(persisted));
          })
          .catch((error) => {
            setToast(error instanceof Error ? error.message : String(error));
          });
        return next;
      });
    },
    [],
  );

  useEffect(() => {
    if (initialSettings) {
      setSettings(normalizeConnectionSettings(initialSettings));
    }
  }, [initialSettings]);

  useEffect(() => {
    if (initialSettings) {
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const current = await window.voiceAI.getSettings();
        if (!cancelled) {
          setSettings(normalizeConnectionSettings(current));
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : String(error));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [initialSettings]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    let cancelled = false;
    void window.voiceAI
      .getAppInfo()
      .then((info) => {
        if (!cancelled) {
          setDeviceName(info.deviceName || DEFAULT_DEVICE_NAME);
          setVersionLabel(formatVersionLabel(info.appVersion));
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : String(error));
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    let cancelled = false;
    void window.voiceAI
      .listHistoryRecords()
      .then((records) => {
        if (!cancelled) {
          setHistoryRecords(records);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : String(error));
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const unsubscribeOpenSettings = window.voiceAI.onOpenSettingsPanel(() => {
      setActiveSection("settings");
    });
    const unsubscribeOpenHomeSection = window.voiceAI.onOpenHomeSection(
      (section) => {
        setActiveSection(section);
      },
    );
    const unsubscribeOpenOnboardingStep = window.voiceAI.onOpenOnboardingStep(
      (step) => {
        setOnboardingStep(step);
        setOnboardingOpen(true);
        setMicrophoneHelpOpen(false);
        setActiveSection("home");
      },
    );
    const unsubscribeOpenMicrophoneHelp = window.voiceAI.onOpenMicrophoneHelp(
      () => {
        setActiveSection("home");
        setOnboardingOpen(false);
        setMicrophoneHelpOpen(true);
        setToast(undefined);
      },
    );
    const unsubscribeOpenUpdateDialog =
      window.voiceAI.onOpenUpdateDialog(openUpdateDialog);
    const unsubscribeUpdateReady = window.voiceAI.onUpdateReady((payload) => {
      setUpdateReady(payload);
      setUpdateDialogOpen(true);
      setToast(undefined);
    });
    const unsubscribeSettingsChanged = window.voiceAI.onSettingsChanged(
      (next) => {
        setSettings(normalizeConnectionSettings(next));
      },
    );
    const unsubscribeHistoryRecordCreated =
      window.voiceAI.onHistoryRecordCreated((record) => {
        setHistoryRecords((current) => upsertHistoryRecord(current, record));
      });
    const unsubscribeHistoryRecordDeleted =
      window.voiceAI.onHistoryRecordDeleted(({ id }) => {
        setHistoryRecords((current) =>
          current.filter((record) => record.id !== id),
        );
      });
    return () => {
      unsubscribeOpenSettings();
      unsubscribeOpenHomeSection();
      unsubscribeOpenOnboardingStep();
      unsubscribeOpenMicrophoneHelp();
      unsubscribeOpenUpdateDialog();
      unsubscribeUpdateReady();
      unsubscribeSettingsChanged();
      unsubscribeHistoryRecordCreated();
      unsubscribeHistoryRecordDeleted();
    };
  }, [openUpdateDialog]);

  useEffect(() => {
    if (!toast) {
      return;
    }
    const handle = window.setTimeout(() => setToast(undefined), 2400);
    return () => window.clearTimeout(handle);
  }, [toast]);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }
    const theme = settings?.ui?.theme;
    if (!theme) {
      return;
    }
    document.documentElement.dataset.theme = theme;
  }, [settings?.ui?.theme]);

  useEffect(() => {
    if (!settings) {
      return;
    }

    let rightCommandDown = false;
    let lastTriggerAtMs = 0;
    const triggerShortcut = (
      event: KeyboardEvent,
      mode: "direct" | "processSelection" | "translate",
    ): void => {
      event.preventDefault();
      event.stopPropagation();
      const now = window.performance.now();
      if (now - lastTriggerAtMs < FOREGROUND_SHORTCUT_THROTTLE_MS) {
        return;
      }
      lastTriggerAtMs = now;
      window.voiceAI.triggerRecording({ mode });
    };

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.repeat) {
        return;
      }
      if (isRightCommandEvent(event)) {
        rightCommandDown = true;
        if (settings.shortcuts.toggleRecording === "MetaRight") {
          triggerShortcut(event, "direct");
        }
        return;
      }
      if (!event.metaKey) {
        rightCommandDown = false;
        return;
      }
      if (
        rightCommandDown &&
        settings.shortcuts.translateDictation === "MetaRight+RightShift" &&
        isRightShiftEvent(event)
      ) {
        triggerShortcut(event, "translate");
        return;
      }
      if (
        rightCommandDown &&
        settings.shortcuts.processSelection === "MetaRight+/" &&
        isSlashEvent(event)
      ) {
        triggerShortcut(event, "processSelection");
      }
    };

    const handleKeyUp = (event: KeyboardEvent): void => {
      if (isRightCommandEvent(event)) {
        rightCommandDown = false;
      }
    };

    const handleBlur = (): void => {
      rightCommandDown = false;
    };

    window.addEventListener("keydown", handleKeyDown, true);
    window.addEventListener("keyup", handleKeyUp, true);
    window.addEventListener("blur", handleBlur);
    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
      window.removeEventListener("keyup", handleKeyUp, true);
      window.removeEventListener("blur", handleBlur);
    };
  }, [settings]);

  return (
    <main className="home-page">
      <WindowControls
        modalOpen={onboardingOpen || updateDialogOpen || microphoneHelpOpen}
        text={shellText}
      />
      <aside className="home-sidebar">
        <nav className="home-nav" aria-label={shellText.mainNav}>
          <button
            className={
              activeSection === "home"
                ? "home-nav__item home-nav__item--active"
                : "home-nav__item"
            }
            type="button"
            onClick={() => setActiveSection("home")}
          >
            <HomeIcon active={activeSection === "home"} />
            {shellText.home}
          </button>
          <button
            className={
              activeSection === "history"
                ? "home-nav__item home-nav__item--active"
                : "home-nav__item"
            }
            type="button"
            onClick={() => setActiveSection("history")}
          >
            <HistoryIcon active={activeSection === "history"} />
            {shellText.history}
          </button>
          <button
            className={
              activeSection === "settings"
                ? "home-nav__item home-nav__item--active"
                : "home-nav__item"
            }
            type="button"
            aria-label={shellText.openSettings}
            onClick={() => setActiveSection("settings")}
          >
            <SettingsIcon active={activeSection === "settings"} />
            {shellText.settings}
          </button>
          <button
            className={
              activeSection === "about"
                ? "home-nav__item home-nav__item--active"
                : "home-nav__item"
            }
            type="button"
            aria-label={shellText.about}
            onClick={() => setActiveSection("about")}
          >
            <InfoIcon active={activeSection === "about"} />
            {shellText.about}
          </button>
        </nav>

        <div className="home-sidebar__footer" aria-label={shellText.userArea}>
          <div className="home-user">
            <span className="home-user__icon" aria-hidden="true">
              <UserIcon />
            </span>
            <span className="home-user__name">
              hi, {deviceName || shellText.localDevice}
            </span>
          </div>
          <button
            className="home-power"
            type="button"
            aria-label={shellText.exitApp}
            onClick={() => {
              void window.voiceAI.logout();
            }}
          >
            <PowerIcon />
          </button>
        </div>
      </aside>

      <section
        className={
          activeSection === "history"
            ? "home-content home-content--history"
            : activeSection === "settings"
              ? "home-content home-content--settings"
              : activeSection === "about"
                ? "home-content home-content--about"
                : "home-content"
        }
      >
        {activeSection === "history" ? (
          <HistoryPage language={settings?.ui.language} />
        ) : null}
        {activeSection === "settings" ? (
          <SettingsPage initialSettings={settings} />
        ) : null}
        {activeSection === "about" ? (
          <AboutPage
            text={shellText}
            versionLabel={versionLabel}
            onCheckUpdates={openUpdateDialog}
            onContact={() => {}}
            onOpenAgreement={() => setLegalDocument("agreement")}
            onOpenPrivacy={() => setLegalDocument("privacy")}
          />
        ) : null}
        {activeSection === "home" ? (
          <HomePage
            {...(settings !== undefined ? { settings } : {})}
            usageStats={usageStats}
            versionLabel={versionLabel}
            onOpenOnboarding={() => {
              setOnboardingStep(undefined);
              setOnboardingOpen(true);
            }}
            onCheckUpdates={openUpdateDialog}
            onContact={() => setToast(shellText.contactPending)}
          />
        ) : null}
      </section>
      {onboardingOpen && (
        <OnboardingGuide
          settings={settings}
          {...(onboardingStep !== undefined
            ? { initialStep: onboardingStep }
            : {})}
          onClose={() => setOnboardingOpen(false)}
          onOpenSettings={() => {
            setOnboardingOpen(false);
            setActiveSection("settings");
          }}
          onSettingsChange={updateSettings}
        />
      )}

      {loadError ? (
        <div className="home-toast" role="status" aria-live="polite">
          {loadError}
        </div>
      ) : null}
      {toast ? (
        <div className="home-toast" role="status" aria-live="polite">
          {toast}
        </div>
      ) : null}
      {updateDialogOpen ? (
        <UpdateDialog
          currentVersion={versionLabel}
          language={settings?.ui.language}
          readyPayload={updateReady}
          onClose={() => {
            setUpdateDialogOpen(false);
            setUpdateReady(undefined);
          }}
          onRestartError={setToast}
        />
      ) : null}
      {microphoneHelpOpen ? (
        <MicrophoneHelpDialog
          markdown={microphoneUnavailableHelpMarkdown}
          onClose={() => setMicrophoneHelpOpen(false)}
        />
      ) : null}
      {legalDocument ? (
        <LegalDocumentDialog
          title={
            legalDocument === "agreement"
              ? shellText.userAgreement
              : shellText.privacyPolicy
          }
          closeLabel={shellText.closeLegalDocument}
          markdown={
            legalDocument === "agreement"
              ? userAgreementMarkdown
              : privacyPolicyMarkdown
          }
          onClose={() => setLegalDocument(undefined)}
        />
      ) : null}
    </main>
  );
}

function AboutPage({
  text,
  versionLabel,
  onCheckUpdates,
  onContact,
  onOpenAgreement,
  onOpenPrivacy,
}: {
  text: HomeShellText;
  versionLabel: string;
  onCheckUpdates(): void;
  onContact(): void;
  onOpenAgreement(): void;
  onOpenPrivacy(): void;
}): React.JSX.Element {
  const [aboutToast, setAboutToast] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!aboutToast) {
      return;
    }
    const handle = window.setTimeout(() => setAboutToast(undefined), 1800);
    return () => window.clearTimeout(handle);
  }, [aboutToast]);

  const runWithToast = (message: string, action: () => void): void => {
    setAboutToast(message);
    action();
  };

  return (
    <div className="about-page" role="region" aria-label={text.aboutPage}>
      <h1 className="about-page__title">{text.about}</h1>

      <div className="about-page__content">
        <div className="about-page__brand" aria-hidden="true">
          <BrandIcon />
        </div>

        <div className="about-page__headline">
          <p className="about-page__welcome">{text.welcome}</p>
          <p className="about-page__version">
            {text.currentVersionPrefix}
            {versionLabel}
          </p>
        </div>

        <p className="about-page__description">{text.description}</p>

        <div
          className="about-page__actions"
          role="list"
          aria-label={text.aboutActions}
        >
          <AboutActionRow
            icon="aboutCheckUpdates"
            label={text.checkUpdates}
            onClick={onCheckUpdates}
          />
          <AboutActionRow
            icon="aboutContactEmail"
            label={text.contact}
            onClick={() => runWithToast(text.contactPendingToast, onContact)}
          />
          <AboutActionRow
            icon="aboutUserAgreement"
            label={text.userAgreement}
            onClick={onOpenAgreement}
          />
          <AboutActionRow
            icon="aboutPrivacyPolicy"
            label={text.privacyPolicy}
            onClick={onOpenPrivacy}
          />
        </div>
      </div>

      {aboutToast ? (
        <div className="about-toast" role="status" aria-live="polite">
          {aboutToast}
        </div>
      ) : null}
    </div>
  );
}

function AboutActionRow({
  icon,
  label,
  onClick,
}: {
  icon:
    | "aboutCheckUpdates"
    | "aboutContactEmail"
    | "aboutUserAgreement"
    | "aboutPrivacyPolicy";
  label: string;
  onClick(): void;
}): React.JSX.Element {
  return (
    <button
      type="button"
      className="about-row"
      role="listitem"
      onClick={onClick}
    >
      <span className="about-row__icon" aria-hidden="true">
        <AboutActionIcon name={icon} />
      </span>
      <span className="about-row__label">{label}</span>
    </button>
  );
}

function LegalDocumentDialog({
  title,
  closeLabel,
  markdown,
  onClose,
}: {
  title: string;
  closeLabel: string;
  markdown: string;
  onClose(): void;
}): React.JSX.Element {
  return (
    <div
      className="legal-document-dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="legal-document-dialog-title"
    >
      <section className="legal-document-dialog__window">
        <header className="legal-document-dialog__header">
          <div>
            <h1 id="legal-document-dialog-title">{title}</h1>
          </div>
          <button
            type="button"
            className="legal-document-dialog__close"
            aria-label={closeLabel}
            onClick={onClose}
          >
            <ThemedIcon name="close" />
          </button>
        </header>
        <MarkdownContent
          className="legal-document-dialog__content"
          markdown={markdown}
        />
      </section>
    </div>
  );
}

function WindowControls({
  modalOpen,
  text,
}: {
  modalOpen: boolean;
  text: HomeShellText;
}): React.JSX.Element {
  return (
    <div
      className={`home-window-controls${modalOpen ? " home-window-controls--modal" : ""}`}
      aria-label={text.windowControls}
    >
      <button
        className="home-window-controls__button"
        type="button"
        aria-label={text.minimize}
        onClick={() => window.voiceAI.controlHomeWindow("minimize")}
      >
        <span className="home-window-controls__icon home-window-controls__icon--minimize" />
      </button>
      <button
        className="home-window-controls__button"
        type="button"
        aria-label={text.maximize}
        onClick={() => window.voiceAI.controlHomeWindow("toggleMaximize")}
      >
        <span className="home-window-controls__icon home-window-controls__icon--maximize" />
      </button>
      <button
        className="home-window-controls__button home-window-controls__button--close"
        type="button"
        aria-label={text.close}
        onClick={() => window.voiceAI.controlHomeWindow("close")}
      >
        <span className="home-window-controls__icon home-window-controls__icon--close" />
      </button>
    </div>
  );
}

function upsertHistoryRecord(
  records: HistoryRecord[],
  nextRecord: HistoryRecord,
): HistoryRecord[] {
  const withoutRecord = records.filter((record) => record.id !== nextRecord.id);
  return [nextRecord, ...withoutRecord].sort((left, right) =>
    right.startedAt.localeCompare(left.startedAt),
  );
}

function formatVersionLabel(appVersion: string): string {
  const normalized = appVersion.trim();
  if (!normalized) {
    return DEFAULT_VERSION_LABEL;
  }
  return normalized.startsWith("v") ? normalized : `v${normalized}`;
}

export function isRightCommandEvent(event: KeyboardEvent): boolean {
  return event.code === "MetaRight" || (event.key === "Meta" && event.location === 2);
}

export function isRightShiftEvent(event: KeyboardEvent): boolean {
  return event.code === "ShiftRight" || (event.key === "Shift" && event.location === 2);
}

export function isSlashEvent(event: KeyboardEvent): boolean {
  return event.code === "Slash" || event.key === "/" || event.key === "?";
}

function HomeIcon({ active }: { active: boolean }): React.JSX.Element {
  return (
    <ThemedIcon name={active ? "navHomeActive" : "navHomeMuted"} mode="image" />
  );
}

function HistoryIcon({ active }: { active: boolean }): React.JSX.Element {
  return (
    <ThemedIcon
      name={active ? "navHistoryActive" : "navHistoryMuted"}
      mode="image"
    />
  );
}

function SettingsIcon({ active }: { active: boolean }): React.JSX.Element {
  return (
    <ThemedIcon
      name={active ? "navSettingsActive" : "navSettingsMuted"}
      mode="image"
    />
  );
}

function InfoIcon({ active }: { active: boolean }): React.JSX.Element {
  return (
    <ThemedIcon
      name={active ? "navAboutActive" : "navAboutMuted"}
      mode="image"
    />
  );
}

function UserIcon(): React.JSX.Element {
  return <ThemedIcon name="app" mode="image" />;
}

function PowerIcon(): React.JSX.Element {
  return <ThemedIcon name="power" mode="image" />;
}

function BrandIcon(): React.JSX.Element {
  return <ThemedIcon name="brand" mode="image" />;
}

function AboutActionIcon({
  name,
}: {
  name:
    | "aboutCheckUpdates"
    | "aboutContactEmail"
    | "aboutUserAgreement"
    | "aboutPrivacyPolicy";
}): React.JSX.Element {
  return <ThemedIcon name={name} mode="image" />;
}
