import type { VoiceAIAPI } from "../preload/voiceApi";

declare global {
  interface Window {
    voiceAI: VoiceAIAPI;
  }
}
