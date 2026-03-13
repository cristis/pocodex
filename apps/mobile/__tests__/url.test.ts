import { isEmbeddedWebUrl, validateConfiguredUrl } from "../src/url";

describe("validateConfiguredUrl", () => {
  it("accepts an http URL", () => {
    expect(validateConfiguredUrl("http://192.168.1.12:8787/")).toEqual({
      ok: true,
      value: "http://192.168.1.12:8787/",
    });
  });

  it("accepts an https URL", () => {
    expect(validateConfiguredUrl("https://pocodex.internal/session")).toEqual({
      ok: true,
      value: "https://pocodex.internal/session",
    });
  });

  it("preserves tokenized query strings", () => {
    expect(validateConfiguredUrl("http://10.0.0.5:8787/?token=abc123&mode=mobile")).toEqual({
      ok: true,
      value: "http://10.0.0.5:8787/?token=abc123&mode=mobile",
    });
  });

  it("rejects missing schemes", () => {
    expect(validateConfiguredUrl("192.168.1.12:8787")).toEqual({
      ok: false,
      error: "Use an http:// or https:// URL.",
    });
  });

  it("trims whitespace around the saved value", () => {
    expect(validateConfiguredUrl("  https://pocodex.internal/?token=abc  ")).toEqual({
      ok: true,
      value: "https://pocodex.internal/?token=abc",
    });
  });
});

describe("isEmbeddedWebUrl", () => {
  it("allows about:blank and standard web URLs", () => {
    expect(isEmbeddedWebUrl("about:blank")).toBe(true);
    expect(isEmbeddedWebUrl("http://127.0.0.1:8787")).toBe(true);
    expect(isEmbeddedWebUrl("https://example.com")).toBe(true);
  });

  it("blocks non-web schemes", () => {
    expect(isEmbeddedWebUrl("mailto:test@example.com")).toBe(false);
  });
});
