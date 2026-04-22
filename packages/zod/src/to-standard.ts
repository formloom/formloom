import type { FormloomData, FormloomSchema } from "@formloom/schema";
import {
  evaluateShowIf,
  fileMatchesAccept,
  safeRegexTest,
} from "@formloom/schema";

/**
 * Minimal Standard Schema v1 vendor shape. Inlined so this package does not
 * require `@standard-schema/spec` as a dependency — the shape is frozen by
 * the spec and unchanged across adapter releases.
 *
 * See: https://standardschema.dev
 */
export interface StandardSchemaV1<Output> {
  readonly "~standard": {
    readonly version: 1;
    readonly vendor: "formloom";
    readonly validate: (value: unknown) =>
      | { readonly value: Output }
      | { readonly issues: readonly StandardSchemaIssue[] };
    readonly types?: { readonly input: Output; readonly output: Output };
  };
}

export interface StandardSchemaIssue {
  readonly message: string;
  readonly path?: readonly (string | number)[];
}

/**
 * Produces a Standard Schema v1 validator from a Formloom schema. The result
 * can be plugged into any library that consumes Standard Schema (tRPC,
 * react-hook-form, arktype-compatible tools, etc.) without pulling in Zod.
 *
 * The validator reuses the same sync field rules as `@formloom/schema`'s
 * validator and `@formloom/react`'s `validateField`, so behaviour is
 * consistent across the stack.
 */
export function formloomToStandardSchema(
  schema: FormloomSchema,
): StandardSchemaV1<FormloomData> {
  const validate = (value: unknown):
    | { value: FormloomData }
    | { issues: StandardSchemaIssue[] } => {
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
      return {
        issues: [{ message: "Expected a plain object", path: [] }],
      };
    }

    const data = value as FormloomData;
    const issues: StandardSchemaIssue[] = [];

    for (const field of schema.fields) {
      const visible = evaluateShowIf(field.showIf, data);
      if (!visible) continue;

      const raw = data[field.id];
      const required = field.validation?.required === true;

      if (required && isMissing(raw)) {
        issues.push({
          message: `${field.label} is required`,
          path: [field.id],
        });
        continue;
      }

      if (raw === null || raw === undefined) continue;

      const err = validateSingle(field, raw);
      if (err !== null) {
        issues.push({ message: err, path: [field.id] });
      }
    }

    if (issues.length > 0) return { issues };
    return { value: data };
  };

  return {
    "~standard": {
      version: 1,
      vendor: "formloom",
      validate,
    },
  };
}

function validateSingle(
  field: FormloomSchema["fields"][number],
  value: unknown,
): string | null {
  switch (field.type) {
    case "text":
    case "date": {
      if (typeof value !== "string") return `${field.label} must be a string`;
      const pattern = field.validation?.pattern;
      if (typeof pattern === "string" && pattern.length > 0 && value !== "") {
        const result = safeRegexTest(pattern, value);
        if (!result.skipped && !result.matched) {
          return field.validation?.patternMessage ??
            `${field.label} format is invalid`;
        }
      }
      return null;
    }
    case "boolean":
      return typeof value === "boolean" ? null : `${field.label} must be a boolean`;
    case "radio": {
      if (typeof value !== "string") return `${field.label} must be a string`;
      if (field.allowCustom === true) {
        return checkPattern(field, value);
      }
      const allowed = field.options.map((o) => o.value);
      if (!allowed.includes(value)) {
        return `${field.label} must be one of: ${allowed.join(", ")}`;
      }
      return null;
    }
    case "select": {
      const allowed = field.options.map((o) => o.value);
      if (field.multiple === true) {
        if (!Array.isArray(value)) {
          return `${field.label} must be an array`;
        }
        for (const entry of value) {
          if (typeof entry !== "string") {
            return `${field.label} contains invalid option "${String(entry)}"`;
          }
          if (field.allowCustom === true) {
            const patternErr = checkPattern(field, entry);
            if (patternErr !== null) return patternErr;
          } else if (!allowed.includes(entry)) {
            return `${field.label} contains invalid option "${entry}"`;
          }
        }
        return null;
      }
      if (typeof value !== "string") return `${field.label} must be a string`;
      if (field.allowCustom === true) {
        return checkPattern(field, value);
      }
      if (!allowed.includes(value)) {
        return `${field.label} must be one of: ${allowed.join(", ")}`;
      }
      return null;
    }
    case "number": {
      if (typeof value !== "number" || !Number.isFinite(value)) {
        return `${field.label} must be a number`;
      }
      const v = field.validation;
      if (v?.integer === true && !Number.isInteger(value)) {
        return `${field.label} must be a whole number`;
      }
      if (typeof v?.min === "number" && value < v.min) {
        return `${field.label} must be at least ${v.min}`;
      }
      if (typeof v?.max === "number" && value > v.max) {
        return `${field.label} must be at most ${v.max}`;
      }
      if (typeof v?.step === "number" && v.step > 0) {
        const base = typeof v.min === "number" ? v.min : 0;
        const ratio = (value - base) / v.step;
        if (Math.abs(ratio - Math.round(ratio)) > 1e-9) {
          return `${field.label} must be a multiple of ${v.step}`;
        }
      }
      return null;
    }
    case "file": {
      const items = Array.isArray(value) ? value : [value];
      for (const item of items) {
        if (!isFileValue(item)) {
          return `${field.label} has an invalid file value`;
        }
        if (
          field.maxSizeBytes !== undefined &&
          item.size > field.maxSizeBytes
        ) {
          return `${field.label}: "${item.name}" is larger than ${field.maxSizeBytes} bytes`;
        }
        if (
          field.accept !== undefined &&
          !fileMatchesAccept(field.accept, item.mime, item.name)
        ) {
          return `${field.label}: "${item.name}" type "${item.mime}" is not accepted`;
        }
      }
      return null;
    }
  }
}

function checkPattern(
  field: { validation?: { pattern?: string; patternMessage?: string }; label: string },
  value: string,
): string | null {
  const pattern = field.validation?.pattern;
  if (typeof pattern !== "string" || pattern.length === 0 || value === "") {
    return null;
  }
  const result = safeRegexTest(pattern, value);
  if (result.skipped || result.matched) return null;
  return field.validation?.patternMessage ?? `${field.label} format is invalid`;
}

function isFileValue(v: unknown): v is { kind: string; name: string; mime: string; size: number } {
  if (v === null || typeof v !== "object") return false;
  const f = v as Record<string, unknown>;
  return (
    (f.kind === "inline" || f.kind === "remote") &&
    typeof f.name === "string" &&
    typeof f.mime === "string" &&
    typeof f.size === "number"
  );
}

function isMissing(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === "string" && value === "") return true;
  if (Array.isArray(value) && value.length === 0) return true;
  return false;
}
