import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  FormField,
  FormloomData,
  FormloomFieldValue,
} from "@formloom/schema";
import { evaluateShowIf } from "@formloom/schema";
import type {
  FieldProps,
  SectionProps,
  UseFormloomOptions,
  UseFormloomReturn,
} from "./types";
import { validateField } from "./validation";
import {
  AsyncValidatorRunner,
  resolveValidatorConfig,
} from "./async-validators";

export function useFormloom(options: UseFormloomOptions): UseFormloomReturn {
  const { schema, onSubmit, onError } = options;

  // Mount-only captures — passing new references across renders must not reset state.
  const initialValuesRef = useRef(options.initialValues);
  const validatorsRef = useRef(options.validators);

  const defaultValues = useMemo(() => {
    const defaults: FormloomData = {};
    for (const field of schema.fields) {
      const override = initialValuesRef.current?.[field.id];
      if (override !== undefined) {
        defaults[field.id] = override;
      } else if ("defaultValue" in field && field.defaultValue !== undefined) {
        defaults[field.id] = field.defaultValue as FormloomFieldValue;
      } else {
        defaults[field.id] = getEmptyValue(field);
      }
    }
    return defaults;
  }, [schema]);

  const [values, setValues] = useState<FormloomData>(() => ({ ...defaultValues }));
  const [touched, setTouched] = useState<Record<string, boolean>>(() => ({}));
  const [errors, setErrors] = useState<Record<string, string | null>>(() => ({}));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validating, setValidating] = useState<Record<string, boolean>>(() => ({}));

  // Authoritative error map — kept in sync with the `errors` state and
  // mutated directly by async-validator callbacks so `handleSubmit` can read
  // the settled set without racing React's render commit.
  const errorsRef = useRef<Record<string, string | null>>({});

  // Visibility derived from showIf.
  const visibility = useMemo<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {};
    for (const field of schema.fields) {
      map[field.id] = evaluateShowIf(field.showIf, values);
    }
    return map;
  }, [schema.fields, values]);

  const writeError = useCallback(
    (fieldId: string, error: string | null): void => {
      errorsRef.current = { ...errorsRef.current, [fieldId]: error };
      setErrors(errorsRef.current);
    },
    [],
  );

  const writeErrors = useCallback(
    (patch: Record<string, string | null>): void => {
      errorsRef.current = { ...errorsRef.current, ...patch };
      setErrors(errorsRef.current);
    },
    [],
  );

  // ---- Async validator runner ----
  const runnerRef = useRef<AsyncValidatorRunner | null>(null);
  if (runnerRef.current === null) {
    runnerRef.current = new AsyncValidatorRunner({
      onStart: (fieldId) =>
        setValidating((prev) =>
          prev[fieldId] === true ? prev : { ...prev, [fieldId]: true },
        ),
      onComplete: (fieldId, error) => {
        setValidating((prev) => {
          if (prev[fieldId] !== true) return prev;
          const next = { ...prev };
          delete next[fieldId];
          return next;
        });
        writeError(fieldId, error);
      },
      onAbort: (fieldId) =>
        setValidating((prev) => {
          if (prev[fieldId] !== true) return prev;
          const next = { ...prev };
          delete next[fieldId];
          return next;
        }),
    });
  }
  useEffect(() => {
    const runner = runnerRef.current;
    return () => {
      runner?.dispose();
    };
  }, []);

  const scheduleAsync = useCallback(
    (
      fieldId: string,
      value: FormloomFieldValue,
      allData: FormloomData,
      mode: "onBlur" | "onChange" | "onSubmit",
    ) => {
      const spec = validatorsRef.current?.[fieldId];
      if (spec === undefined || runnerRef.current === null) return;
      runnerRef.current.schedule(
        fieldId,
        value,
        allData,
        resolveValidatorConfig(spec),
        mode,
      );
    },
    [],
  );

  // ---- Eager isValid: sync-only, visibility-aware ----
  const isValid = useMemo(() => {
    for (const field of schema.fields) {
      if (visibility[field.id] !== true) continue;
      if (validateField(field, values[field.id] ?? null) !== null) return false;
      if (errors[field.id] != null) return false;
    }
    return true;
  }, [schema.fields, values, visibility, errors]);

  // ---- Handlers ----

  const handleChange = useCallback(
    (fieldId: string, value: FormloomFieldValue) => {
      setValues((prev) => {
        const next = { ...prev, [fieldId]: value };
        setTouched((currentTouched) => {
          if (currentTouched[fieldId] === true) {
            const field = schema.fields.find((f) => f.id === fieldId);
            if (field !== undefined) {
              writeError(fieldId, validateField(field, value));
            }
          }
          return currentTouched;
        });
        scheduleAsync(fieldId, value, next, "onChange");
        return next;
      });
    },
    [schema, scheduleAsync, writeError],
  );

  const handleBlur = useCallback(
    (fieldId: string) => {
      setTouched((prev) => ({ ...prev, [fieldId]: true }));
      const field = schema.fields.find((f) => f.id === fieldId);
      if (field === undefined) return;
      setValues((currentValues) => {
        const value = currentValues[fieldId] ?? null;
        writeError(fieldId, validateField(field, value));
        scheduleAsync(fieldId, value, currentValues, "onBlur");
        return currentValues;
      });
    },
    [schema, scheduleAsync, writeError],
  );

  // ---- Field props ----

  const fields: FieldProps[] = useMemo(
    () =>
      schema.fields.map<FieldProps>((field) => {
        const visible = visibility[field.id] !== false;
        const syncError = visible ? errors[field.id] ?? null : null;
        return {
          field,
          state: {
            value: values[field.id] ?? null,
            error: syncError,
            touched: touched[field.id] ?? false,
            isValid: syncError === null,
            isValidating: validating[field.id] === true,
          },
          onChange: (value: FormloomFieldValue) =>
            handleChange(field.id, value),
          onBlur: () => handleBlur(field.id),
          visible,
        };
      }),
    [schema, values, errors, touched, validating, visibility, handleChange, handleBlur],
  );

  const visibleFields = useMemo(
    () => fields.filter((f) => f.visible),
    [fields],
  );

  const sections = useMemo<SectionProps[] | undefined>(() => {
    if (schema.sections === undefined) return undefined;
    const byId = new Map<string, FieldProps>();
    for (const f of fields) byId.set(f.field.id, f);
    return schema.sections.map<SectionProps>((section) => {
      const groupedFields: FieldProps[] = [];
      for (const fid of section.fieldIds) {
        const fp = byId.get(fid);
        if (fp !== undefined) groupedFields.push(fp);
      }
      const groupedVisible = groupedFields.filter((f) => f.visible);
      return {
        section,
        fields: groupedFields,
        visibleFields: groupedVisible,
        visible: groupedVisible.length > 0,
      };
    });
  }, [schema.sections, fields]);

  const getField = useCallback(
    (id: string): FieldProps | undefined =>
      fields.find((f) => f.field.id === id),
    [fields],
  );

  // ---- Submit ----

  const handleSubmit = useCallback(async (): Promise<void> => {
    // Only mark visible fields as touched — invisible fields may become
    // visible later, and marking them now would immediately show errors on
    // stale values as soon as they appear.
    const allTouched: Record<string, boolean> = {};
    for (const field of schema.fields) {
      if (visibility[field.id] === true) allTouched[field.id] = true;
    }
    setTouched(allTouched);

    const syncErrors: Record<string, string | null> = {};
    for (const field of schema.fields) {
      if (visibility[field.id] !== true) {
        syncErrors[field.id] = null;
        continue;
      }
      syncErrors[field.id] = validateField(field, values[field.id] ?? null);
    }
    writeErrors(syncErrors);

    const syncErrorList = collectErrors(syncErrors);
    if (syncErrorList.length > 0) {
      onError?.(syncErrorList);
      return;
    }

    // Commit isSubmitting before any await so consumers observing it
    // immediately after calling handleSubmit see the pending state.
    setIsSubmitting(true);
    try {
      // Fire onSubmit-mode validators, then wait for every pending async validator.
      // Only await when there is actual work — an unconditional await would add a
      // microtask boundary that delays onSubmit even when no validators are registered.
      for (const field of schema.fields) {
        if (visibility[field.id] !== true) continue;
        scheduleAsync(field.id, values[field.id] ?? null, values, "onSubmit");
      }
      if (runnerRef.current?.isBusy() === true) {
        await runnerRef.current.settled();
      }

      // Async callbacks have written the latest errors into errorsRef.
      const combined = { ...syncErrors };
      for (const [fid, msg] of Object.entries(errorsRef.current)) {
        if (visibility[fid] !== true) continue;
        combined[fid] = msg ?? null;
      }

      const combinedErrorList = collectErrors(combined);
      if (combinedErrorList.length > 0) {
        onError?.(combinedErrorList);
        return;
      }

      const visibleData = buildSubmittedData(values, visibility);
      await onSubmit(visibleData);
    } finally {
      setIsSubmitting(false);
    }
  }, [schema, values, visibility, onSubmit, onError, scheduleAsync, writeErrors]);

  const reset = useCallback(() => {
    setValues({ ...defaultValues });
    setTouched({});
    errorsRef.current = {};
    setErrors({});
    setValidating({});
    runnerRef.current?.dispose();
  }, [defaultValues]);

  const currentErrors = useMemo(() => {
    const list: Array<{ fieldId: string; message: string }> = [];
    for (const [fid, msg] of Object.entries(errors)) {
      if (visibility[fid] !== true) continue;
      if (msg !== null && msg !== undefined) {
        list.push({ fieldId: fid, message: msg });
      }
    }
    return list;
  }, [errors, visibility]);

  const isDirty = useMemo(
    () => Object.values(touched).some(Boolean),
    [touched],
  );

  const isValidating = useMemo(
    () => Object.values(validating).some(Boolean),
    [validating],
  );

  return {
    schema,
    fields,
    visibleFields,
    sections,
    getField,
    data: buildSubmittedData(values, visibility),
    isValid,
    isDirty,
    isSubmitting,
    isValidating,
    handleSubmit,
    reset,
    errors: currentErrors,
  };
}

// ---- Helpers ----

function collectErrors(
  errorMap: Record<string, string | null>,
): Array<{ fieldId: string; message: string }> {
  const list: Array<{ fieldId: string; message: string }> = [];
  for (const [fid, msg] of Object.entries(errorMap)) {
    if (msg !== null && msg !== undefined) {
      list.push({ fieldId: fid, message: msg });
    }
  }
  return list;
}

function buildSubmittedData(
  values: FormloomData,
  visibility: Record<string, boolean>,
): FormloomData {
  const out: FormloomData = {};
  for (const [fid, val] of Object.entries(values)) {
    if (visibility[fid] === true) out[fid] = val;
  }
  return out;
}

function getEmptyValue(field: FormField): FormloomFieldValue {
  switch (field.type) {
    case "boolean":
      return false;
    case "select":
      return field.multiple === true ? [] : null;
    case "file":
      return field.multiple === true ? [] : null;
    case "number":
      return null;
    default:
      return null;
  }
}
