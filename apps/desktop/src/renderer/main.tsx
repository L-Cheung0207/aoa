import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app/App";
import { HomeShell } from "./app/HomeShell";
import { resolveRoute } from "./app/routes";
import { SettingsPage } from "./features/settings/SettingsPage";
import { InstallerPage } from "./features/installer/InstallerPage";
import { UninstallPage } from "./features/uninstall/UninstallPage";
import "./styles/app.css";

function resolveInitialTheme(): "dark" | "light" | undefined {
  const theme = new URLSearchParams(window.location.search).get("theme");
  return theme === "dark" || theme === "light" ? theme : undefined;
}

function resolveInitialHomeSection(): "home" | "history" | "settings" | "about" {
  const hash = window.location.hash;
  if (hash.includes("home-history")) {
    return "history";
  }
  if (hash.includes("home-settings")) {
    return "settings";
  }
  if (hash.includes("home-about")) {
    return "about";
  }
  return "home";
}

// 基於 hash 的輕量級路由分發：
// - 懸浮窗載入 URL 不帶 hash 或為空 → 渲染 <App/> (OverlayWindow)
// - 首頁窗載入 URL 包含 "home" → 渲染 <HomeShell/>
// - 設定窗載入 URL 包含 "settings" (開發態 "#/settings"，生產態 "#settings") → 渲染 <SettingsPage/>
const route = resolveRoute();
const initialTheme = resolveInitialTheme();
if (initialTheme) {
  document.documentElement.dataset.theme = initialTheme;
}

createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    {route === "home" ? (
      <HomeShell initialSection={resolveInitialHomeSection()} />
    ) : route === "settings" ? (
      <SettingsPage />
    ) : route === "installer" ? (
      <InstallerPage />
    ) : route === "uninstall" ? (
      <UninstallPage />
    ) : (
      <App />
    )}
  </React.StrictMode>
);
