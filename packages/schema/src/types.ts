/**
 * Schema version. Included in every schema for future compatibility.
 */
export const FORMLOOM_SCHEMA_VERSION = "1.0" as const;

/**
 * The complete set of rendering primitives.
 * These are the ONLY field types. The LLM composes meaning from these.
 * A text field with placeholder "name@example.com" and an email regex IS an email field.
 */
export const FIELD_TYPES = [
  "text",
  "boolean",
  "radio",
  "select",
  "date",
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

// ---- Option type (for radio, select) ----

export interface FieldOption {
  /** Machine-readable value submitted with form data */
  value: string;
  /** Human-readable label displayed to user */
  label: string;
}

// ---- Rendering hints ----

/**
 * Optional, open-ended rendering hints.
 * Renderers honor hints they understand and silently ignore unknown ones.
 * New hints can be added without bumping the schema version.
 */
export interface RenderHints {
  /** Suggested display variant */
  display?: string;
  /** Width hint: "full", "half", "third", etc. */
  width?: string;
  /** Any additional hint */
  [key: string]: unknown;
}

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

/** Union of all field types */
export type FormField =
  | TextField
  | BooleanField
  | RadioField
  | SelectField
  | DateField;

// ---- Form schema ----

/**
 * The complete form schema. This is what the LLM generates
 * and what the renderer consumes.
 */
export interface FormloomSchema {
  /** Schema version for compatibility */
  version: typeof FORMLOOM_SCHEMA_VERSION;
  /** Form title displayed to the user */
  title?: string;
  /** Form description / instructions */
  description?: string;
  /** The fields in display order */
  fields: FormField[];
  /** Optional submit button label (default: "Submit") */
  submitLabel?: string;
}

// ---- Submitted data ----

/**
 * The shape of data returned when a user submits a form.
 * Keys are field IDs, values depend on field type.
 */
export type FormloomData = Record<string, string | boolean | string[] | null>;
