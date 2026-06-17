export type AppRoute =
  | "home"
  | "settings"
  | "installer"
  | "uninstall"
  | "loginSetup"
  | "overlay";

export function resolveRoute(hash = window.location.hash || ""): AppRoute {
  if (hash.includes("login-setup")) {
    return "loginSetup";
  }

  if (hash.includes("home")) {
    return "home";
  }

  if (hash.includes("uninstall")) {
    return "uninstall";
  }

  if (hash.includes("installer")) {
    return "installer";
  }

  return hash.includes("settings") ? "settings" : "overlay";
}
