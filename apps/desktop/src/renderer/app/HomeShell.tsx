import { useCallback, useEffect, useMemo, useState } from "react";
import type { AppSettings, HistoryRecord } from "@voice/shared";
import { HistoryPage } from "../features/history/HistoryPage";
import { HomePage } from "../features/home/HomePage";
import { OnboardingGuide } from "../features/home/components/OnboardingGuide";
import { buildHomeUsageStats } from "../features/home/homeUsageStats";
import { normalizeConnectionSettings } from "../features/settings/connectionSettings";
import { SettingsPage } from "../features/settings/SettingsPage";
import { UpdateReadyDialog } from "../features/update/MockUpdateDialog";
import type { UpdateReadyPayload } from "../../preload/voiceApi";

interface HomeShellProps {
  initialSettings?: AppSettings;
  initialSection?: HomeSection;
  initialOnboardingOpen?: boolean;
  initialOnboardingStep?: number;
}

type HomeSection = "home" | "history" | "settings" | "about";

const DEFAULT_VERSION_LABEL = "v0.0.0";
const DEFAULT_DEVICE_NAME = "本機裝置";

export function HomeShell({
  initialSettings,
  initialSection,
  initialOnboardingOpen,
  initialOnboardingStep
}: HomeShellProps): React.JSX.Element {
  const [settings, setSettings] = useState<AppSettings | undefined>(() => {
    if (!initialSettings) {
      return undefined;
    }
    return normalizeConnectionSettings(initialSettings);
  });
  const [loadError, setLoadError] = useState<string | undefined>(undefined);
  const [onboardingOpen, setOnboardingOpen] = useState<boolean>(
    () => initialOnboardingOpen ?? false
  );
  const [toast, setToast] = useState<string | undefined>(undefined);
  const [activeSection, setActiveSection] = useState<HomeSection>(() => initialSection ?? "home");
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [updateReady, setUpdateReady] = useState<UpdateReadyPayload | undefined>(undefined);
  const [historyRecords, setHistoryRecords] = useState<HistoryRecord[]>([]);
  const [versionLabel, setVersionLabel] = useState(DEFAULT_VERSION_LABEL);
  const [deviceName, setDeviceName] = useState(DEFAULT_DEVICE_NAME);
  const usageStats = useMemo(
    () => buildHomeUsageStats(historyRecords),
    [historyRecords]
  );
  const openUpdateDialog = useCallback((): void => {
    setToast(undefined);
    void window.voiceAI
      .checkForUpdates()
      .then((result) => {
        if (result.status === "checking") {
          setToast("更新检查已启动，下载完成后会提示重启");
        } else if (result.status === "disabled") {
          setToast("开发模式下不会自动检查更新");
        }
      })
      .catch((error) => {
        setToast(error instanceof Error ? error.message : String(error));
      });
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
            translation: next.translation,
            recording: next.recording,
            ws: next.ws,
            llm: next.llm
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
    []
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
    const unsubscribeOpenHomeSection = window.voiceAI.onOpenHomeSection((section) => {
      setActiveSection(section);
    });
    const unsubscribeOpenUpdateDialog =
      window.voiceAI.onOpenUpdateDialog(openUpdateDialog);
    const unsubscribeUpdateReady = window.voiceAI.onUpdateReady((payload) => {
      setUpdateReady(payload);
      setUpdateDialogOpen(true);
      setToast(undefined);
    });
    const unsubscribeSettingsChanged = window.voiceAI.onSettingsChanged((next) => {
      setSettings(normalizeConnectionSettings(next));
    });
    const unsubscribeHistoryRecordCreated = window.voiceAI.onHistoryRecordCreated(
      (record) => {
        setHistoryRecords((current) => upsertHistoryRecord(current, record));
      }
    );
    const unsubscribeHistoryRecordDeleted = window.voiceAI.onHistoryRecordDeleted(
      ({ id }) => {
        setHistoryRecords((current) =>
          current.filter((record) => record.id !== id)
        );
      }
    );
    return () => {
      unsubscribeOpenSettings();
      unsubscribeOpenHomeSection();
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

  return (
    <main className="home-page">
      <WindowControls modalOpen={onboardingOpen} />
      <aside className="home-sidebar">
        <nav className="home-nav" aria-label="主導航">
          <button
            className={activeSection === "home" ? "home-nav__item home-nav__item--active" : "home-nav__item"}
            type="button"
            onClick={() => setActiveSection("home")}
          >
            <HomeIcon />
            首頁
          </button>
          <button
            className={activeSection === "history" ? "home-nav__item home-nav__item--active" : "home-nav__item"}
            type="button"
            onClick={() => setActiveSection("history")}
          >
            <HistoryIcon />
            歷史記錄
          </button>
          <button
            className={activeSection === "settings" ? "home-nav__item home-nav__item--active" : "home-nav__item"}
            type="button"
            aria-label="開啟設定"
            onClick={() => setActiveSection("settings")}
          >
            <SettingsIcon />
            設定
          </button>
          <button
            className={activeSection === "about" ? "home-nav__item home-nav__item--active" : "home-nav__item"}
            type="button"
            aria-label="關於"
            onClick={() => setActiveSection("about")}
          >
            <InfoIcon />
            關於
          </button>
        </nav>

        <div className="home-sidebar__footer" aria-label="使用者區">
          <div className="home-user">
            <span className="home-user__icon" aria-hidden="true">
              <UserIcon />
            </span>
            <span className="home-user__name">hi, {deviceName}</span>
          </div>
          <button
            className="home-power"
            type="button"
            aria-label="退出"
            onClick={() => window.voiceAI.controlHomeWindow("close")}
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
        {activeSection === "history" ? <HistoryPage /> : null}
        {activeSection === "settings" ? <SettingsPage initialSettings={settings} /> : null}
        {activeSection === "about" ? (
          <AboutPage
            versionLabel={versionLabel}
            onCheckUpdates={openUpdateDialog}
            onContact={() => { }}
            onOpenAgreement={() => { }}
            onOpenPrivacy={() => { }}
          />
        ) : null}
        {activeSection === "home" ? (
          <HomePage
            {...(settings !== undefined ? { settings } : {})}
            usageStats={usageStats}
            versionLabel={versionLabel}
            onOpenOnboarding={() => setOnboardingOpen(true)}
            onCheckUpdates={openUpdateDialog}
            onContact={() => setToast("聯絡我們待接入")}
          />
        ) : null}
      </section>
      {onboardingOpen && (
        <OnboardingGuide
          settings={settings}
          {...(initialOnboardingStep !== undefined
            ? { initialStep: initialOnboardingStep }
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
        <UpdateReadyDialog
          version={updateReady?.version}
          onClose={() => setUpdateDialogOpen(false)}
          onRestart={() => {
            void window.voiceAI.restartToUpdate().catch((error) => {
              setToast(error instanceof Error ? error.message : String(error));
            });
          }}
        />
      ) : null}
    </main>
  );
}

function AboutPage({
  versionLabel,
  onCheckUpdates,
  onContact,
  onOpenAgreement,
  onOpenPrivacy
}: {
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
    <div className="about-page" role="region" aria-label="關於頁面">
      <h1 className="about-page__title">關於</h1>

      <div className="about-page__content">
        <div className="about-page__brand" aria-hidden="true">
          <BrandIcon />
        </div>

        <div className="about-page__headline">
          <p className="about-page__welcome">歡迎使用 Voice Assistant Service</p>
          <p className="about-page__version">當前版本 {versionLabel}</p>
        </div>

        <div className="about-page__actions" role="list" aria-label="關於頁面操作">
          <AboutActionRow
            icon="refresh"
            label="檢查更新"
            onClick={() => runWithToast("檢查更新：功能開發中", onCheckUpdates)}
          />
          <AboutActionRow
            icon="mail"
            label="聯絡我們"
            onClick={() => runWithToast("聯絡我們：功能開發中", onContact)}
          />
          <AboutActionRow
            icon="file"
            label="使用者協議"
            onClick={() => runWithToast("使用者協議：功能開發中", onOpenAgreement)}
          />
          <AboutActionRow
            icon="shield"
            label="隱私政策"
            onClick={() => runWithToast("隱私政策：功能開發中", onOpenPrivacy)}
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
  onClick
}: {
  icon: "refresh" | "mail" | "file" | "shield";
  label: string;
  onClick(): void;
}): React.JSX.Element {
  return (
    <button type="button" className="about-row" role="listitem" onClick={onClick}>
      <span className="about-row__icon" aria-hidden="true">
        {icon === "refresh" ? <RefreshIcon /> : null}
        {icon === "mail" ? <MailIcon /> : null}
        {icon === "file" ? <FileIcon /> : null}
        {icon === "shield" ? <ShieldIcon /> : null}
      </span>
      <span className="about-row__label">{label}</span>
    </button>
  );
}

function WindowControls({ modalOpen }: { modalOpen: boolean }): React.JSX.Element {
  return (
    <div
      className={`home-window-controls${modalOpen ? " home-window-controls--modal" : ""}`}
      aria-label="視窗控制"
    >
      <button
        className="home-window-controls__button"
        type="button"
        aria-label="最小化"
        onClick={() => window.voiceAI.controlHomeWindow("minimize")}
      >
        <span className="home-window-controls__icon home-window-controls__icon--minimize" />
      </button>
      <button
        className="home-window-controls__button"
        type="button"
        aria-label="最大化"
        onClick={() => window.voiceAI.controlHomeWindow("toggleMaximize")}
      >
        <span className="home-window-controls__icon home-window-controls__icon--maximize" />
      </button>
      <button
        className="home-window-controls__button home-window-controls__button--close"
        type="button"
        aria-label="關閉"
        onClick={() => window.voiceAI.controlHomeWindow("close")}
      >
        <span className="home-window-controls__icon home-window-controls__icon--close" />
      </button>
    </div>
  );
}

function upsertHistoryRecord(
  records: HistoryRecord[],
  nextRecord: HistoryRecord
): HistoryRecord[] {
  const withoutRecord = records.filter((record) => record.id !== nextRecord.id);
  return [nextRecord, ...withoutRecord].sort((left, right) =>
    right.startedAt.localeCompare(left.startedAt)
  );
}

function formatVersionLabel(appVersion: string): string {
  const normalized = appVersion.trim();
  if (!normalized) {
    return DEFAULT_VERSION_LABEL;
  }
  return normalized.startsWith("v") ? normalized : `v${normalized}`;
}

function HomeIcon(): React.JSX.Element {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function HistoryIcon(): React.JSX.Element {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function SettingsIcon(): React.JSX.Element {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function InfoIcon(): React.JSX.Element {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  );
}

function UserIcon(): React.JSX.Element {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M20 21a8 8 0 1 0-16 0" />
    </svg>
  );
}

function PowerIcon(): React.JSX.Element {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 2v10" />
      <path d="M18.4 6.6a9 9 0 1 1-12.8 0" />
    </svg>
  );
}

function BrandIcon(): React.JSX.Element {
  return (
    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
      <path d="M8 9h8" />
      <path d="M8 13h5" />
    </svg>
  );
}

function RefreshIcon(): React.JSX.Element {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a9 9 0 1 1-2.64-6.36" />
      <polyline points="21 3 21 9 15 9" />
    </svg>
  );
}

function MailIcon(): React.JSX.Element {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16v16H4z" />
      <path d="M22 6l-10 7L2 6" />
    </svg>
  );
}

function FileIcon(): React.JSX.Element {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
    </svg>
  );
}

function ShieldIcon(): React.JSX.Element {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}
