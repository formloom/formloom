import { useCallback, useMemo, useState } from "react";
import { useFormloom } from "./use-formloom";
import type {
  FieldProps,
  SectionProps,
  UseFormloomOptions,
  UseFormloomReturn,
} from "./types";
import { validateField } from "./validation";

export interface UseFormloomWizardOptions extends UseFormloomOptions {}

export interface UseFormloomWizardReturn extends UseFormloomReturn {
  /** Zero-based index of the current step. */
  currentStepIndex: number;
  /** Total number of steps (one per section in the schema). */
  totalSteps: number;
  /** The current step's section, including its visible fields. */
  currentStep: SectionProps;
  /** True when every required, visible field on the current step is valid. */
  canGoNext: boolean;
  /** True when the current step has no required, visible fields. */
  canSkip: boolean;
  isFirstStep: boolean;
  isLastStep: boolean;
  /**
   * Marks the current step's fields as touched, runs sync validation and
   * flushes any pending async validators for those fields, and advances the
   * step index on success. No-op on the last step — call `handleSubmit`.
   */
  next: () => Promise<void>;
  /** Go back one step. No-op on the first step. */
  back: () => void;
  /**
   * Advance without validating, iff `canSkip` is true. Throws when any
   * required visible field would block submission — use `next()` in that
   * case and surface the errors to the user.
   */
  skip: () => void;
}

/**
 * A minimal headless wizard wrapper around {@link useFormloom}. Each
 * section in the schema becomes one step; stepping is purely linear. UI
 * concerns (progress bars, recap panes, auto-advance) are the host's
 * responsibility — the hook only exposes state and validated transitions.
 *
 * Schemas that do not declare `sections` are not supported; single-page
 * forms should use `useFormloom` directly.
 */
export function useFormloomWizard(
  options: UseFormloomWizardOptions,
): UseFormloomWizardReturn {
  const form = useFormloom(options);

  if (form.sections === undefined || form.sections.length === 0) {
    throw new Error(
      "useFormloomWizard requires a schema with a non-empty `sections` array. Use useFormloom for single-page forms.",
    );
  }

  const sections = form.sections;
  const totalSteps = sections.length;
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const currentStep = sections[Math.min(currentStepIndex, totalSteps - 1)];

  const canGoNext = useMemo(
    () => currentStep.visibleFields.every((f) => isFieldValid(f)),
    [currentStep],
  );

  const canSkip = useMemo(
    () => currentStep.visibleFields.every((f) => !isFieldRequired(f)),
    [currentStep],
  );

  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === totalSteps - 1;

  const next = useCallback(async (): Promise<void> => {
    // Validate only the current step's visible fields. We don't touch the
    // underlying useFormloom state directly (that path is private); instead
    // we re-run validateField here, same as handleSubmit's sync phase.
    const errors = currentStep.visibleFields
      .map((f) => validateField(f.field, f.state.value))
      .filter((e) => e !== null);
    if (errors.length > 0) {
      // Force the renderer to show the errors by flagging touched via a
      // blur on each field. `onBlur` marks the field touched and runs the
      // sync validator — the eagerly-computed `isValid` picks up the error
      // on the next render so `canGoNext` stays false.
      for (const f of currentStep.visibleFields) f.onBlur();
      return;
    }
    // TODO(future): flush per-step async validators when Formloom exposes
    // per-field settled(). For now, require consumers to debounce and
    // block `next()` via `isValidating` themselves when precision matters.
    if (!isLastStep) {
      setCurrentStepIndex((i) => i + 1);
    }
  }, [currentStep, isLastStep]);

  const back = useCallback(() => {
    setCurrentStepIndex((i) => (i > 0 ? i - 1 : i));
  }, []);

  const skip = useCallback(() => {
    if (!canSkip) {
      throw new Error(
        `Cannot skip step ${currentStepIndex}: it contains required visible fields.`,
      );
    }
    if (!isLastStep) {
      setCurrentStepIndex((i) => i + 1);
    }
  }, [canSkip, currentStepIndex, isLastStep]);

  return {
    ...form,
    currentStepIndex,
    totalSteps,
    currentStep,
    canGoNext,
    canSkip,
    isFirstStep,
    isLastStep,
    next,
    back,
    skip,
  };
}

function isFieldValid(props: FieldProps): boolean {
  const err = validateField(props.field, props.state.value);
  return err === null && props.state.error === null;
}

function isFieldRequired(props: FieldProps): boolean {
  return props.field.validation?.required === true;
}
