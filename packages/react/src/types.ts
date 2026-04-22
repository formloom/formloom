import type {
  FormloomSchema,
  FormloomData,
  FormloomFieldValue,
  FormField,
  Section,
} from "@formloom/schema";
import type { AsyncValidator } from "./async-validators";

export type { AsyncValidator, AsyncValidatorConfig } from "./async-validators";
export type { UploadHandler } from "./file-adapter";

/**
 * State for a single field.
 */
export interface FieldState {
  value: FormloomFieldValue;
  error: string | null;
  touched: boolean;
  isValid: boolean;
  /** True while an async validator is in flight for this field. */
  isValidating: boolean;
  /**
   * Effective read-only flag: true when either the hook-level `readOnly`
   * option or this field's `readOnly` schema property is true. Renderers
   * should present the field as a non-editable summary.
   */
  readOnly: boolean;
  /**
   * Effective disabled flag: true when either the hook-level `disabled`
   * option or this field's `disabled` schema property is true. Renderers
   * should grey out the input. Semantically distinct from `readOnly` only
   * at the render layer; submission behaviour is identical.
   */
  disabled: boolean;
}

/**
 * Metadata describing the freeform ("Other…") input surface for a
 * radio/select field that has `allowCustom: true`.
 */
export interface FieldCustomInfo {
  /** True when the field schema allows custom values. */
  allowed: boolean;
  /** Label for the freeform input. Falls back to "Other". */
  label: string;
  /** Placeholder for the freeform input. */
  placeholder?: string;
  /** True when the current value is outside the option set. */
  isCustomValue: boolean;
}

/**
 * Props/helpers for a single field, returned by useFormloom.
 */
export interface FieldProps {
  field: FormField;
  state: FieldState;
  onChange: (value: FormloomFieldValue) => void;
  onBlur: () => void;
  /**
   * False when a `showIf` rule hides this field. Hidden fields are also
   * excluded from `visibleFields`, `data`, and validation, but remain in
   * `fields` so consumer render logic keyed off the flat array stays stable.
   */
  visible: boolean;
  /**
   * Present when the field is a radio or select that was declared with
   * `allowCustom: true`. Renderers use this to show an "Other…" affordance
   * and detect when the current value is a freeform entry.
   */
  custom?: FieldCustomInfo;
}

/**
 * A section of fields. Only present in the hook's return value when the
 * schema declares a `sections` array.
 */
export interface SectionProps {
  section: Section;
  /** All fields in this section, in declared order. Includes hidden fields. */
  fields: FieldProps[];
  /** Only the visible fields. */
  visibleFields: FieldProps[];
  /** False when every field in the section is hidden. */
  visible: boolean;
}

/**
 * Return value of useFormloom.
 */
export interface UseFormloomReturn {
  schema: FormloomSchema;
  /** Every field, including hidden ones. Stable reference keyed by visibility. */
  fields: FieldProps[];
  /** Only fields that pass their `showIf` rule. */
  visibleFields: FieldProps[];
  /** Fields grouped by section, present only when the schema declares sections. */
  sections?: SectionProps[];
  getField: (id: string) => FieldProps | undefined;
  /** Submitted data. Hidden fields are omitted. */
  data: FormloomData;
  /**
   * True when all visible fields would pass synchronous validation right now
   * (eager, not just touched fields). Use this to gate submit buttons or
   * show completion indicators. On a fresh form with required fields this
   * is false. Async validator state is reported via `isValidating` and flows
   * into `errors` once validators settle.
   */
  isValid: boolean;
  isDirty: boolean;
  /** True while an async onSubmit handler is in-flight. */
  isSubmitting: boolean;
  /** True while at least one async validator is pending or debouncing. */
  isValidating: boolean;
  handleSubmit: () => Promise<void>;
  reset: () => void;
  errors: Array<{ fieldId: string; message: string }>;
}

/**
 * Options passed to useFormloom hook. `initialValues` and `validators` are
 * captured on mount via `useRef` — passing a new object reference on
 * re-render does not reset the form (same semantics as the `useState`
 * initialiser).
 *
 * File uploads are handled outside the hook: consumers call `adaptFile(file,
 * uploadHandler)` inside the file-input `onChange` and pass the result to
 * `field.onChange`. The hook itself only sees the already-adapted
 * `FormloomFileValue`.
 */
export interface UseFormloomOptions {
  schema: FormloomSchema;
  onSubmit: (data: FormloomData) => void | Promise<void>;
  onError?: (errors: Array<{ fieldId: string; message: string }>) => void;
  initialValues?: Partial<FormloomData>;
  /** Per-field async validators. */
  validators?: Record<string, AsyncValidator>;
  /**
   * Called synchronously after every user-initiated field change, right
   * after the state update commits and any same-tick sync validation runs.
   * Useful for live-syncing form state to an LLM context as the user types.
   *
   * Not fired on `reset()`, on initial render, or on visibility changes —
   * only on `handleChange` from a user interaction. Debounce in userland if
   * needed; the hook deliberately stays synchronous.
   */
  onValueChange?: (
    fieldId: string,
    value: FormloomFieldValue,
    data: FormloomData,
  ) => void;
  /**
   * When true, every field renders as a non-editable summary. Per-field
   * `readOnly` in the schema overrides this (a field with `readOnly: false`
   * stays editable even when the hook is read-only). `handleSubmit` silently
   * returns while this is true.
   */
  readOnly?: boolean;
  /**
   * When true, every field renders as disabled. Per-field `disabled`
   * overrides this. `handleSubmit` silently returns while this is true.
   */
  disabled?: boolean;
}
