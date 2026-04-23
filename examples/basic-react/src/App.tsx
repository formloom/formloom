import { useMemo, useState } from "react";
import type {
  AsyncValidator,
  FormloomData,
  FormloomFieldValue,
} from "@formloom/react";
import { FormloomRenderer } from "./FormloomRenderer";
import { WizardRenderer } from "./WizardRenderer";
import { schemas } from "./mock-schemas";

type SchemaKey = keyof typeof schemas;

// Mock "username registry" used by the asyncValidation schema to demonstrate
// async validators without a real API. `alice` and `bob` are taken.
const TAKEN_USERNAMES = new Set(["alice", "bob"]);

const usernameValidator: AsyncValidator = {
  mode: "onChange",
  debounceMs: 400,
  async validate(value) {
    if (typeof value !== "string" || value === "") return null;
    // Simulate network latency so the "Checking…" indicator is visible.
    await new Promise((resolve) => setTimeout(resolve, 450));
    return TAKEN_USERNAMES.has(value.toLowerCase())
      ? `"${value}" is already taken`
      : null;
  },
};

export default function App() {
  const [activeSchema, setActiveSchema] = useState<SchemaKey>("contact");
  const [wizardMode, setWizardMode] = useState(false);
  const [submittedData, setSubmittedData] = useState<FormloomData | null>(null);
  const [liveState, setLiveState] = useState<FormloomData>({});

  const schema = schemas[activeSchema];
  const supportsWizard = schema.sections !== undefined && schema.sections.length > 0;
  const useWizard = wizardMode && supportsWizard;

  const validators = useMemo(
    () =>
      activeSchema === "asyncValidation"
        ? { username: usernameValidator }
        : undefined,
    [activeSchema],
  );

  const handleValueChange = (
    fieldId: string,
    _value: FormloomFieldValue,
    data: FormloomData,
  ): void => {
    setLiveState(data);
  };

  return (
    <div
      style={{
        fontFamily: "system-ui, sans-serif",
        padding: "32px 24px",
        maxWidth: 720,
        margin: "0 auto",
      }}
    >
      <h1 style={{ fontSize: 24, marginBottom: 4 }}>Formloom Demo</h1>
      <p style={{ color: "#666", marginBottom: 20 }}>
        Headless rendering across every schema + hook feature in Formloom.
      </p>

      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        {(Object.keys(schemas) as SchemaKey[]).map((key) => (
          <button
            key={key}
            onClick={() => {
              setActiveSchema(key);
              setSubmittedData(null);
              setLiveState({});
            }}
            style={{
              padding: "6px 14px",
              border: "1px solid #d1d5db",
              borderRadius: 6,
              cursor: "pointer",
              fontSize: 13,
              fontWeight: activeSchema === key ? 600 : 400,
              background: activeSchema === key ? "#2563eb" : "#fff",
              color: activeSchema === key ? "#fff" : "#111",
            }}
          >
            {labelFor(key)}
          </button>
        ))}
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 20,
          fontSize: 12,
          color: "#475569",
        }}
      >
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            cursor: supportsWizard ? "pointer" : "not-allowed",
            opacity: supportsWizard ? 1 : 0.5,
          }}
        >
          <input
            type="checkbox"
            checked={useWizard}
            disabled={!supportsWizard}
            onChange={(e) => setWizardMode(e.target.checked)}
          />
          Wizard mode
        </label>
        {!supportsWizard && <span>(requires a schema with sections)</span>}
      </div>

      <div
        style={{
          padding: 24,
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          background: "#fafafa",
        }}
      >
        {useWizard ? (
          <WizardRenderer
            key={`${activeSchema}:wizard`}
            schema={schema}
            onSubmit={(data) => setSubmittedData(data)}
          />
        ) : (
          <FormloomRenderer
            key={`${activeSchema}:flat`}
            schema={schema}
            onSubmit={(data) => setSubmittedData(data)}
            onValueChange={handleValueChange}
            validators={validators}
          />
        )}
      </div>

      {!useWizard && Object.keys(liveState).length > 0 && (
        <section style={{ marginTop: 16 }}>
          <h3 style={{ fontSize: 14, marginBottom: 6, color: "#475569" }}>
            Live form state (from onValueChange)
          </h3>
          <Code value={JSON.stringify(liveState, null, 2)} />
        </section>
      )}

      {submittedData && (
        <section style={{ marginTop: 24 }}>
          <h3 style={{ fontSize: 16, marginBottom: 8 }}>Submitted Data</h3>
          <Code value={JSON.stringify(submittedData, null, 2)} />
        </section>
      )}
    </div>
  );
}

function labelFor(key: SchemaKey): string {
  switch (key) {
    case "contact":
      return "Contact";
    case "feedback":
      return "Feedback";
    case "booking":
      return "Booking";
    case "jobApplication":
      return "Job App";
    case "onboardingWizard":
      return "Onboarding";
    case "hintsShowcase":
      return "Hints tour";
    case "asyncValidation":
      return "Async";
    case "reviewMode":
      return "Review";
  }
}

function Code({ value }: { value: string }) {
  return (
    <pre
      style={{
        background: "#1e293b",
        color: "#e2e8f0",
        padding: 16,
        borderRadius: 8,
        fontSize: 12,
        overflow: "auto",
        margin: 0,
      }}
    >
      {value}
    </pre>
  );
}
