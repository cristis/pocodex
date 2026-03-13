const HTTP_PROTOCOLS = new Set(["http:", "https:"]);

export interface UrlValidationSuccess {
  ok: true;
  value: string;
}

export interface UrlValidationFailure {
  ok: false;
  error: string;
}

export type UrlValidationResult = UrlValidationSuccess | UrlValidationFailure;

export function validateConfiguredUrl(rawValue: string): UrlValidationResult {
  const trimmedValue = rawValue.trim();
  if (!trimmedValue) {
    return {
      ok: false,
      error: "Enter the full Pocodex URL.",
    };
  }

  if (!/^[A-Za-z][A-Za-z\d+.-]*:\/\//.test(trimmedValue)) {
    return {
      ok: false,
      error: "Use an http:// or https:// URL.",
    };
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(trimmedValue);
  } catch {
    return {
      ok: false,
      error: "Enter a valid absolute URL.",
    };
  }

  if (!HTTP_PROTOCOLS.has(parsedUrl.protocol)) {
    return {
      ok: false,
      error: "Use an http:// or https:// URL.",
    };
  }

  return {
    ok: true,
    value: trimmedValue,
  };
}

export function isEmbeddedWebUrl(url: string): boolean {
  if (url === "about:blank") {
    return true;
  }

  try {
    return HTTP_PROTOCOLS.has(new URL(url).protocol);
  } catch {
    return false;
  }
}
