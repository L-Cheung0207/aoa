import { describe, expect, it, vi } from "vitest";
import {
  BackendJsonError,
  requestBackendJson,
  unwrapBackendData,
} from "./backendJson";

function createJsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("backend json helpers", () => {
  it("unwraps backend data envelopes before normalizing", async () => {
    const fetchImpl = vi.fn(async () =>
      createJsonResponse({
        code: "10000000",
        message: "success",
        data: { value: 42 },
      }),
    );

    await expect(
      requestBackendJson(fetchImpl, "https://api.example.com/demo", {
        method: "GET",
        normalize: (payload) => payload,
      }),
    ).resolves.toEqual({ value: 42 });
  });

  it("keeps non-envelope response bodies intact", async () => {
    const fetchImpl = vi.fn(async () => createJsonResponse({ value: 42 }));

    await expect(
      requestBackendJson(fetchImpl, "https://api.example.com/demo", {
        method: "GET",
        normalize: (payload) => payload,
      }),
    ).resolves.toEqual({ value: 42 });
  });

  it("uses raw response bodies for HTTP error message mapping", async () => {
    const fetchImpl = vi.fn(async () =>
      createJsonResponse({ code: "BACKEND_DOWN", message: "down", data: null }, 503),
    );

    await expect(
      requestBackendJson(fetchImpl, "https://api.example.com/demo", {
        method: "GET",
        normalize: (payload) => payload,
        mapHttpError: (status, body) =>
          new BackendJsonError(status, "mapped", readMessage(body)),
      }),
    ).rejects.toMatchObject({
      name: "BackendJsonError",
      status: 503,
      code: "mapped",
      message: "down",
    });
  });

  it("maps network, empty, and invalid JSON failures", async () => {
    const fetchImpl = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("fetch failed"))
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockResolvedValueOnce(new Response("not-json", { status: 200 }));

    await expect(
      requestBackendJson(fetchImpl, "https://api.example.com/demo", {
        method: "GET",
        normalize: (payload) => payload,
      }),
    ).rejects.toMatchObject({
      name: "BackendJsonError",
      status: 0,
      code: "network_error",
      message: "Network request failed",
    });
    await expect(
      requestBackendJson(fetchImpl, "https://api.example.com/demo", {
        method: "GET",
        normalize: (payload) => payload,
      }),
    ).rejects.toMatchObject({
      name: "BackendJsonError",
      status: 200,
      code: "empty_json",
      message: "Backend returned empty JSON",
    });
    await expect(
      requestBackendJson(fetchImpl, "https://api.example.com/demo", {
        method: "GET",
        normalize: (payload) => payload,
      }),
    ).rejects.toMatchObject({
      name: "BackendJsonError",
      status: 200,
      code: "invalid_json",
      message: "Backend returned invalid JSON",
    });
  });

  it("allows empty success when explicitly requested", async () => {
    const fetchImpl = vi.fn(async () => new Response(null, { status: 204 }));

    await expect(
      requestBackendJson(fetchImpl, "https://api.example.com/demo", {
        method: "POST",
        allowEmptySuccess: true,
        normalize: (payload) => payload,
      }),
    ).resolves.toBeUndefined();
  });

  it("unwrapBackendData returns data only when the envelope owns a data key", () => {
    expect(unwrapBackendData({ data: { value: 42 } })).toEqual({ value: 42 });
    expect(unwrapBackendData({ value: 42 })).toEqual({ value: 42 });
  });
});

function readMessage(body: unknown): string {
  if (
    typeof body === "object" &&
    body !== null &&
    !Array.isArray(body) &&
    typeof (body as { message?: unknown }).message === "string"
  ) {
    return (body as { message: string }).message;
  }
  return "Backend request failed";
}
