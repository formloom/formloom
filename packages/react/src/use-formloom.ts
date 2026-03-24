import { useState, useCallback, useMemo } from "react";
import type { FormloomData, FormField } from "@formloom/schema";
import type {
  UseFormloomReturn,
  UseFormloomOptions,
  FieldProps,
} from "./types";

export function useFormloom(options: UseFormloomOptions): UseFormloomReturn {
  const { schema, onSubmit, onError, initialValues } = options;

  const defaultValues = useMemo(() => {
    const defaults: FormloomData = {};
    for (const field of schema.fields) {
      const override = initialValues?.[field.id];
      if (override !== undefined) {
        defaults[field.id] = override;
      } else if ("defaultValue" in field && field.defaultValue !== undefined) {
        defaults[field.id] = field.defaultValue as string | boolean | string[];
      } else {
        defaults[field.id] = getEmptyValue(field);
      }
    }
    return defaults;
  }, [schema, initialValues]);

  const [values, setValues] = useState<FormloomData>(() => ({
    ...defaultValues,
  }));
  const [touched, setTouched] = useState<Record<string, boolean>>(() => ({}));
  const [errors, setErrors] = useState<Record<string, string | null>>(
    () => ({}),
  );

  const validateField = useCallback(
    (field: FormField, value: unknown): string | null => {
      const v = field.validation;

      if (v?.required) {
        if (value === null || value === undefined || value === "") {
          return `${field.label} is required`;
        }
        if (Array.isArray(value) && value.length === 0) {
          return `${field.label} is required`;
        }
      }

      if (v?.pattern && typeof value === "string" && value !== "") {
        try {
          const regex = new RegExp(v.pattern);
          if (!regex.test(value)) {
            return v.patternMessage || `${field.label} format is invalid`;
          }
        } catch {
          // Invalid regex in schema - skip
        }
      }

      return null;
    },
    [],
  );

  const validateAll = useCallback((): Record<string, string | null> => {
    const newErrors: Record<string, string | null> = {};
    for (const field of schema.fields) {
      newErrors[field.id] = validateField(field, values[field.id]);
    }
    return newErrors;
  }, [schema, values, validateField]);

  const handleChange = useCallback(
    (fieldId: string, value: string | boolean | string[] | null) => {
      setValues((prev) => ({ ...prev, [fieldId]: value }));

      // Re-validate if already touched
      setTouched((currentTouched) => {
        if (currentTouched[fieldId]) {
          const field = schema.fields.find((f) => f.id === fieldId);
          if (field) {
            setErrors((prev) => ({
              ...prev,
              [fieldId]: validateField(field, value),
            }));
          }
        }
        return currentTouched;
      });
    },
    [schema, validateField],
  );

  const handleBlur = useCallback(
    (fieldId: string) => {
      setTouched((prev) => ({ ...prev, [fieldId]: true }));

      const field = schema.fields.find((f) => f.id === fieldId);
      if (field) {
        setValues((currentValues) => {
          setErrors((prev) => ({
            ...prev,
            [fieldId]: validateField(field, currentValues[fieldId]),
          }));
          return currentValues;
        });
      }
    },
    [schema, validateField],
  );

  const fields: FieldProps[] = useMemo(
    () =>
      schema.fields.map((field) => ({
        field,
        state: {
          value: values[field.id] ?? null,
          error: errors[field.id] ?? null,
          touched: touched[field.id] ?? false,
          isValid: !errors[field.id],
        },
        onChange: (value: string | boolean | string[] | null) =>
          handleChange(field.id, value),
        onBlur: () => handleBlur(field.id),
      })),
    [schema, values, errors, touched, handleChange, handleBlur],
  );

  const getField = useCallback(
    (id: string): FieldProps | undefined =>
      fields.find((f) => f.field.id === id),
    [fields],
  );

  const handleSubmit = useCallback(() => {
    const allTouched: Record<string, boolean> = {};
    for (const field of schema.fields) {
      allTouched[field.id] = true;
    }
    setTouched(allTouched);

    const allErrors = validateAll();
    setErrors(allErrors);

    const errorList: Array<{ fieldId: string; message: string }> = [];
    for (const [fieldId, msg] of Object.entries(allErrors)) {
      if (msg !== null) {
        errorList.push({ fieldId, message: msg });
      }
    }

    if (errorList.length > 0) {
      onError?.(errorList);
      return;
    }

    onSubmit(values);
  }, [schema, values, validateAll, onSubmit, onError]);

  const reset = useCallback(() => {
    setValues({ ...defaultValues });
    setTouched({});
    setErrors({});
  }, [defaultValues]);

  const currentErrors: Array<{ fieldId: string; message: string }> = [];
  for (const [fieldId, msg] of Object.entries(errors)) {
    if (msg !== null) {
      currentErrors.push({ fieldId, message: msg });
    }
  }

  const isValid = currentErrors.length === 0;
  const isDirty = Object.values(touched).some(Boolean);

  return {
    schema,
    fields,
    getField,
    data: values,
    isValid,
    isDirty,
    handleSubmit,
    reset,
    errors: currentErrors,
  };
}

function getEmptyValue(
  field: FormField,
): string | boolean | string[] | null {
  switch (field.type) {
    case "boolean":
      return false;
    case "select":
      return field.multiple ? [] : null;
    default:
      return null;
  }
}
