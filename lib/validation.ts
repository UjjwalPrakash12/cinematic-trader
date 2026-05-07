import { sanitizeText, looksLikeHtmlPayload } from "@/lib/sanitize";

/**
 * Zero-dependency validators for the input shapes commonly seen in this kind
 * of app (booking forms, chat prompts, login). They:
 *   - reject non-string / wrong-type fields early
 *   - enforce length and format limits (OWASP A04:2021 - Insecure Design)
 *   - return both a sanitized value and a list of human-readable errors
 *   - never throw — callers decide how to surface failures
 *
 * For larger/typed schemas, consider migrating to `zod`. These helpers are kept
 * dependency-free to avoid expanding the install footprint of this project.
 */

export type ValidationOk<T> = { ok: true; value: T };
export type ValidationErr = { ok: false; errors: string[] };
export type ValidationResult<T> = ValidationOk<T> | ValidationErr;

const NAME_RE = /^[\p{L}\p{M}'\- .]{1,80}$/u;
const PHONE_RE = /^\+?[0-9 ()\-]{6,20}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export interface ChatPromptInput {
  prompt: string;
}

/** Validation for AI / chatbot prompts. */
export function validateChatPrompt(input: unknown): ValidationResult<ChatPromptInput> {
  const errors: string[] = [];
  if (!isPlainObject(input)) {
    return { ok: false, errors: ["Invalid request body."] };
  }
  rejectUnexpectedFields(input, ["prompt"], errors);

  const raw = (input as Record<string, unknown>).prompt;
  const sanitized = sanitizeText(raw, { maxLength: 1000, allowNewlines: true });
  if (sanitized.length === 0) errors.push("Prompt is required.");
  if (typeof raw === "string" && raw.length > 1000) errors.push("Prompt is too long.");
  if (sanitized && looksLikeHtmlPayload(sanitized)) {
    errors.push("Prompt contains disallowed content.");
  }

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, value: { prompt: sanitized } };
}

export interface BookingInput {
  name: string;
  email: string;
  phone: string;
  message: string;
  date: string;
  time: string;
  guests: number;
}

/** Validation for booking / contact forms. */
export function validateBooking(input: unknown): ValidationResult<BookingInput> {
  const errors: string[] = [];
  if (!isPlainObject(input)) return { ok: false, errors: ["Invalid request body."] };
  rejectUnexpectedFields(
    input,
    ["name", "email", "phone", "message", "date", "time", "guests"],
    errors
  );

  const obj = input as Record<string, unknown>;
  const name = sanitizeText(obj.name, { maxLength: 80, allowNewlines: false });
  const email = sanitizeText(obj.email, { maxLength: 254, allowNewlines: false }).toLowerCase();
  const phone = sanitizeText(obj.phone, { maxLength: 20, allowNewlines: false });
  const message = sanitizeText(obj.message, { maxLength: 1000, allowNewlines: true });
  const date = sanitizeText(obj.date, { maxLength: 10, allowNewlines: false });
  const time = sanitizeText(obj.time, { maxLength: 5, allowNewlines: false });
  const guestsRaw = obj.guests;
  const guests =
    typeof guestsRaw === "number"
      ? guestsRaw
      : typeof guestsRaw === "string" && /^\d+$/.test(guestsRaw)
        ? Number.parseInt(guestsRaw, 10)
        : Number.NaN;

  if (!NAME_RE.test(name)) errors.push("Please enter a valid name.");
  if (!EMAIL_RE.test(email)) errors.push("Please enter a valid email address.");
  if (!PHONE_RE.test(phone)) errors.push("Please enter a valid phone number.");
  if (looksLikeHtmlPayload(message)) errors.push("Message contains disallowed content.");
  if (!ISO_DATE_RE.test(date) || Number.isNaN(Date.parse(date))) errors.push("Please choose a valid date.");
  if (!TIME_RE.test(time)) errors.push("Please choose a valid time.");
  if (!Number.isInteger(guests) || guests < 1 || guests > 50) {
    errors.push("Guests must be between 1 and 50.");
  }

  if (errors.length > 0) return { ok: false, errors };

  return {
    ok: true,
    value: { name, email, phone, message, date, time, guests },
  };
}

export interface LoginInput {
  email: string;
  password: string;
}

/** Validation for login forms — never reveal which field failed. */
export function validateLogin(input: unknown): ValidationResult<LoginInput> {
  if (!isPlainObject(input)) return { ok: false, errors: ["Invalid email or password."] };
  rejectUnexpectedFields(input, ["email", "password"], []);
  const obj = input as Record<string, unknown>;
  const email = sanitizeText(obj.email, { maxLength: 254, allowNewlines: false }).toLowerCase();
  const password = typeof obj.password === "string" ? obj.password : "";

  if (!EMAIL_RE.test(email) || password.length < 8 || password.length > 256) {
    return { ok: false, errors: ["Invalid email or password."] };
  }
  return { ok: true, value: { email, password } };
}

/** Validation helper for CSV upload metadata (size + type guards). */
export interface CsvUploadGuardOptions {
  maxBytes?: number;
  maxRows?: number;
  allowedMimeTypes?: ReadonlyArray<string>;
}

export function validateCsvUploadMeta(
  meta: { size: number; type: string; name: string },
  options?: CsvUploadGuardOptions
): ValidationResult<{ size: number; type: string; name: string }> {
  const errors: string[] = [];
  const maxBytes = options?.maxBytes ?? 2 * 1024 * 1024;
  const allowed = options?.allowedMimeTypes ?? [
    "text/csv",
    "application/vnd.ms-excel",
    "text/plain",
  ];

  if (!Number.isFinite(meta.size) || meta.size <= 0) errors.push("Empty file.");
  if (meta.size > maxBytes) errors.push(`File exceeds ${Math.round(maxBytes / 1024)} KB limit.`);
  if (!allowed.includes(meta.type)) errors.push("Unsupported file type.");
  const name = sanitizeText(meta.name, { maxLength: 255, allowNewlines: false });
  if (!/^[\w\-. ]{1,255}\.csv$/i.test(name)) errors.push("Invalid file name.");

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, value: { size: meta.size, type: meta.type, name } };
}

/**
 * Defensive CSV cell hardening (OWASP CSV injection / formula injection):
 * prefix with a single quote when a cell starts with =, +, -, @, tab, or CR.
 */
export function neutralizeCsvCell(value: string): string {
  if (typeof value !== "string" || value.length === 0) return value;
  const first = value.charAt(0);
  if (first === "=" || first === "+" || first === "-" || first === "@" || first === "\t" || first === "\r") {
    return `'${value}`;
  }
  return value;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function rejectUnexpectedFields(
  obj: Record<string, unknown>,
  allowed: ReadonlyArray<string>,
  errors: string[]
): void {
  for (const key of Object.keys(obj)) {
    if (!allowed.includes(key)) errors.push(`Unexpected field: ${key}`);
  }
}
