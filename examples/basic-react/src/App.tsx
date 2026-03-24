import { useState } from "react";
import type { FormloomData } from "@formloom/react";
import { FormloomRenderer } from "./FormloomRenderer";
import { schemas } from "./mock-schemas";

type SchemaKey = keyof typeof schemas;

export default function App() {
  const [activeSchema, setActiveSchema] = useState<SchemaKey>("contact");
  const [submittedData, setSubmittedData] = useState<FormloomData | null>(null);

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", padding: "32px 24px", maxWidth: 640, margin: "0 auto" }}>
      <h1 style={{ fontSize: 24, marginBottom: 4 }}>Formloom Demo</h1>
      <p style={{ color: "#666", marginBottom: 24 }}>
        Select a schema below to see the headless renderer in action.
      </p>

      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        {(Object.keys(schemas) as SchemaKey[]).map((key) => (
          <button
            key={key}
            onClick={() => {
              setActiveSchema(key);
              setSubmittedData(null);
            }}
            style={{
              padding: "6px 16px",
              border: "1px solid #d1d5db",
              borderRadius: 6,
              cursor: "pointer",
              fontSize: 13,
              fontWeight: activeSchema === key ? 600 : 400,
              background: activeSchema === key ? "#2563eb" : "#fff",
              color: activeSchema === key ? "#fff" : "#111",
            }}
          >
            {key.charAt(0).toUpperCase() + key.slice(1)}
          </button>
        ))}
      </div>

      <div style={{ padding: 24, border: "1px solid #e5e7eb", borderRadius: 12, background: "#fafafa" }}>
        <FormloomRenderer
          key={activeSchema}
          schema={schemas[activeSchema]}
          onSubmit={(data) => setSubmittedData(data)}
        />
      </div>

      {submittedData && (
        <div style={{ marginTop: 24 }}>
          <h3 style={{ fontSize: 16, marginBottom: 8 }}>Submitted Data</h3>
          <pre
            style={{
              background: "#1e293b",
              color: "#e2e8f0",
              padding: 16,
              borderRadius: 8,
              fontSize: 13,
              overflow: "auto",
            }}
          >
            {JSON.stringify(submittedData, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
