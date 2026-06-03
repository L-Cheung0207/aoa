export type AppRoute = "home" | "settings" | "uninstall" | "overlay";

export function resolveRoute(hash = window.location.hash || ""): AppRoute {
  if (hash.includes("home")) {
    return "home";
  }

  if (hash.includes("uninstall")) {
    return "uninstall";
  }

  return hash.includes("settings") ? "settings" : "overlay";
}
