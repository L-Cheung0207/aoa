import type { HistoryRecordStatus, HistoryRetention, InterfaceLanguage } from "@voice/shared";

type HistoryFilterKey = "all" | "dictation" | "translate" | "rewrite";

export interface HistoryText {
  title: string;
  subtitle: string;
  more: string;
  storeHistory: string;
  storeHistoryQuestion: string;
  storeHistoryDuration: string;
  privacyTitle: string;
  privacyDescription: string;
  filtersLabel: string;
  filters: Record<HistoryFilterKey, string>;
  emptyTitle: string;
  emptyDescription: string;
  listLabel: string;
  viewAnswer: string;
  retrying: string;
  retry: string;
  retryFailed: string;
  retryNoAudio: string;
  downloading: string;
  downloadAudio: string;
  deleting: string;
  delete: string;
  close: string;
  answer: string;
  input: string;
  deleteTitle: string;
  deleteDescription: string;
  cancel: string;
  deleteOldTitle: string;
  applying: string;
  confirm: string;
  missingAudioFile: string;
  today: string;
  yesterday: string;
  retentionOptions: readonly { value: HistoryRetention; label: string }[];
  retentionDescriptions: Record<HistoryRetention, string>;
  statusLabels: Record<HistoryRecordStatus, string>;
}

