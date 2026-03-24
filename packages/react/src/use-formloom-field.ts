import type { UseFormloomReturn, FieldProps } from "./types";

/**
 * Convenience hook to get props for a specific field by id.
 *
 * Usage:
 *   const form = useFormloom({ schema, onSubmit });
 *   const nameField = useFormloomField(form, "full_name");
 */
export function useFormloomField(
  form: UseFormloomReturn,
  fieldId: string,
): FieldProps | null {
  return form.getField(fieldId) ?? null;
}
