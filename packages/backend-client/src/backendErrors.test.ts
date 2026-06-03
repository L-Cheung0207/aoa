import { describe, expect, it } from "vitest";
import { mapBackendError } from "./backendErrors";

describe("backend error mapping", () => {
  it("maps anonymous quota failures to a user-facing quota error", () => {
    expect(mapBackendError({ code: "ANONYMOUS_QUOTA_EXCEEDED", message: "quota" })).toEqual({
      code: "quota_exceeded",
      title: "额度已用完",
      message: "当前版本试用额度已用完"
    });
  });

  it("maps unknown backend failures to a safe generic error", () => {
    expect(mapBackendError({ code: "SOMETHING_NEW", message: "raw server detail" })).toEqual({
      code: "backend_unavailable",
      title: "服务暂时不可用",
      message: "服务暂时不可用，请稍后再试"
    });
  });
});
