import { useFormloom } from "@formloom/react";
import type { FormloomSchema, FormloomData, FieldProps } from "@formloom/react";

interface FormloomRendererProps {
  schema: FormloomSchema;
  onSubmit: (data: FormloomData) => void;
}

export function FormloomRenderer({ schema, onSubmit }: FormloomRendererProps) {
  const form = useFormloom({
    schema,
    onSubmit,
    onError: (errors) => {
      console.log("Validation errors:", errors);
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        form.handleSubmit();
      }}
      style={{ maxWidth: 480 }}
    >
      {schema.title && <h2 style={{ margin: "0 0 4px" }}>{schema.title}</h2>}
      {schema.description && (
        <p style={{ margin: "0 0 20px", color: "#666" }}>
          {schema.description}
        </p>
      )}

      {form.fields.map((fieldProps) => (
        <FieldRenderer key={fieldProps.field.id} {...fieldProps} />
      ))}

      <button
        type="submit"
        style={{
          marginTop: 16,
          padding: "10px 24px",
          background: "#2563eb",
          color: "#fff",
          border: "none",
          borderRadius: 6,
          cursor: "pointer",
          fontSize: 14,
          fontWeight: 500,
        }}
      >
        {schema.submitLabel || "Submit"}
      </button>

      {form.isDirty && (
        <button
          type="button"
          onClick={form.reset}
          style={{
            marginTop: 16,
            marginLeft: 8,
            padding: "10px 24px",
            background: "transparent",
            border: "1px solid #d1d5db",
            borderRadius: 6,
            cursor: "pointer",
            fontSize: 14,
          }}
        >
          Reset
        </button>
      )}
    </form>
  );
}

function FieldRenderer(props: FieldProps) {
  const { field, state, onChange, onBlur } = props;
  const hasError = state.touched && state.error;

  const wrapperStyle: React.CSSProperties = {
    marginBottom: 16,
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    marginBottom: 4,
    fontWeight: 500,
    fontSize: 14,
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "8px 12px",
    border: `1px solid ${hasError ? "#ef4444" : "#d1d5db"}`,
    borderRadius: 6,
    fontSize: 14,
    boxSizing: "border-box",
  };

  const errorStyle: React.CSSProperties = {
    color: "#ef4444",
    fontSize: 12,
    marginTop: 4,
  };

  const descStyle: React.CSSProperties = {
    color: "#6b7280",
    fontSize: 12,
    marginTop: 2,
    marginBottom: 4,
  };

  return (
    <div style={wrapperStyle}>
      <label style={labelStyle}>
        {field.label}
        {field.validation?.required && (
          <span style={{ color: "#ef4444", marginLeft: 2 }}>*</span>
        )}
      </label>

      {field.description && <div style={descStyle}>{field.description}</div>}

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
        <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={(state.value as boolean) ?? false}
            onChange={(e) => onChange(e.target.checked)}
            onBlur={onBlur}
          />
          <span style={{ fontSize: 14 }}>{field.label}</span>
        </label>
      )}

      {field.type === "radio" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {field.options.map((opt) => (
            <label key={opt.value} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
              <input
                type="radio"
                name={field.id}
                value={opt.value}
                checked={state.value === opt.value}
                onChange={() => onChange(opt.value)}
                onBlur={onBlur}
              />
              <span style={{ fontSize: 14 }}>{opt.label}</span>
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
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      )}

      {field.type === "select" && field.multiple && (
        <select
          style={{ ...inputStyle, minHeight: 80 }}
          multiple
          value={(state.value as string[]) ?? []}
          onChange={(e) => {
            const selected = Array.from(e.target.selectedOptions, (o) => o.value);
            onChange(selected);
          }}
          onBlur={onBlur}
        >
          {field.options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      )}

      {hasError && <div style={errorStyle}>{state.error}</div>}
    </div>
  );
}
