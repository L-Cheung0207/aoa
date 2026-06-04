import type {
  AppSettings,
  InterfaceLanguage,
  RecordingLanguage,
  WaveformStyle
} from "@voice/shared";

export interface SettingsOption<T extends string> {
  key: string;
  value: T;
}

export interface SettingsText {
  common: {
    loading: string;
    loadFailed: string;
    saveFailed: string;
    directConnection: string;
    optional: string;
    testing: string;
    testOkSuffix: string;
    testFailSuffix: string;
  };
  header: {
    title: string;
    subtitle: string;
  };
  sections: {
    appearance: string;
    shortcuts: string;
    language: string;
    audio: string;
    appBehavior: string;
    connection: string;
  };
  appearance: {
    theme: string;
    themeDescription: string;
    darkTheme: string;
    lightTheme: string;
  };
  shortcuts: {
    voiceInput: string;
    voiceInputDescription: string;
    smartRewrite: string;
    smartRewriteDescription: string;
    translate: string;
    translateDescription: string;
  };
  language: {
    interfaceLanguage: string;
    interfaceLanguageDescription: string;
    translationTarget: string;
    translationTargetDescription: string;
  };
  audio: {
    microphone: string;
    microphoneDescription: string;
    interactionSounds: string;
    interactionSoundsDescription: string;
    muteDuringVoiceInput: string;
    muteDuringVoiceInputDescription: string;
    recognitionLanguage: string;
    recognitionLanguageDescription: string;
    waveformEffect: string;
    waveformEffectDescription: string;
    waveformPreview: string;
  };
  appBehavior: {
    launchAtLogin: string;
    launchAtLoginDescription: string;
  };
  connection: {
    asrWebSocketDescription: string;
    postprocessApi: string;
    postprocessApiDescription: string;
    apiDisplayName: string;
    apiDisplayNameDescription: string;
    wsProxyOptional: string;
    apiProxyOptional: string;
    wsProxy: string;
    apiProxy: string;
    proxyAddress: string;
    proxyUsername: string;
    proxyPassword: string;
    proxyUsernamePlaceholder: string;
    proxyPasswordPlaceholder: string;
    emptyDirect: string;
    optionalEmptyDirect: string;
    wsService: string;
    apiService: string;
    wsMissing: string;
    apiMissing: string;
    testingWs: string;
    testingApi: string;
    connectionSucceeded: string;
    connectionFailed: string;
    connectionException: string;
    wsTest: string;
    apiTest: string;
  };
  options: {
    interfaceLanguages: readonly SettingsOption<InterfaceLanguage>[];
    recordingLanguages: readonly SettingsOption<RecordingLanguage>[];
    translationTargets: readonly SettingsOption<AppSettings["translation"]["targetLanguage"]>[];
    waveforms: readonly SettingsOption<WaveformStyle>[];
  };
}

