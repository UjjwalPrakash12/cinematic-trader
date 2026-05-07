/**
 * Input sanitization helpers (OWASP A03:2021 - Injection / XSS hardening).
 *
 * IMPORTANT: React already escapes string children, so rendering a sanitized
 * string via JSX is safe. These helpers exist for:
 *   - server-side validation before storing or echoing values
 *   - cases where text is interpolated into HTML, URLs, or logs
 *   - dropping invisible / control characters used in spam / injection payloads
 *
 * Do NOT use these helpers as a replacement for parameterized queries,
 * server-side validation, or output encoding at the right context.
 */

const HTML_ESCAPE_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
  "/": "&#x2F;",
  "`": "&#x60;",
  "=": "&#x3D;",
};

/** Escape user-supplied text for safe interpolation into HTML. */
export function escapeHtml(value: string): string {
  return value.replace(/[&<>"'`=/]/g, (char) => HTML_ESCAPE_MAP[char] ?? char);
}

/**
 * Strip ASCII control characters and zero-width / bidi-override characters.
 * Keeps newlines and tabs by default so chat messages still wrap correctly.
 */
export function stripControlCharacters(value: string, options?: { allowNewlines?: boolean }): string {
  const allowNewlines = options?.allowNewlines ?? true;
  // Control chars except (optionally) \n \r \t, plus zero-width / bidi overrides.
  const pattern = allowNewlines
    ? /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F\u200B-\u200F\u2028-\u202F\u2060-\u206F\uFEFF]/g
    : /[\x00-\x1F\x7F\u200B-\u200F\u2028-\u202F\u2060-\u206F\uFEFF]/g;
  return value.replace(pattern, "");
}

/** Collapse runs of whitespace to a single space and trim. */
export function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

/**
 * Defensive normalization for free-form text inputs (chat prompts, names,
 * messages). Returns the trimmed, control-char-stripped string clipped to
 * `maxLength`.
 */
export function sanitizeText(
  value: unknown,
  options: { maxLength: number; allowNewlines?: boolean }
): string {
  if (typeof value !== "string") return "";
  const stripped = stripControlCharacters(value, { allowNewlines: options.allowNewlines ?? true });
  const trimmed = stripped.trim();
  return trimmed.slice(0, options.maxLength);
}

/** Quick heuristic flag for "looks like HTML / script payload" inputs. */
export function looksLikeHtmlPayload(value: string): boolean {
  return /<\s*\/?\s*(script|iframe|img|svg|object|embed|link|meta|style)\b/i.test(value);
}
