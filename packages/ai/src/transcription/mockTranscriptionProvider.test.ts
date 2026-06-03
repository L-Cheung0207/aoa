import { describe, expect, it } from "vitest";
import { createMockTranscriptionProvider } from "./MockTranscriptionProvider";

describe("mock transcription provider", () => {
  it("emits partial and final transcript events", async () => {
    const provider = createMockTranscriptionProvider({
      partialText: "明天下午",
      finalText: "明天下午三点开会。"
    });
    const events: string[] = [];
    provider.subscribe((event) => events.push(event.type));

    await provider.start({
      installationId: "inst_test",
      language: "auto",
      sampleRate: 16000
    });
    await provider.stop();

    expect(events).toEqual(["started", "partial", "final", "stopped"]);
  });
});
