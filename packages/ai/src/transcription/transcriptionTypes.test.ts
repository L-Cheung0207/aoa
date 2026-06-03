import { describe, expect, it } from "vitest";
import { encodePcm16ToBase64 } from "./transcriptionTypes";

describe("transcription type helpers", () => {
  it("encodes PCM16 bytes as base64", () => {
    expect(encodePcm16ToBase64(new Int16Array([1, -1]))).toBe("AQD//w==");
  });
});
