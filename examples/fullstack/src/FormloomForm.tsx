import { useFormloom } from "@formloom/react";
import type { FormloomSchema, FormloomData, FieldProps } from "@formloom/react";

interface Props {
  schema: FormloomSchema;
  onSubmit: (data: FormloomData) => void;
}

export function FormloomForm({ schema, onSubmit }: Props) {
  const form = useFormloom({ schema, onSubmit });

  return (
    <div>
      {schema.title && (
        <h3 style={{ margin: "0 0 4px", fontSize: 16 }}>{schema.title}</h3>
      )}

      {form.fields.map((fp) => (
        <Field key={fp.field.id} {...fp} />
      ))}

      <button
        type="button"
        onClick={form.handleSubmit}
        style={{
          marginTop: 12,
          padding: "8px 20px",
          background: "#2563eb",
          color: "#fff",
          border: "none",
          borderRadius: 6,
          cursor: "pointer",
          fontSize: 13,
          fontWeight: 500,
        }}
      >
        {schema.submitLabel || "Submit"}
      </button>
    </div>
  );
}

function Field({ field, state, onChange, onBlur }: FieldProps) {
  const hasError = state.touched && state.error;

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "6px 10px",
    border: `1px solid ${hasError ? "#ef4444" : "#d1d5db"}`,
    borderRadius: 6,
    fontSize: 13,
    boxSizing: "border-box",
  };

  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 3 }}>
        {field.label}
        {field.validation?.required && (
          <span style={{ color: "#ef4444", marginLeft: 2 }}>*</span>
        )}
      </label>

      {field.description && (
        <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 4 }}>
          {field.description}
        </div>
      )}

      {field.type === "text" && (
        <input
          type="text"
          style={inputStyle}
          placeholder={field.placeholder}
          value={(state.value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
        />
      )}

      {field.type === "date" && (
        <input
          type="date"
          style={inputStyle}
          value={(state.value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
        />
      )}

      {field.type === "boolean" && (
        <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={(state.value as boolean) ?? false}
            onChange={(e) => onChange(e.target.checked)}
            onBlur={onBlur}
          />
          <span style={{ fontSize: 13 }}>{field.label}</span>
        </label>
      )}

      {field.type === "radio" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {field.options.map((opt) => (
            <label key={opt.value} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
              <input
                type="radio"
                name={field.id}
                value={opt.value}
                checked={state.value === opt.value}
                onChange={() => onChange(opt.value)}
                onBlur={onBlur}
              />
              <span style={{ fontSize: 13 }}>{opt.label}</span>
            </label>
          ))}
        </div>
      )}

      {field.type === "select" && !field.multiple && (
        <select
          style={inputStyle}
          value={(state.value as string) ?? ""}
          onChange={(e) => onChange(e.target.value || null)}
          onBlur={onBlur}
        >
          <option value="">{field.placeholder || "Select..."}</option>
          {field.options.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      )}

      {field.type === "select" && field.multiple && (
        <select
          style={{ ...inputStyle, minHeight: 72 }}
          multiple
          value={(state.value as string[]) ?? []}
          onChange={(e) => {
            const selected = Array.from(e.target.selectedOptions, (o) => o.value);
            onChange(selected);
          }}
          onBlur={onBlur}
        >
          {field.options.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      )}

      {hasError && (
        <div style={{ color: "#ef4444", fontSize: 11, marginTop: 2 }}>
          {state.error}
        </div>
      )}
    </div>
  );
}
