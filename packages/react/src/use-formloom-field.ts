import { useMemo } from "react";
import type { UseFormloomReturn, FieldProps } from "./types";

/**
 * Returns the FieldProps for a single field by id.
 * Re-renders only when the field's own state changes.
 *
 * Usage:
 *   const form = useFormloom({ schema, onSubmit });
 *   const nameField = useFormloomField(form, "full_name");
 *   if (!nameField) return null;
 */
export function useFormloomField(
  form: UseFormloomReturn,
  fieldId: string,
): FieldProps | null {
  return useMemo(
    () => form.fields.find((f) => f.field.id === fieldId) ?? null,
    [form.fields, fieldId],
  );
}
