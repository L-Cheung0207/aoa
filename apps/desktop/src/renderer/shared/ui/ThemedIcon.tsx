import type { CSSProperties } from "react";

type IconTheme = "light" | "dark";

export type ThemedIconName =
  | "app"
  | "brand"
  | "home"
  | "history"
  | "settings"
  | "info"
  | "navHomeActive"
  | "navHomeMuted"
  | "navHistoryActive"
  | "navHistoryMuted"
  | "navSettingsActive"
  | "navSettingsMuted"
  | "navAboutActive"
  | "navAboutMuted"
  | "user"
  | "power"
  | "refresh"
  | "mail"
  | "file"
  | "privacy"
  | "keyboard"
  | "language"
  | "microphone"
  | "appearance"
  | "appBehavior"
  | "connection"
  | "metricDuration"
  | "metricCharacters"
  | "metricRewrite"
  | "metricTranslation"
  | "watermarkDuration"
  | "watermarkCharacters"
  | "watermarkRewrite"
  | "watermarkTranslation"
  | "announcement"
  | "close"
  | "check"
  | "warning";

export type ThemedIconMode = "mask" | "image";

interface ThemedIconProps {
  name: ThemedIconName;
  mode?: ThemedIconMode;
  className?: string;
  label?: string;
}

const ICON_FILES: Record<ThemedIconName, Record<IconTheme, string>> = {
  app: { light: "app-chat.svg", dark: "app-chat.svg" },
  brand: { light: "brand-logo.svg", dark: "brand-logo.svg" },
  home: { light: "nav-home-active.svg", dark: "nav-home-active.svg" },
  history: { light: "nav-history-active.svg", dark: "nav-history-active.svg" },
  settings: { light: "settings-hex.svg", dark: "settings-hex.svg" },
  info: { light: "info-circle.svg", dark: "nav-about-active.svg" },
  navHomeActive: { light: "nav-home-active.svg", dark: "nav-home-active.svg" },
  navHomeMuted: { light: "nav-home-muted.svg", dark: "nav-home-muted.svg" },
  navHistoryActive: { light: "nav-history-active.svg", dark: "nav-history-active.svg" },
  navHistoryMuted: { light: "nav-history-muted.svg", dark: "nav-history-muted.svg" },
  navSettingsActive: { light: "nav-settings-active.svg", dark: "nav-settings-active.svg" },
  navSettingsMuted: { light: "nav-settings-muted.svg", dark: "nav-settings-muted.svg" },
  navAboutActive: { light: "nav-about-active.svg", dark: "nav-about-active.svg" },
  navAboutMuted: { light: "nav-about-muted.svg", dark: "nav-about-muted.svg" },
  user: { light: "user-outline.svg", dark: "user-outline.svg" },
  power: { light: "power.svg", dark: "power.svg" },
  refresh: { light: "refresh.svg", dark: "refresh.svg" },
  mail: { light: "mail.svg", dark: "mail.svg" },
  file: { light: "document-file.svg", dark: "document-file.svg" },
  privacy: { light: "settings-hex.svg", dark: "nav-settings-active.svg" },
  keyboard: { light: "settings-shortcuts.svg", dark: "settings-shortcuts.svg" },
  language: { light: "settings-language.svg", dark: "settings-language.svg" },
  microphone: { light: "settings-audio.svg", dark: "settings-audio.svg" },
  appearance: { light: "settings-appearance.svg", dark: "settings-appearance.svg" },
  appBehavior: { light: "settings-app-behavior.svg", dark: "settings-app-behavior.svg" },
  connection: { light: "settings-connection.svg", dark: "settings-connection.svg" },
  metricDuration: { light: "metric-duration.svg", dark: "metric-duration.svg" },
  metricCharacters: { light: "metric-characters.svg", dark: "metric-characters.svg" },
  metricRewrite: { light: "metric-rewrite.svg", dark: "metric-rewrite.svg" },
  metricTranslation: { light: "metric-translation.svg", dark: "metric-translation.svg" },
  watermarkDuration: { light: "watermark-duration.svg", dark: "watermark-duration.svg" },
  watermarkCharacters: { light: "watermark-characters.svg", dark: "watermark-characters.svg" },
  watermarkRewrite: { light: "watermark-rewrite.svg", dark: "watermark-rewrite.svg" },
  watermarkTranslation: { light: "watermark-translation.svg", dark: "watermark-translation.svg" },
  announcement: { light: "announcement-speaker.svg", dark: "announcement-speaker.svg" },
  close: { light: "close-x.svg", dark: "close-x.svg" },
  check: { light: "check-circle.svg", dark: "check-circle.svg" },
  warning: { light: "warning-bell.svg", dark: "warning-bell.svg" },
};

export function ThemedIcon({
  name,
  mode = "image",
  className,
  label,
}: ThemedIconProps): React.JSX.Element {
  const files = ICON_FILES[name];
  const classes = [
    "themed-icon",
    `themed-icon--${mode}`,
    className,
  ].filter(Boolean).join(" ");
  const accessibility = label
    ? { role: "img" as const, "aria-label": label }
    : { "aria-hidden": true as const };

  if (mode === "mask") {
    const style = {
      "--themed-icon-light": `url("${buildIconPath("light", files.light)}")`,
      "--themed-icon-dark": `url("${buildIconPath("dark", files.dark)}")`,
    } as CSSProperties;

    return <span className={classes} style={style} {...accessibility} />;
  }

  return (
    <span className={classes} {...accessibility}>
      <img
        className="themed-icon__image themed-icon__image--light"
        src={buildIconPath("light", files.light)}
        alt=""
      />
      <img
        className="themed-icon__image themed-icon__image--dark"
        src={buildIconPath("dark", files.dark)}
        alt=""
      />
    </span>
  );
}

function buildIconPath(theme: IconTheme, fileName: string): string {
  return `icons/app/${theme}/${encodeURIComponent(fileName)}`;
}
