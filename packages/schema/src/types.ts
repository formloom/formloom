import type { CanonicalHints } from "./hints";

/**
 * Schema version emitted by this library. Runtimes accept any `1.x` version,
 * so a v1.0 schema still validates under a v1.1 runtime and vice-versa.
 */
export const FORMLOOM_SCHEMA_VERSION = "1.1" as const;

/** Oldest schema version this runtime knows how to read. */
export const FORMLOOM_MIN_SUPPORTED_VERSION = "1.0" as const;

/**
 * The complete set of rendering primitives.
 * These are the ONLY field types. The LLM composes meaning from these.
 * A text field with placeholder "name@example.com" and an email regex IS an
 * email field; a text field with `hints.display = "textarea"` IS a textarea.
 */
export const FIELD_TYPES = [
  "text",
  "boolean",
  "radio",
  "select",
  "date",
  "number",
  "file",
] as const;

export type FieldType = (typeof FIELD_TYPES)[number];

// ---- Validation ----

export interface ValidationRule {
  /** Whether the field must be filled before submission */
  required?: boolean;
  /** Regex pattern string (without delimiters) for text/date fields */
  pattern?: string;
  /** Human-readable error message if pattern fails */
  patternMessage?: string;
}

export interface NumberValidationRule extends ValidationRule {
  /** Inclusive minimum value. */
  min?: number;
  /** Inclusive maximum value. */
  max?: number;
  /** Granularity. Must be > 0. */
  step?: number;
  /** When true, only whole numbers are accepted. */
  integer?: boolean;
}

// ---- Option type (for radio, select) ----

export interface FieldOption {
  /** Machine-readable value submitted with form data */
  value: string;
  /** Human-readable label displayed to user */
  label: string;
}

// ---- Rendering hints ----

/**
 * Optional, open-ended rendering hints. Renderers honor hints they understand
 * and silently ignore unknown ones. See `CANONICAL_HINTS` for the blessed set.
 * New hints can ship in a minor version without a schema break.
 */
export type RenderHints = CanonicalHints;

// ---- Conditional visibility ----

/**
 * DSL for expressing field visibility rules. Fields whose `showIf` evaluates
 * false are hidden in the renderer AND excluded from validation + submitted
 * data. The DSL is intentionally small: equality, membership, non-empty, and
 * boolean composition.
 */
export type ShowIfRule =
  | { field: string; equals: string | number | boolean }
  | { field: string; in: Array<string | number | boolean> }
  | { field: string; notEmpty: true }
  | { allOf: ShowIfRule[] }
  | { anyOf: ShowIfRule[] }
  | { not: ShowIfRule };

// ---- Field definitions ----

export interface BaseField {
  /** Unique identifier within the form. Used as the key in submitted data. */
  id: string;
  /** The rendering primitive type */
  type: FieldType;
  /** Human-readable label displayed to the user */
  label: string;
  /** Helper text shown below the field */
  description?: string;
  /** Validation rules */
  validation?: ValidationRule;
  /** Optional rendering hints */
  hints?: RenderHints;
  /** Visibility rule. When false, the field is hidden and omitted from data. */
  showIf?: ShowIfRule;
}

export interface TextField extends BaseField {
  type: "text";
  placeholder?: string;
  defaultValue?: string;
}

export interface BooleanField extends BaseField {
  type: "boolean";
  defaultValue?: boolean;
}

export interface RadioField extends BaseField {
  type: "radio";
  options: FieldOption[];
  defaultValue?: string;
}

export interface SelectField extends BaseField {
  type: "select";
  options: FieldOption[];
  multiple?: boolean;
  placeholder?: string;
  defaultValue?: string | string[];
}

export interface DateField extends BaseField {
  type: "date";
  placeholder?: string;
  defaultValue?: string;
}

export interface NumberField extends BaseField {
  type: "number";
  placeholder?: string;
  defaultValue?: number;
  validation?: NumberValidationRule;
}

export interface FileField extends BaseField {
  type: "file";
  /**
   * MIME-style accept list (same syntax as HTML <input accept>), e.g.
   * "image/*,application/pdf".
   */
  accept?: string;
  /** Maximum byte size per file. */
  maxSizeBytes?: number;
  /** When true, the field accepts multiple files. */
  multiple?: boolean;
  /**
   * File fields do not support `defaultValue` — the LLM cannot pre-seed a
   * file payload. The validator enforces its absence.
   */
  defaultValue?: never;
}

/** Union of all field types. */
export type FormField =
  | TextField
  | BooleanField
  | RadioField
  | SelectField
  | DateField
  | NumberField
  | FileField;

// ---- Sections ----

/**
 * Optional top-level grouping. When `sections` is provided, every field id
 * must appear in exactly one section. Renderers use sections to visually
 * group related fields; the flat `fields` array still defines canonical
 * order for LLM emission.
 */
export interface Section {
  id: string;
  title?: string;
  description?: string;
  fieldIds: string[];
}

// ---- File values ----

/**
 * Shape of a submitted file value. The `inline` variant carries the bytes as
 * a data URL — the default, self-contained behaviour. The `remote` variant
 * is produced when the host app supplies an `uploadHandler` that uploads the
 * file elsewhere and returns a URL.
 */
export type FormloomFileValue =
  | {
      kind: "inline";
      name: string;
      mime: string;
      size: number;
      dataUrl: string;
    }
  | {
      kind: "remote";
      name: string;
      mime: string;
      size: number;
      url: string;
    };

// ---- Form schema ----

/**
 * The complete form schema. This is what the LLM generates and what the
 * renderer consumes.
 */
export interface FormloomSchema {
  /**
   * Schema version (major.minor). Runtimes accept any version in the same
   * major line; unknown minor additions degrade gracefully.
   */
  version: string;
  /** Form title displayed to the user */
  title?: string;
  /** Form description / instructions */
  description?: string;
  /** The fields in display order */
  fields: FormField[];
  /** Optional grouping of fields into visual sections */
  sections?: Section[];
  /** Optional submit button label (default: "Submit") */
  submitLabel?: string;
}

// ---- Submitted data ----

/** Every value type that can appear in a submitted Formloom payload. */
export type FormloomFieldValue =
  | string
  | number
  | boolean
  | string[]
  | FormloomFileValue
  | FormloomFileValue[]
  | null;

/**
 * The shape of data returned when a user submits a form. Keys are field IDs,
 * values depend on field type. Hidden fields (via `showIf`) are excluded.
 */
export type FormloomData = Record<string, FormloomFieldValue>;