const SETTINGS_TEXT: Record<InterfaceLanguage, SettingsText> = {
  "zh-CN": {
    common: {
      loading: "载入中...",
      loadFailed: "载入配置失败：",
      saveFailed: "储存失败：",
      directConnection: "留空表示直连。",
      optional: "可选。",
      testing: "测试中...",
      testOkSuffix: " ✓",
      testFailSuffix: " ✕"
    },
    header: {
      title: "设置",
      subtitle: "配置会储存在您的设备上，不会上传到云端。"
    },
    sections: {
      appearance: "外观",
      shortcuts: "快捷键",
      language: "语言",
      audio: "音频",
      appBehavior: "应用行为",
      connection: "连接"
    },
    appearance: {
      theme: "主题",
      themeDescription: "默认使用深色主题；浅色主题更适合白天。",
      darkTheme: "深色（默认）",
      lightTheme: "浅色（白色）"
    },
    shortcuts: {
      voiceInput: "语音输入",
      voiceInputDescription: "开始与停止语音输入。",
      smartRewrite: "智能改写",
      smartRewriteDescription: "结合选区与语音指令进行处理。",
      translate: "翻译",
      translateDescription: "开始与停止翻译模式。"
    },
    language: {
      interfaceLanguage: "界面语言",
      interfaceLanguageDescription: "选择用户界面使用的语言。",
      translationTarget: "翻译目标",
      translationTargetDescription: "选择翻译模式下的听写目标语言。"
    },
    audio: {
      microphone: "麦克风",
      microphoneDescription: "选择您首选的麦克风，以便 Typeless 捕捉您的声音。",
      interactionSounds: "交互声音",
      interactionSoundsDescription: "为开始/停止等关键操作播放声音。",
      muteDuringVoiceInput: "语音输入时静音",
      muteDuringVoiceInputDescription: "在语音输入时自动静音其他活动音频。",
      recognitionLanguage: "语音识别语言",
      recognitionLanguageDescription: "影响语音识别的语言提示。",
      waveformEffect: "声波效果",
      waveformEffectDescription: "选择悬浮窗的波形风格。",
      waveformPreview: "声波效果预览"
    },
    appBehavior: {
      launchAtLogin: "登录时启动应用",
      launchAtLoginDescription: "当您的计算机启动时，自动打开 Typeless。"
    },
    connection: {
      asrWebSocketDescription: "语音识别即时转写连接地址。",
      postprocessApi: "后处理 API",
      postprocessApiDescription: "润色、翻译等 HTTP 后处理服务地址。",
      apiDisplayName: "API 显示名称",
      apiDisplayNameDescription: "仅用于界面展示，可选。",
      wsProxyOptional: "WS 代理（可选）",
      apiProxyOptional: "API 代理（可选）",
      wsProxy: "WS 代理",
      apiProxy: "API 代理",
      proxyAddress: "代理地址",
      proxyUsername: "代理用户名",
      proxyPassword: "代理密码",
      proxyUsernamePlaceholder: "用户名",
      proxyPasswordPlaceholder: "密码",
      emptyDirect: "留空表示直连。",
      optionalEmptyDirect: "可选。留空表示直连。",
      wsService: "WS 服务",
      apiService: "后处理 API",
      wsMissing: "请先填写 WebSocket 地址。",
      apiMissing: "请先填写后处理 API 地址。",
      testingWs: "正在测试 WS 服务...",
      testingApi: "正在测试后处理 API...",
      connectionSucceeded: "连接成功",
      connectionFailed: "连接失败：",
      connectionException: "连接异常：",
      wsTest: "WS测试",
      apiTest: "API测试"
    },
    options: {
      interfaceLanguages: [
        { key: "简体中文（中国大陆）", value: "zh-CN" },
        { key: "繁體中文（香港/澳門）", value: "zh-TW" },
        { key: "English (United States)", value: "en-US" }
      ],
      recordingLanguages: [
        { key: "自动 (Auto)", value: "auto" },
        { key: "粤语 (Cantonese)", value: "cantonese" },
        { key: "普通话 (Mandarin)", value: "mandarin" },
        { key: "韩语 (Korean)", value: "korean" },
        { key: "英语 (English)", value: "english" },
        { key: "葡语 (Portuguese)", value: "portuguese" },
        { key: "日语 (Japanese)", value: "japanese" },
        { key: "泰语 (Thai)", value: "thai" },
        { key: "印地语 (Hindi)", value: "hindi" },
        { key: "印尼语 (Indonesia)", value: "indonesia" }
      ],
      translationTargets: [
        { key: "英语（美国）", value: "en-US" },
        { key: "简体中文（中国大陆）", value: "zh-CN" }
      ],
      waveforms: [
        { key: "脉冲焰", value: "waveform-sunset" },
        { key: "银核灰", value: "waveform-mono" },
        { key: "霓虹糖", value: "waveform-candy" }
      ]
    }
  },
  "zh-TW": {
    common: {
      loading: "載入中...",
      loadFailed: "載入配置失敗：",
      saveFailed: "儲存失敗：",
      directConnection: "留空表示直連。",
      optional: "可選。",
      testing: "測試中...",
      testOkSuffix: " ✓",
      testFailSuffix: " ✕"
    },
    header: {
      title: "設定",
      subtitle: "配置會儲存在您的裝置上，不會上傳到雲端。"
    },
    sections: {
      appearance: "外觀",
      shortcuts: "快捷鍵",
      language: "語言",
      audio: "音訊",
      appBehavior: "應用行為",
      connection: "連線"
    },
    appearance: {
      theme: "主題",
      themeDescription: "預設使用深色主題；淺色主題更適合白天。",
      darkTheme: "深色（預設）",
      lightTheme: "淺色（白色）"
    },
    shortcuts: {
      voiceInput: "語音輸入",
      voiceInputDescription: "開始與停止語音輸入。",
      smartRewrite: "智慧改寫",
      smartRewriteDescription: "結合選區與語音指令進行處理。",
      translate: "翻譯",
      translateDescription: "開始與停止翻譯模式。"
    },
    language: {
      interfaceLanguage: "介面語言",
      interfaceLanguageDescription: "選擇使用者介面使用的語言。",
      translationTarget: "翻譯目標",
      translationTargetDescription: "選擇翻譯模式下的聽寫目標語言。"
    },
    audio: {
      microphone: "麥克風",
      microphoneDescription: "選擇您偏好的麥克風，以便 Typeless 捕捉您的聲音。",
      interactionSounds: "互動聲音",
      interactionSoundsDescription: "為開始/停止等關鍵操作播放聲音。",
      muteDuringVoiceInput: "語音輸入時靜音",
      muteDuringVoiceInputDescription: "在語音輸入時自動靜音其他活動音訊。",
      recognitionLanguage: "語音識別語言",
      recognitionLanguageDescription: "影響語音識別的語言提示。",
      waveformEffect: "聲波效果",
      waveformEffectDescription: "選擇懸浮窗的波形風格。",
      waveformPreview: "聲波效果預覽"
    },
    appBehavior: {
      launchAtLogin: "登入時啟動應用",
      launchAtLoginDescription: "當您的電腦啟動時，自動開啟 Typeless。"
    },
    connection: {
      asrWebSocketDescription: "語音識別即時轉寫連線地址。",
      postprocessApi: "後處理 API",
      postprocessApiDescription: "潤色、翻譯等 HTTP 後處理服務地址。",
      apiDisplayName: "API 顯示名稱",
      apiDisplayNameDescription: "僅用於介面展示，可選。",
      wsProxyOptional: "WS 代理（可選）",
      apiProxyOptional: "API 代理（可選）",
      wsProxy: "WS 代理",
      apiProxy: "API 代理",
      proxyAddress: "代理地址",
      proxyUsername: "代理使用者名稱",
      proxyPassword: "代理密碼",
      proxyUsernamePlaceholder: "使用者名稱",
      proxyPasswordPlaceholder: "密碼",
      emptyDirect: "留空表示直連。",
      optionalEmptyDirect: "可選。留空表示直連。",
      wsService: "WS 服務",
      apiService: "後處理 API",
      wsMissing: "請先填寫 WebSocket 地址。",
      apiMissing: "請先填寫後處理 API 地址。",
      testingWs: "正在測試 WS 服務...",
      testingApi: "正在測試後處理 API...",
      connectionSucceeded: "連線成功",
      connectionFailed: "連線失敗：",
      connectionException: "連線異常：",
      wsTest: "WS測試",
      apiTest: "API測試"
    },
    options: {
      interfaceLanguages: [
        { key: "簡體中文（中國大陸）", value: "zh-CN" },
        { key: "繁體中文（香港/澳門）", value: "zh-TW" },
        { key: "English (United States)", value: "en-US" }
      ],
      recordingLanguages: [
        { key: "自動 (Auto)", value: "auto" },
        { key: "廣東話 (Cantonese)", value: "cantonese" },
        { key: "普通話 (Mandarin)", value: "mandarin" },
        { key: "韓語 (Korean)", value: "korean" },
        { key: "英語 (English)", value: "english" },
        { key: "葡語 (Portuguese)", value: "portuguese" },
        { key: "日語 (Japanese)", value: "japanese" },
        { key: "泰語 (Thai)", value: "thai" },
        { key: "印地語 (Hindi)", value: "hindi" },
        { key: "印尼語 (Indonesia)", value: "indonesia" }
      ],
      translationTargets: [
        { key: "英語（美國）", value: "en-US" },
        { key: "簡體中文（中國大陸）", value: "zh-CN" }
      ],
      waveforms: [
        { key: "脈衝焰", value: "waveform-sunset" },
        { key: "銀核灰", value: "waveform-mono" },
        { key: "霓虹糖", value: "waveform-candy" }
      ]
    }
  },
  "en-US": {
    common: {
      loading: "Loading...",
      loadFailed: "Failed to load settings: ",
      saveFailed: "Save failed: ",
      directConnection: "Leave blank to connect directly.",
      optional: "Optional.",
      testing: "Testing...",
      testOkSuffix: " ✓",
      testFailSuffix: " ✕"
    },
    header: {
      title: "Settings",
      subtitle: "Settings are stored on this device and are not uploaded to the cloud."
    },
    sections: {
      appearance: "Appearance",
      shortcuts: "Shortcuts",
      language: "Language",
      audio: "Audio",
      appBehavior: "App Behavior",
      connection: "Connection"
    },
    appearance: {
      theme: "Theme",
      themeDescription: "Dark is the default; light works better during the day.",
      darkTheme: "Dark (Default)",
      lightTheme: "Light (White)"
    },
    shortcuts: {
      voiceInput: "Voice Input",
      voiceInputDescription: "Start and stop voice input.",
      smartRewrite: "Smart Rewrite",
      smartRewriteDescription: "Process selected text with spoken instructions.",
      translate: "Translate",
      translateDescription: "Start and stop translation mode."
    },
    language: {
      interfaceLanguage: "Interface Language",
      interfaceLanguageDescription: "Choose the language used by the user interface.",
      translationTarget: "Translation Target",
      translationTargetDescription: "Choose the output language for translation mode."
    },
    audio: {
      microphone: "Microphone",
      microphoneDescription: "Choose your preferred microphone for Typeless to capture your voice.",
      interactionSounds: "Interaction Sounds",
      interactionSoundsDescription: "Play sounds for key actions such as start and stop.",
      muteDuringVoiceInput: "Mute During Voice Input",
      muteDuringVoiceInputDescription: "Automatically mute other active audio during voice input.",
      recognitionLanguage: "Recognition Language",
      recognitionLanguageDescription: "Controls the language hint used for speech recognition.",
      waveformEffect: "Waveform Effect",
      waveformEffectDescription: "Choose the waveform style for the floating window.",
      waveformPreview: "Waveform effect preview"
    },
    appBehavior: {
      launchAtLogin: "Launch at Login",
      launchAtLoginDescription: "Open Typeless automatically when your computer starts."
    },
    connection: {
      asrWebSocketDescription: "Realtime speech recognition WebSocket address.",
      postprocessApi: "Postprocess API",
      postprocessApiDescription: "HTTP service address for polishing, translation, and related actions.",
      apiDisplayName: "API Display Name",
      apiDisplayNameDescription: "Only used for display in the interface. Optional.",
      wsProxyOptional: "WS Proxy (Optional)",
      apiProxyOptional: "API Proxy (Optional)",
      wsProxy: "WS Proxy",
      apiProxy: "API Proxy",
      proxyAddress: "Proxy Address",
      proxyUsername: "Proxy Username",
      proxyPassword: "Proxy Password",
      proxyUsernamePlaceholder: "Username",
      proxyPasswordPlaceholder: "Password",
      emptyDirect: "Leave blank to connect directly.",
      optionalEmptyDirect: "Optional. Leave blank to connect directly.",
      wsService: "WS service",
      apiService: "Postprocess API",
      wsMissing: "Please enter the WebSocket address first.",
      apiMissing: "Please enter the postprocess API address first.",
      testingWs: "Testing WS service...",
      testingApi: "Testing postprocess API...",
      connectionSucceeded: "connected",
      connectionFailed: "connection failed: ",
      connectionException: "connection error: ",
      wsTest: "Test WS",
      apiTest: "Test API"
    },
    options: {
      interfaceLanguages: [
        { key: "Simplified Chinese (Mainland China)", value: "zh-CN" },
        { key: "Traditional Chinese (Hong Kong/Macau)", value: "zh-TW" },
        { key: "English (United States)", value: "en-US" }
      ],
      recordingLanguages: [
        { key: "Auto", value: "auto" },
        { key: "Cantonese", value: "cantonese" },
        { key: "Mandarin", value: "mandarin" },
        { key: "Korean", value: "korean" },
        { key: "English", value: "english" },
        { key: "Portuguese", value: "portuguese" },
        { key: "Japanese", value: "japanese" },
        { key: "Thai", value: "thai" },
        { key: "Hindi", value: "hindi" },
        { key: "Indonesian", value: "indonesia" }
      ],
      translationTargets: [
        { key: "English (United States)", value: "en-US" },
        { key: "Simplified Chinese (Mainland China)", value: "zh-CN" }
      ],
      waveforms: [
        { key: "Pulse Flame", value: "waveform-sunset" },
        { key: "Silver Core", value: "waveform-mono" },
        { key: "Neon Candy", value: "waveform-candy" }
      ]
    }
  }
};

export function getSettingsText(language: InterfaceLanguage | undefined): SettingsText {
  return SETTINGS_TEXT[language ?? "zh-CN"] ?? SETTINGS_TEXT["zh-CN"];
}
