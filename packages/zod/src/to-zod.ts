import { z } from "zod";
import type {
  FormField,
  FormloomData,
  FormloomSchema,
  NumberField,
  FileField,
  TextField,
  DateField,
  RadioField,
  SelectField,
  BooleanField,
} from "@formloom/schema";
import {
  evaluateShowIf,
  fileMatchesAccept,
  safeRegexTest,
} from "@formloom/schema";

export interface FormloomToZodOptions {
  /** Honour `showIf` rules when checking requiredness. Default: true. */
  honorShowIf?: boolean;
  /** Unknown-key handling on the top-level object. */
  unknownKeys?: "strip" | "strict" | "passthrough";
}

/**
 * Builds a Zod schema from a Formloom schema. Accepts data matching the shape
 * of `FormloomData` returned by `useFormloom`'s `onSubmit`.
 *
 * Required semantics are enforced at the object level via `.superRefine`, so
 * `showIf`-gated fields become required only when their rule evaluates true
 * against the same object being validated. This means the returned schema is
 * a `ZodEffects`-wrapped `ZodObject`, not a bare `ZodObject`. Consumers
 * needing direct access to the underlying object shape (for example, to read
 * `.shape`) should use {@link formloomToZodObject} instead.
 *
 * Regex patterns go through `safeRegexTest` so catastrophic patterns never
 * hang Zod parsing.
 */
export function formloomToZod(
  schema: FormloomSchema,
  opts: FormloomToZodOptions = {},
): z.ZodTypeAny {
  const object = formloomToZodObject(schema, opts);
  const { honorShowIf = true } = opts;

  return object.superRefine((data, ctx) => {
    for (const field of schema.fields) {
      const required = field.validation?.required === true;
      if (!required) continue;

      const visible = honorShowIf
        ? evaluateShowIf(field.showIf, data as FormloomData)
        : true;
      if (!visible) continue;

      const value = (data as FormloomData)[field.id];
      if (isMissing(value)) {
        ctx.addIssue({
          code: "custom",
          path: [field.id],
          message: `${field.label} is required`,
        });
      }
    }
  });
}

/**
 * Builds a bare Zod object (no `.superRefine` for required-when-visible) from
 * a Formloom schema. Every field is `.optional().nullable()` so hidden or
 * unfilled fields are accepted. Use this when you need access to the
 * underlying `ZodObject` (e.g. `.shape`, `.extend()`) and plan to re-wrap
 * requiredness yourself; otherwise prefer {@link formloomToZod}.
 */
export function formloomToZodObject(
  schema: FormloomSchema,
  opts: FormloomToZodOptions = {},
): z.ZodObject<z.ZodRawShape> {
  const { unknownKeys = "strip" } = opts;

  const shape: z.ZodRawShape = {};
  for (const field of schema.fields) {
    shape[field.id] = fieldToZod(field);
  }

  let obj: z.ZodObject<z.ZodRawShape> = z.object(shape);
  if (unknownKeys === "strict") obj = obj.strict();
  else if (unknownKeys === "passthrough") obj = obj.passthrough();
  return obj;
}

// ---- Per-field converters ----

function fieldToZod(field: FormField): z.ZodTypeAny {
  switch (field.type) {
    case "text":
      return textToZod(field).optional().nullable();
    case "date":
      return dateToZod(field).optional().nullable();
    case "boolean":
      return booleanToZod(field).optional().nullable();
    case "radio":
      return radioToZod(field).optional().nullable();
    case "select":
      return selectToZod(field).optional().nullable();
    case "number":
      return numberToZod(field).optional().nullable();
    case "file":
      return fileToZod(field).optional().nullable();
  }
}

