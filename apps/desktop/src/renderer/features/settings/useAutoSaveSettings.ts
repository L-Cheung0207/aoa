import { useCallback, useEffect, useMemo, useRef } from "react";
import type { AppSettings, AppSettingsPatch } from "@voice/shared";
import { normalizeConnectionSettings } from "./connectionSettings";

export type SettingsPersistScope = "home" | "page";

export interface UseAutoSaveSettingsOptions {
  scope: SettingsPersistScope;
  validate?(draft: AppSettings): string | undefined;
  onError?(message: string): void;
  debounceMs?: number;
}

function buildPersistPatch(
  settings: AppSettings,
  scope: SettingsPersistScope,
): AppSettingsPatch {
  const normalized = normalizeConnectionSettings(settings);
  if (scope === "home") {
    return {
      ui: normalized.ui,
      developer: normalized.developer,
      shortcuts: normalized.shortcuts,
      translation: normalized.translation,
      recording: normalized.recording,
      ws: normalized.ws,
      llm: normalized.llm,
    };
  }
  return {
    ui: normalized.ui,
    developer: normalized.developer,
    shortcuts: normalized.shortcuts,
    translation: normalized.translation,
    ws: normalized.ws,
    llm: normalized.llm,
    recording: normalized.recording,
  };
}

export function useAutoSaveSettings(options: UseAutoSaveSettingsOptions) {
  const debounceMs = options.debounceMs ?? 450;
  const skipPersistRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const latestDraftRef = useRef<AppSettings | undefined>(undefined);

  const persistDraft = useCallback(
    async (draft: AppSettings): Promise<AppSettings | undefined> => {
      const validationError = options.validate?.(draft);
      if (validationError) {
        options.onError?.(validationError);
        return undefined;
      }

      try {
        skipPersistRef.current = true;
        const next = await window.voiceAI.updateSettings(
          buildPersistPatch(draft, options.scope),
        );
        const normalized = normalizeConnectionSettings(next);
        latestDraftRef.current = normalized;
        return normalized;
      } catch (error) {
        options.onError?.(
          `儲存失敗：${error instanceof Error ? error.message : String(error)}`,
        );
        return undefined;
      } finally {
        skipPersistRef.current = false;
      }
    },
    [options.scope, options.validate, options.onError],
  );

  const flushPersist = useCallback(async (): Promise<
    AppSettings | undefined
  > => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = undefined;
    }
    const draft = latestDraftRef.current;
    if (!draft || skipPersistRef.current) {
      return undefined;
    }
    return persistDraft(draft);
  }, [persistDraft]);

  const schedulePersist = useCallback(
    (draft: AppSettings): void => {
      if (skipPersistRef.current) {
        return;
      }
      latestDraftRef.current = draft;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      timerRef.current = setTimeout(() => {
        timerRef.current = undefined;
        void persistDraft(draft);
      }, debounceMs);
    },
    [debounceMs, persistDraft],
  );

  const applyRemoteSettings = useCallback((next: AppSettings): AppSettings => {
    skipPersistRef.current = true;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = undefined;
    }
    const normalized = normalizeConnectionSettings(next);
    latestDraftRef.current = normalized;
    skipPersistRef.current = false;
    return normalized;
  }, []);

  const commitSettings = useCallback(
    (
      current: AppSettings | undefined,
      updater: AppSettings | ((draft: AppSettings) => AppSettings),
    ): AppSettings | undefined => {
      if (!current) {
        return current;
      }
      const next =
        typeof updater === "function"
          ? (updater as (draft: AppSettings) => AppSettings)(current)
          : updater;
      latestDraftRef.current = next;
      schedulePersist(next);
      return next;
    },
    [schedulePersist],
  );

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const setLatestDraft = useCallback((draft: AppSettings | undefined): void => {
    latestDraftRef.current = draft;
  }, []);

  return useMemo(
    () => ({
      commitSettings,
      applyRemoteSettings,
      flushPersist,
      setLatestDraft,
    }),
    [applyRemoteSettings, commitSettings, flushPersist, setLatestDraft],
  );
}
