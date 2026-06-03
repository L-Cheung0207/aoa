import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  buildMicrophoneAudioConstraints,
  dedupeInputDevices,
  getMicrophoneDevicePickerInitialOpen,
  MicrophoneDevicePicker
} from "./MicrophoneDevicePicker";

describe("MicrophoneDevicePicker", () => {
  it("deduplicates default and communications aliases for the same microphone", () => {
    const deduped = dedupeInputDevices([
      {
        kind: "audioinput",
        deviceId: "default",
        label: "Default - 麦克风 (UGREEN CM379 USB Audio)",
        groupId: "group-usb"
      } as MediaDeviceInfo,
      {
        kind: "audioinput",
        deviceId: "communications",
        label: "Communications - 麦克风 (UGREEN CM379 USB Audio)",
        groupId: "group-usb"
      } as MediaDeviceInfo,
      {
        kind: "audioinput",
        deviceId: "usb-raw",
        label: "麦克风 (UGREEN CM379 USB Audio)",
        groupId: "group-usb"
      } as MediaDeviceInfo
    ]);

    expect(deduped).toHaveLength(1);
    expect(deduped[0]).toMatchObject({
      deviceId: "usb-raw",
      label: "麦克风 (UGREEN CM379 USB Audio)",
      kind: "audioinput"
    });
  });

  it("strips trailing hardware id suffixes from the visible label", () => {
    const deduped = dedupeInputDevices([
      {
        kind: "audioinput",
        deviceId: "usb-raw",
        label: "麦克风 (UGREEN CM379 USB Audio) (2b89:0934)",
        groupId: "group-usb"
      } as MediaDeviceInfo
    ]);

    expect(deduped).toHaveLength(1);
    expect(deduped[0]?.label).toBe("麦克风 (UGREEN CM379 USB Audio)");
  });

  it("opens initially when requested by the parent flow", () => {
    expect(getMicrophoneDevicePickerInitialOpen(true)).toBe(true);
    expect(getMicrophoneDevicePickerInitialOpen(false)).toBe(false);
    expect(getMicrophoneDevicePickerInitialOpen(undefined)).toBe(false);
  });

  it("builds exact audio constraints for the selected microphone", () => {
    expect(buildMicrophoneAudioConstraints("")).toBe(true);
    expect(buildMicrophoneAudioConstraints("usb-mic-1")).toEqual({
      deviceId: { exact: "usb-mic-1" }
    });
  });

  it("can hide the inline trigger while still rendering an externally opened picker", () => {
    const html = renderToStaticMarkup(
      createElement(MicrophoneDevicePicker, {
        selectedDeviceId: "",
        onDeviceChange: () => undefined,
        hideTrigger: true,
        openSignal: 1
      })
    );

    expect(html).not.toContain("mic-picker__trigger");
    expect(html).toContain('role="dialog"');
  });
});
