interface UpdateReadyDialogProps {
  version?: string;
  onClose(): void;
  onRestart(): void;
}

export function UpdateReadyDialog({
  version,
  onClose,
  onRestart
}: UpdateReadyDialogProps): React.JSX.Element {
  const label = version ? `有可用更新 ${formatVersionLabel(version)}` : "有可用更新";

  return (
    <div className="update-ready" role="dialog" aria-modal="false" aria-label={label}>
      <div className="update-ready__header">
        <span className="update-ready__icon" aria-hidden="true">
          <MegaphoneIcon />
        </span>
        <h2>有可用更新</h2>
        <button
          type="button"
          className="update-ready__close"
          aria-label="关闭更新提示"
          onClick={onClose}
        >
          <CloseIcon />
        </button>
      </div>
      <p className="update-ready__message">重启AOA以体验新功能。</p>
      <button type="button" className="update-ready__restart" onClick={onRestart}>
        重启
      </button>
    </div>
  );
}

export function MockUpdateDialog({
  onClose,
  currentVersion
}: {
  currentVersion?: string;
  onClose(): void;
}): React.JSX.Element {
  return (
    <UpdateReadyDialog
      version={currentVersion}
      onClose={onClose}
      onRestart={onClose}
    />
  );
}

function formatVersionLabel(version: string): string {
  const normalized = version.trim();
  if (!normalized) {
    return "";
  }
  return normalized.startsWith("v") ? normalized : `v${normalized}`;
}

function MegaphoneIcon(): React.JSX.Element {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 11v2a2 2 0 0 0 2 2h2l4 4v-5l8 3V7l-8 3V5L7 9H5a2 2 0 0 0-2 2Z" />
      <path d="M19 9.5a4.5 4.5 0 0 1 0 5" />
    </svg>
  );
}

function CloseIcon(): React.JSX.Element {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M6 6l12 12" />
      <path d="M18 6L6 18" />
    </svg>
  );
}
