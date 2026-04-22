import type {
  FormField,
  FormloomFieldValue,
  FormloomFileValue,
  NumberField,
  FileField,
} from "@formloom/schema";
import { safeRegexTest, fileMatchesAccept } from "@formloom/schema";

export { fileMatchesAccept, mimeMatches } from "@formloom/schema";

/**
 * Runs synchronous validation for a single field value. Returns a
 * user-facing error message or `null` when the value passes.
 *
 * Shared by the hook's eager `isValid`, the blur/change/submit paths, and
 * the `@formloom/zod` adapter so validation behaves identically everywhere.
 */
export function validateField(
  field: FormField,
  value: FormloomFieldValue,
): string | null {
  const requiredError = checkRequired(field, value);
  if (requiredError !== null) return requiredError;

  if (field.type === "number") {
    return validateNumberValue(field, value);
  }
  if (field.type === "file") {
    return validateFileValue(field, value);
  }
  if (field.type === "text" || field.type === "date") {
    return validateStringPattern(field, value);
  }
  if (field.type === "radio" && field.allowCustom === true) {
    return validateStringPattern(field, value);
  }
  if (field.type === "select" && field.allowCustom === true) {
    if (field.multiple === true && Array.isArray(value)) {
      for (const entry of value) {
        const err = validateStringPattern(field, entry);
        if (err !== null) return err;
      }
      return null;
    }
    return validateStringPattern(field, value);
  }
  return null;
}

// ---- Required check ----

function checkRequired(
  field: FormField,
  value: FormloomFieldValue,
): string | null {
  const v = field.validation;
  if (v?.required !== true) return null;

  if (value === null || value === undefined || value === "") {
    return `${field.label} is required`;
  }
  if (Array.isArray(value) && value.length === 0) {
    return `${field.label} is required`;
  }
  return null;
}

// ---- Text / date pattern ----

function validateStringPattern(
  field: FormField,
  value: FormloomFieldValue,
): string | null {
  const v = field.validation;
  if (v?.pattern === undefined) return null;
  if (typeof value !== "string" || value === "") return null;

  const result = safeRegexTest(v.pattern, value);
  if (result.skipped) return null;
  if (result.matched) return null;
  return v.patternMessage ?? `${field.label} format is invalid`;
}

// ---- Number ----

function validateNumberValue(
  field: NumberField,
  value: FormloomFieldValue,
): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return `${field.label} must be a number`;
  }
  const v = field.validation;
  if (v === undefined) return null;

  if (v.integer === true && !Number.isInteger(value)) {
    return `${field.label} must be a whole number`;
  }
  if (typeof v.min === "number" && value < v.min) {
    return `${field.label} must be at least ${v.min}`;
  }
  if (typeof v.max === "number" && value > v.max) {
    return `${field.label} must be at most ${v.max}`;
  }
  if (
    typeof v.step === "number" &&
    v.step > 0 &&
    !isCloseToStep(value, v.step, typeof v.min === "number" ? v.min : 0)
  ) {
    return `${field.label} must be a multiple of ${v.step}`;
  }
  return null;
}

/**
 * Tolerance for step-alignment checks. Floats that went through `x / step`
 * and back are rarely exact; this absorbs normal IEEE-754 drift without
 * letting genuine misalignment slip through.
 */
const STEP_EPSILON = 1e-9;

function isCloseToStep(value: number, step: number, base: number): boolean {
  const ratio = (value - base) / step;
  const rounded = Math.round(ratio);
  return Math.abs(ratio - rounded) < STEP_EPSILON;
}

// ---- File ----

function validateFileValue(
  field: FileField,
  value: FormloomFieldValue,
): string | null {
  if (value === null || value === undefined) return null;

  const files = Array.isArray(value) ? value : [value];
  for (const file of files) {
    if (!isFileValue(file)) {
      return `${field.label} has an invalid file value`;
    }
    if (field.maxSizeBytes !== undefined && file.size > field.maxSizeBytes) {
      return `${field.label}: "${file.name}" is larger than ${field.maxSizeBytes} bytes`;
    }
    if (
      field.accept !== undefined &&
      !fileMatchesAccept(field.accept, file.mime, file.name)
    ) {
      return `${field.label}: "${file.name}" type "${file.mime}" is not accepted`;
    }
  }
  return null;
}

function isFileValue(v: unknown): v is FormloomFileValue {
  if (v === null || typeof v !== "object") return false;
  const f = v as Record<string, unknown>;
  return (
    (f.kind === "inline" || f.kind === "remote") &&
    typeof f.name === "string" &&
    typeof f.mime === "string" &&
    typeof f.size === "number"
  );
}