const HISTORY_TEXT: Record<InterfaceLanguage, HistoryText> = {
  "zh-CN": {
    title: "历史记录",
    subtitle: "您的语音口述只储存在这台设备上。",
    more: "更多",
    storeHistory: "保存历史",
    storeHistoryQuestion: "您希望在设备上保存口述历史多久？",
    storeHistoryDuration: "保存历史时长",
    privacyTitle: "您的资料保持私密",
    privacyDescription:
      "您的语音口述是私密的，零资料保留。它们仅储存在您的设备上，无法从其他地方访问。",
    filtersLabel: "历史筛选",
    filters: {
      all: "全部",
      dictation: "口述",
      translate: "翻译",
      rewrite: "改写"
    },
    emptyTitle: "还没有历史记录",
    emptyDescription: "完成一次语音输入后，音频和文本会出现在这里。",
    listLabel: "历史记录列表",
    viewAnswer: "查看答案",
    retrying: "重试中",
    retry: "重试",
    retryFailed: "重试失败，请稍后再试。",
    retryNoAudio: "没有音频，无法重试",
    downloading: "下载中",
    downloadAudio: "下载音频",
    deleting: "删除中",
    delete: "删除",
    close: "关闭",
    answer: "答案",
    input: "输入",
    deleteTitle: "删除此记录？",
    deleteDescription: "此转录将被永久删除，无法恢复。",
    cancel: "取消",
    deleteOldTitle: "删除旧历史记录？",
    applying: "处理中",
    confirm: "确认",
    missingAudioFile: "未找到历史音频文件",
    today: "今天",
    yesterday: "昨天",
    retentionOptions: [
      { value: "never", label: "从不" },
      { value: "24h", label: "24 小时" },
      { value: "7d", label: "1 周" },
      { value: "30d", label: "1 个月" },
      { value: "forever", label: "永远" }
    ],
    retentionDescriptions: {
      never: "您所有的本地历史记录将被永久删除，且之后不会再储存新的历史记录。",
      "24h": "早于 24 小时的本地历史记录将被永久删除，无法恢复。",
      "7d": "早于 1 周的本地历史记录将被永久删除，无法恢复。",
      "30d": "早于 1 个月的本地历史记录将被永久删除，无法恢复。",
      forever: "之后会永久保留新的本地历史记录，现有记录不会被删除。"
    },
    statusLabels: {
      cancelled: "转录已被取消。",
      no_audio: "音频无声。",
      error: "转录失败。",
      completed: "已完成。"
    }
  },
  "zh-TW": {
    title: "歷史記錄",
    subtitle: "您的語音口述只儲存在這臺裝置上。",
    more: "更多",
    storeHistory: "儲存歷史",
    storeHistoryQuestion: "您希望在裝置上儲存口述歷史多久？",
    storeHistoryDuration: "儲存歷史時長",
    privacyTitle: "您的資料保持私密",
    privacyDescription:
      "您的語音口述是私密的，零資料保留。它們僅儲存在您的裝置上，無法從其他地方訪問。",
    filtersLabel: "歷史篩選",
    filters: {
      all: "全部",
      dictation: "口述",
      translate: "翻譯",
      rewrite: "改寫"
    },
    emptyTitle: "還沒有歷史記錄",
    emptyDescription: "完成一次語音輸入後，音訊和文本會出現在這裡。",
    listLabel: "歷史記錄列表",
    viewAnswer: "檢視答案",
    retrying: "重試中",
    retry: "重試",
    retryFailed: "重試失敗，請稍後再試。",
    retryNoAudio: "沒有音訊，無法重試",
    downloading: "下載中",
    downloadAudio: "下載音訊",
    deleting: "刪除中",
    delete: "刪除",
    close: "關閉",
    answer: "答案",
    input: "輸入",
    deleteTitle: "刪除此記錄？",
    deleteDescription: "此轉錄將被永久刪除，無法恢復。",
    cancel: "取消",
    deleteOldTitle: "刪除舊歷史記錄？",
    applying: "處理中",
    confirm: "確認",
    missingAudioFile: "未找到歷史音訊檔案",
    today: "今天",
    yesterday: "昨天",
    retentionOptions: [
      { value: "never", label: "從不" },
      { value: "24h", label: "24 小時" },
      { value: "7d", label: "1 周" },
      { value: "30d", label: "1 個月" },
      { value: "forever", label: "永遠" }
    ],
    retentionDescriptions: {
      never: "您所有的本地歷史記錄將被永久刪除，且之後不會再儲存新的歷史記錄。",
      "24h": "早於 24 小時的本地歷史記錄將被永久刪除，無法恢復。",
      "7d": "早於 1 周的本地歷史記錄將被永久刪除，無法恢復。",
      "30d": "早於 1 個月的本地歷史記錄將被永久刪除，無法恢復。",
      forever: "之後會永久保留新的本地歷史記錄，現有記錄不會被刪除。"
    },
    statusLabels: {
      cancelled: "轉錄已被取消。",
      no_audio: "音訊無聲。",
      error: "轉錄失敗。",
      completed: "已完成。"
    }
  },
  "en-US": {
    title: "History",
    subtitle: "Your dictation history is stored only on this device.",
    more: "More",
    storeHistory: "Save History",
    storeHistoryQuestion: "How long do you want to keep dictation history on this device?",
    storeHistoryDuration: "History retention",
    privacyTitle: "Your Data Stays Private",
    privacyDescription:
      "Your dictation is private with zero data retention. Records are stored only on this device and cannot be accessed elsewhere.",
    filtersLabel: "History filters",
    filters: {
      all: "All",
      dictation: "Dictation",
      translate: "Translate",
      rewrite: "Rewrite"
    },
    emptyTitle: "No History Yet",
    emptyDescription: "Audio and text will appear here after you finish a voice input.",
    listLabel: "History list",
    viewAnswer: "View Answer",
    retrying: "Retrying",
    retry: "Retry",
    retryFailed: "Retry failed. Please try again later.",
    retryNoAudio: "No audio to retry",
    downloading: "Downloading",
    downloadAudio: "Download Audio",
    deleting: "Deleting",
    delete: "Delete",
    close: "Close",
    answer: "Answer",
    input: "Input",
    deleteTitle: "Delete This Record?",
    deleteDescription: "This transcript will be permanently deleted and cannot be restored.",
    cancel: "Cancel",
    deleteOldTitle: "Delete Old History?",
    applying: "Applying",
    confirm: "Confirm",
    missingAudioFile: "History audio file not found",
    today: "Today",
    yesterday: "Yesterday",
    retentionOptions: [
      { value: "never", label: "Never" },
      { value: "24h", label: "24 hours" },
      { value: "7d", label: "1 week" },
      { value: "30d", label: "1 month" },
      { value: "forever", label: "Forever" }
    ],
    retentionDescriptions: {
      never:
        "All local history records will be permanently deleted, and new records will no longer be saved.",
      "24h": "Local history older than 24 hours will be permanently deleted.",
      "7d": "Local history older than 1 week will be permanently deleted.",
      "30d": "Local history older than 1 month will be permanently deleted.",
      forever: "New local history records will be kept forever. Existing records will not be deleted."
    },
    statusLabels: {
      cancelled: "Transcription was cancelled.",
      no_audio: "No audio was detected.",
      error: "Transcription failed.",
      completed: "Completed."
    }
  }
};

export function getHistoryText(language: InterfaceLanguage | undefined): HistoryText {
  return HISTORY_TEXT[language ?? "zh-CN"] ?? HISTORY_TEXT["zh-CN"];
}
