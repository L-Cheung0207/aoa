import { describe, expect, it } from "vitest";
import {
  isJavaVoiceUnifiedEndpoint,
  selectVoiceService,
} from "./voiceServiceSelection";

describe("voice service selection", () => {
  it("uses the Java voice gateway when developer mode is disabled", () => {
    expect(
      selectVoiceService({
        developerEnabled: false,
        javaVoiceWsUrl: " ws://java.example/aoa_api/voice ",
        developerWsUrl: "wss://asr.example/ws",
      }),
    ).toEqual({
      kind: "java",
      url: "ws://java.example/aoa_api/voice",
      reason: "standard",
    });
  });

  it("keeps the developer ASR flow for legacy ASR endpoints", () => {
    expect(
      selectVoiceService({
        developerEnabled: true,
        javaVoiceWsUrl: "ws://java.example/aoa_api/voice",
        developerWsUrl: "ws://java.example/aoa_api/voice/transcribe",
      }),
    ).toEqual({
      kind: "developer",
      reason: "developer-legacy-endpoint",
    });
  });

  it("routes developer mode to the Java protocol for unified voice endpoints", () => {
    expect(
      selectVoiceService({
        developerEnabled: true,
        javaVoiceWsUrl: "ws://default.example/aoa_api/voice",
        developerWsUrl: "ws://172.27.209.114:8097/aoa_api/voice",
      }),
    ).toEqual({
      kind: "java",
      url: "ws://172.27.209.114:8097/aoa_api/voice",
      reason: "developer-unified-endpoint",
    });
  });

  it("recognizes only the unified /voice route, not mode-specific routes", () => {
    expect(
      isJavaVoiceUnifiedEndpoint(
        "ws://172.27.209.114:8097/aoa_api/voice/?tenant=a",
      ),
    ).toBe(true);
    expect(
      isJavaVoiceUnifiedEndpoint(
        "ws://172.27.209.114:8097/aoa_api/voice/transcribe",
      ),
    ).toBe(false);
    expect(
      isJavaVoiceUnifiedEndpoint("wss://aiapi.ctmcloud.com.mo/Others/ws"),
    ).toBe(false);
  });
});
