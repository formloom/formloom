import { useMemo, useState } from "react";
import type { FormloomData, FormloomSchema } from "@formloom/schema";
import { formatSubmission } from "@formloom/llm";
import { FormloomRenderer } from "./FormloomRenderer";
import { schemaLibrary } from "./schema-library";
import { toolCallPath } from "./paths/tool-call-path";
import { responseFormatPath } from "./paths/response-format-path";
import { textPromptPath } from "./paths/text-prompt-path";

type SchemaKey = keyof typeof schemaLibrary;
type PathKey = "tool-call" | "response-format" | "text-prompt";

export default function App() {
  const [schemaKey, setSchemaKey] = useState<SchemaKey>("jobApplication");
  const [pathKey, setPathKey] = useState<PathKey>("tool-call");
  const [submitted, setSubmitted] = useState<FormloomData | null>(null);

  const baseSchema: FormloomSchema = schemaLibrary[schemaKey];

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

  const parsedSchema = simulated.result.success ? simulated.result.schema : null;

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

      <div style={{ fontSize: 13, color: "#64748b", marginBottom: 16 }}>
        Simulating: <strong>{simulated.label}</strong>
      </div>

      {parsedSchema === null ? (
        <ErrorPanel errors={simulated.result.errors} />
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
