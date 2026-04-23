import { useMemo, useState } from "react";
import type {
  FormloomCapabilities,
  FormloomData,
  FormloomSchema,
} from "@formloom/schema";
import { createFormloomCapabilities, formatSubmission } from "@formloom/llm";
import { FormloomRenderer } from "./FormloomRenderer";
import { schemaLibrary } from "./schema-library";
import { toolCallPath } from "./paths/tool-call-path";
import { responseFormatPath } from "./paths/response-format-path";
import { textPromptPath } from "./paths/text-prompt-path";

type SchemaKey = keyof typeof schemaLibrary;
type PathKey = "tool-call" | "response-format" | "text-prompt";
type CapabilityKey = "full" | "text-only" | "no-file-no-conditional";

const capabilityPresets: Record<CapabilityKey, FormloomCapabilities> = {
  full: {},
  "text-only": { fieldTypes: ["text"] },
  "no-file-no-conditional": {
    fieldTypes: ["text", "boolean", "radio", "select", "date", "number"],
    features: { showIf: false },
  },
};

export default function App() {
  const [schemaKey, setSchemaKey] = useState<SchemaKey>("jobApplication");
  const [pathKey, setPathKey] = useState<PathKey>("tool-call");
  const [capabilityKey, setCapabilityKey] = useState<CapabilityKey>("full");
  const [submitted, setSubmitted] = useState<FormloomData | null>(null);

  const baseSchema: FormloomSchema = schemaLibrary[schemaKey];

  const bundle = useMemo(
    () => createFormloomCapabilities(capabilityPresets[capabilityKey]),
    [capabilityKey],
  );

  const simulated = useMemo(() => {
    switch (pathKey) {
      case "tool-call":
        return toolCallPath(baseSchema);
      case "response-format":
        return responseFormatPath(baseSchema);
      case "text-prompt":
        return textPromptPath(baseSchema);
    }
  }, [baseSchema, pathKey]);

  // Re-parse the simulated LLM output through the bundle so the validator
  // enforces the active capability profile. When the schema violates caps
  // we fall through to the error panel below.
  const capabilityCheck = useMemo(() => {
    if (!simulated.result.success || simulated.result.schema === null) {
      return simulated.result;
    }
    return bundle.parse(simulated.result.schema);
  }, [bundle, simulated]);

  const parsedSchema = capabilityCheck.success ? capabilityCheck.schema : null;

  const submissionPreview = useMemo(() => {
    if (submitted === null) return null;
    return formatSubmission(submitted, {
      provider: "openai",
      toolCallId: "call_demo",
    });
  }, [submitted]);

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", padding: "32px 24px", maxWidth: 760, margin: "0 auto" }}>
      <h1 style={{ fontSize: 24, marginBottom: 4 }}>Formloom - Provider-Free Demo</h1>
      <p style={{ color: "#666", marginBottom: 20 }}>
        Simulates three LLM integration paths offline: tool call, response_format, and text-prompt fallback.
      </p>

      <PickerRow
        label="Schema"
        options={Object.keys(schemaLibrary) as SchemaKey[]}
        value={schemaKey}
        onChange={(v) => {
          setSchemaKey(v as SchemaKey);
          setSubmitted(null);
        }}
      />

      <PickerRow
        label="Path"
        options={["tool-call", "response-format", "text-prompt"]}
        value={pathKey}
        onChange={(v) => {
          setPathKey(v as PathKey);
          setSubmitted(null);
        }}
      />

      <PickerRow
        label="Caps"
        options={["full", "text-only", "no-file-no-conditional"]}
        value={capabilityKey}
        onChange={(v) => {
          setCapabilityKey(v as CapabilityKey);
          setSubmitted(null);
        }}
      />

      <div style={{ fontSize: 13, color: "#64748b", marginBottom: 8 }}>
        Simulating: <strong>{simulated.label}</strong>
      </div>

      <CapabilitiesSummary
        caps={capabilityPresets[capabilityKey]}
        promptLength={bundle.systemPrompt.length}
      />

      {parsedSchema === null ? (
        <ErrorPanel errors={capabilityCheck.errors.length > 0 ? capabilityCheck.errors : simulated.result.errors} />
      ) : (
        <div style={{ padding: 24, border: "1px solid #e5e7eb", borderRadius: 12, background: "#fafafa" }}>
          <FormloomRenderer
            key={`${schemaKey}:${pathKey}`}
            schema={parsedSchema}
            onSubmit={(data) => setSubmitted(data)}
          />
        </div>
      )}

      {submitted !== null && (
        <section style={{ marginTop: 24 }}>
          <h3 style={{ fontSize: 16, marginBottom: 8 }}>Submitted FormloomData</h3>
          <Code value={JSON.stringify(submitted, null, 2)} />

          <h3 style={{ fontSize: 16, margin: "20px 0 8px" }}>
            formatSubmission output (provider: "openai")
          </h3>
          <Code value={JSON.stringify(submissionPreview, null, 2)} />
        </section>
      )}
    </div>
  );
}

function PickerRow({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
      <span style={{ fontSize: 13, color: "#475569", width: 60 }}>{label}</span>
      {options.map((opt) => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          style={{
            padding: "6px 14px",
            border: "1px solid #d1d5db",
            borderRadius: 6,
            cursor: "pointer",
            fontSize: 13,
            fontWeight: value === opt ? 600 : 400,
            background: value === opt ? "#2563eb" : "#fff",
            color: value === opt ? "#fff" : "#111",
          }}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

function ErrorPanel({ errors }: { errors: string[] }) {
  return (
    <div
      style={{
        padding: 16,
        border: "1px solid #fca5a5",
        background: "#fef2f2",
        borderRadius: 8,
        color: "#7f1d1d",
      }}
    >
      <strong>parseFormloomResponse failed:</strong>
      <ul style={{ margin: "8px 0 0 20px" }}>
        {errors.map((e, i) => (
          <li key={i} style={{ fontFamily: "monospace", fontSize: 12 }}>
            {e}
          </li>
        ))}
      </ul>
    </div>
  );
}

function CapabilitiesSummary({
  caps,
  promptLength,
}: {
  caps: FormloomCapabilities;
  promptLength: number;
}) {
  const descriptors: string[] = [];
  if (caps.fieldTypes !== undefined) {
    descriptors.push(`fieldTypes: ${caps.fieldTypes.join(", ")}`);
  }
  if (caps.features !== undefined) {
    const off = Object.entries(caps.features)
      .filter(([, v]) => v === false)
      .map(([k]) => k);
    if (off.length > 0) descriptors.push(`features off: ${off.join(", ")}`);
  }
  if (caps.variants === false) descriptors.push("variants: forbidden");
  else if (Array.isArray(caps.variants))
    descriptors.push(`variants: ${caps.variants.join(", ")}`);

  const summary = descriptors.length === 0 ? "full (no restrictions)" : descriptors.join(" · ");

  return (
    <div
      style={{
        fontSize: 12,
        color: "#475569",
        marginBottom: 16,
        padding: "8px 12px",
        background: "#f1f5f9",
        borderRadius: 6,
      }}
    >
      <strong>Active capabilities:</strong> {summary}
      <span style={{ marginLeft: 12, color: "#64748b" }}>
        prompt: {promptLength.toLocaleString()} chars
      </span>
    </div>
  );
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
