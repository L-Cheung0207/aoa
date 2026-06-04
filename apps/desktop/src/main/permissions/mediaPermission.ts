import type { Session } from "electron";

type ElectronMediaSession = Pick<
  Session,
  "setPermissionCheckHandler" | "setPermissionRequestHandler"
>;

interface MediaPermissionDetails {
  mediaType?: unknown;
  mediaTypes?: unknown;
}

export function installMediaPermissionHandlers(
  targetSession: ElectronMediaSession,
): void {
  targetSession.setPermissionRequestHandler(
    (_webContents, permission, callback, details) => {
      callback(shouldGrantAudioMediaPermission(String(permission), details));
    },
  );

  targetSession.setPermissionCheckHandler(
    (_webContents, permission, _requestingOrigin, details) =>
      shouldGrantAudioMediaPermission(String(permission), details),
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
