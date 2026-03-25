import type {
  FormloomSchema,
  FormloomData,
  FormField,
} from "@formloom/schema";

/**
 * State for a single field.
 */
export interface FieldState {
  value: string | boolean | string[] | null;
  error: string | null;
  touched: boolean;
  isValid: boolean;
}

/**
 * Props/helpers for a single field, returned by useFormloom.
 */
export interface FieldProps {
  field: FormField;
  state: FieldState;
  onChange: (value: string | boolean | string[] | null) => void;
  onBlur: () => void;
}

/**
 * Return value of useFormloom.
 */
export interface UseFormloomReturn {
  schema: FormloomSchema;
  fields: FieldProps[];
  getField: (id: string) => FieldProps | undefined;
  data: FormloomData;
  /**
   * True when all fields would pass validation right now (eager, not just
   * touched fields). Use this to gate submit buttons or show completion
   * indicators. On a fresh form with required fields this is false.
   */
  isValid: boolean;
  isDirty: boolean;
  /**
   * True while an async onSubmit handler is in-flight.
   * Use this to disable the submit button and show loading state.
   */
  isSubmitting: boolean;
  handleSubmit: () => Promise<void>;
  reset: () => void;
  errors: Array<{ fieldId: string; message: string }>;
}

/**
 * Options passed to useFormloom hook.
 * initialValues are only read on mount — passing a new object reference
 * on re-render does not reset the form (same semantics as useState initialiser).
 */
export interface UseFormloomOptions {
  schema: FormloomSchema;
  onSubmit: (data: FormloomData) => void | Promise<void>;
  onError?: (errors: Array<{ fieldId: string; message: string }>) => void;
  initialValues?: Partial<FormloomData>;
}
