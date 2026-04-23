import { useFormloomWizard } from "@formloom/react";
import type { FormloomSchema, FormloomData } from "@formloom/react";
import { FieldBody } from "./FormloomRenderer";

interface WizardRendererProps {
  schema: FormloomSchema;
  onSubmit: (data: FormloomData) => void | Promise<void>;
}

/**
 * Demonstrates useFormloomWizard — a minimal section-stepped renderer with
 * a progress strip, Back/Next buttons, and auto-validation on each step.
 * Falls through to handleSubmit on the final step.
 */
export function WizardRenderer({ schema, onSubmit }: WizardRendererProps) {
  const wizard = useFormloomWizard({ schema, onSubmit });

  return (
    <div style={{ maxWidth: 480 }}>
      {schema.title !== undefined && (
        <h2 style={{ margin: "0 0 4px" }}>{schema.title}</h2>
      )}
      {schema.description !== undefined && (
        <p style={{ margin: "0 0 20px", color: "#666" }}>{schema.description}</p>
      )}

      <ProgressStrip current={wizard.currentStepIndex} total={wizard.totalSteps} />

      <fieldset
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: 8,
          padding: 16,
          marginBottom: 16,
        }}
      >
        <legend style={{ padding: "0 6px", fontWeight: 600 }}>
          {wizard.currentStep.section.title ?? `Step ${wizard.currentStepIndex + 1}`}
        </legend>
        {wizard.currentStep.section.description !== undefined && (
          <p style={{ margin: "0 0 12px", color: "#6b7280", fontSize: 13 }}>
            {wizard.currentStep.section.description}
          </p>
        )}
        {wizard.currentStep.visibleFields.length === 0 ? (
          <p style={{ color: "#9ca3af", fontSize: 13, fontStyle: "italic" }}>
            Nothing to fill on this step — click next.
          </p>
        ) : (
          wizard.currentStep.visibleFields.map((fp) => (
            <FieldBody key={fp.field.id} {...fp} />
          ))
        )}
      </fieldset>

      <div style={{ display: "flex", gap: 8 }}>
        <button
          type="button"
          onClick={wizard.back}
          disabled={wizard.isFirstStep}
          style={btnStyle(false, wizard.isFirstStep)}
        >
          ← Back
        </button>
        {wizard.canSkip && !wizard.isLastStep && (
          <button
            type="button"
            onClick={wizard.skip}
            style={btnStyle(false, false)}
          >
            Skip step
          </button>
        )}
        {wizard.isLastStep ? (
          <button
            type="button"
            onClick={() => void wizard.handleSubmit()}
            disabled={wizard.isSubmitting || !wizard.canGoNext}
            style={btnStyle(true, wizard.isSubmitting || !wizard.canGoNext)}
          >
            {wizard.isSubmitting
              ? "Submitting…"
              : schema.submitLabel ?? "Submit"}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void wizard.next()}
            style={btnStyle(true, false)}
          >
            Next →
          </button>
        )}
      </div>
    </div>
  );
}

function ProgressStrip({ current, total }: { current: number; total: number }) {
  return (
    <div
      style={{
        display: "flex",
        gap: 4,
        marginBottom: 16,
      }}
    >
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          style={{
            flex: 1,
            height: 4,
            borderRadius: 2,
            background: i <= current ? "#2563eb" : "#e5e7eb",
            transition: "background 120ms",
          }}
          aria-label={`Step ${i + 1}`}
        />
      ))}
    </div>
  );
}

function btnStyle(primary: boolean, disabled: boolean): React.CSSProperties {
  return {
    padding: "8px 20px",
    border: primary ? "none" : "1px solid #d1d5db",
    borderRadius: 6,
    cursor: disabled ? "not-allowed" : "pointer",
    fontSize: 14,
    fontWeight: 500,
    background: disabled
      ? primary
        ? "#93c5fd"
        : "#f3f4f6"
      : primary
        ? "#2563eb"
        : "#fff",
    color: primary ? "#fff" : "#111",
    opacity: disabled && !primary ? 0.5 : 1,
  };
}