function textToZod(field: TextField): z.ZodTypeAny {
  let schema: z.ZodTypeAny = z.string();
  const pattern = field.validation?.pattern;
  if (typeof pattern === "string" && pattern.length > 0) {
    schema = schema.refine(
      (value: unknown) => {
        if (typeof value !== "string" || value === "") return true;
        const result = safeRegexTest(pattern, value);
        if (result.skipped) return true;
        return result.matched;
      },
      { message: field.validation?.patternMessage ?? `${field.label} format is invalid` },
    );
  }
  return schema;
}

function dateToZod(field: DateField): z.ZodTypeAny {
  const iso = /^\d{4}-\d{2}-\d{2}$/;
  return z.string().refine(
    (value) => value === "" || iso.test(value),
    { message: `${field.label} must be an ISO 8601 date (YYYY-MM-DD)` },
  );
}

function booleanToZod(_field: BooleanField): z.ZodTypeAny {
  return z.boolean();
}

function radioToZod(field: RadioField): z.ZodTypeAny {
  if (field.allowCustom === true) {
    return applyPatternRefine(z.string(), field);
  }
  const values = field.options.map((o) => o.value);
  if (values.length === 0) return z.string();
  return z.enum(values as [string, ...string[]]);
}

function selectToZod(field: SelectField): z.ZodTypeAny {
  if (field.allowCustom === true) {
    const entry = applyPatternRefine(z.string(), field);
    return field.multiple === true ? z.array(entry) : entry;
  }
  const values = field.options.map((o) => o.value);
  if (values.length === 0) {
    return field.multiple === true ? z.array(z.string()) : z.string();
  }
  const enumSchema = z.enum(values as [string, ...string[]]);
  return field.multiple === true ? z.array(enumSchema) : enumSchema;
}

function applyPatternRefine(
  schema: z.ZodString,
  field: RadioField | SelectField,
): z.ZodTypeAny {
  const pattern = field.validation?.pattern;
  if (typeof pattern !== "string" || pattern.length === 0) return schema;
  return schema.refine(
    (value: unknown) => {
      if (typeof value !== "string" || value === "") return true;
      const result = safeRegexTest(pattern, value);
      if (result.skipped) return true;
      return result.matched;
    },
    {
      message:
        field.validation?.patternMessage ?? `${field.label} format is invalid`,
    },
  );
}

function numberToZod(field: NumberField): z.ZodTypeAny {
  let schema = z.number();
  const v = field.validation;
  if (v?.integer === true) schema = schema.int();
  if (typeof v?.min === "number") schema = schema.min(v.min);
  if (typeof v?.max === "number") schema = schema.max(v.max);
  if (typeof v?.step === "number" && v.step > 0) {
    const base = typeof v.min === "number" ? v.min : 0;
    return schema.refine(
      (value) => {
        const ratio = (value - base) / v.step!;
        return Math.abs(ratio - Math.round(ratio)) < 1e-9;
      },
      { message: `${field.label} must be a multiple of ${v.step}` },
    );
  }
  return schema;
}

function fileToZod(field: FileField): z.ZodTypeAny {
  const baseShape = {
    kind: z.enum(["inline", "remote"]),
    name: z.string(),
    mime: z.string(),
    size: z.number(),
    dataUrl: z.string().optional(),
    url: z.string().optional(),
  };
  const single = z.object(baseShape).superRefine((file, ctx) => {
    if (
      field.maxSizeBytes !== undefined &&
      typeof file.size === "number" &&
      file.size > field.maxSizeBytes
    ) {
      ctx.addIssue({
        code: "custom",
        message: `${field.label}: "${file.name}" is larger than ${field.maxSizeBytes} bytes`,
      });
    }
    if (
      field.accept !== undefined &&
      !fileMatchesAccept(field.accept, file.mime, file.name)
    ) {
      ctx.addIssue({
        code: "custom",
        message: `${field.label}: "${file.name}" type "${file.mime}" is not accepted`,
      });
    }
  });
  return field.multiple === true ? z.array(single) : single;
}

function isMissing(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === "string" && value === "") return true;
  if (Array.isArray(value) && value.length === 0) return true;
  return false;
}
