import type { Session } from "electron";

type ElectronMediaSession = Pick<
  Session,
  "setPermissionCheckHandler" | "setPermissionRequestHandler"
>;

interface MediaPermissionDetails {
  mediaType?: unknown;
  mediaTypes?: unknown;
}

interface MediaPermissionLogger {
  log(message: string): void;
}

interface InstallMediaPermissionHandlersOptions {
  logger?: MediaPermissionLogger | undefined;
}

export function installMediaPermissionHandlers(
  targetSession: ElectronMediaSession,
  options: InstallMediaPermissionHandlersOptions = {},
): void {
  const logger = options.logger ?? console;

  targetSession.setPermissionRequestHandler(
    (_webContents, permission, callback, details) => {
      const normalizedPermission = String(permission);
      const granted = shouldGrantAudioMediaPermission(
        normalizedPermission,
        details,
      );
      logger.log(
        `[permission] media request permission=${normalizedPermission} mediaTypes=${formatMediaTypes(
          getRequestedMediaTypes(details),
        )} granted=${granted}`,
      );
      callback(granted);
    },
  );

  targetSession.setPermissionCheckHandler(
    (_webContents, permission, _requestingOrigin, details) => {
      const normalizedPermission = String(permission);
      const granted = shouldGrantAudioMediaPermission(
        normalizedPermission,
        details,
      );
      logger.log(
        `[permission] media check permission=${normalizedPermission} mediaTypes=${formatMediaTypes(
          getRequestedMediaTypes(details),
        )} granted=${granted}`,
      );
      return granted;
    },
  );
}

export function shouldGrantAudioMediaPermission(
  permission: string,
  details: unknown,
): boolean {
  if (permission !== "media") {
    return false;
  }

  const mediaTypes = getRequestedMediaTypes(details);
  return mediaTypes.length > 0 && mediaTypes.every((type) => type === "audio");
}

function getRequestedMediaTypes(details: unknown): string[] {
  const mediaDetails = details as MediaPermissionDetails | undefined;
  const mediaTypes = mediaDetails?.mediaTypes;
  if (Array.isArray(mediaTypes)) {
    return mediaTypes
      .filter((type): type is string => typeof type === "string")
      .map((type) => type.toLowerCase());
  }

  const mediaType = mediaDetails?.mediaType;
  return typeof mediaType === "string" ? [mediaType.toLowerCase()] : [];
}

function formatMediaTypes(mediaTypes: readonly string[]): string {
  return mediaTypes.length > 0 ? mediaTypes.join(",") : "none";
}
