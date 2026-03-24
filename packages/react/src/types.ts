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
  isValid: boolean;
  isDirty: boolean;
  handleSubmit: () => void;
  reset: () => void;
  errors: Array<{ fieldId: string; message: string }>;
}

/**
 * Options passed to useFormloom hook.
 */
export interface UseFormloomOptions {
  schema: FormloomSchema;
  onSubmit: (data: FormloomData) => void;
  onError?: (errors: Array<{ fieldId: string; message: string }>) => void;
  initialValues?: Partial<FormloomData>;
}
