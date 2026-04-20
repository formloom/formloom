import { useFormloom, adaptFileList } from "@formloom/react";
import type {
  FormloomSchema,
  FormloomData,
  FieldProps,
  FormloomFileValue,
} from "@formloom/react";

interface FormloomRendererProps {
  schema: FormloomSchema;
  onSubmit: (data: FormloomData) => void | Promise<void>;
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
        void form.handleSubmit();
      }}
      style={{ maxWidth: 480 }}
    >
      {schema.title !== undefined && (
        <h2 style={{ margin: "0 0 4px" }}>{schema.title}</h2>
      )}
      {schema.description !== undefined && (
        <p style={{ margin: "0 0 20px", color: "#666" }}>{schema.description}</p>
      )}

      {form.sections !== undefined
        ? form.sections.map((section) =>
            section.visible ? (
              <fieldset
                key={section.section.id}
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: 8,
                  padding: 16,
                  marginBottom: 16,
                }}
              >
                {section.section.title !== undefined && (
                  <legend style={{ padding: "0 6px", fontWeight: 600 }}>
                    {section.section.title}
                  </legend>
                )}
                {section.section.description !== undefined && (
                  <p style={{ margin: "0 0 12px", color: "#6b7280", fontSize: 13 }}>
                    {section.section.description}
                  </p>
                )}
                {section.visibleFields.map((fp) => (
                  <FieldRenderer key={fp.field.id} {...fp} />
                ))}
              </fieldset>
            ) : null,
          )
        : form.visibleFields.map((fp) => (
            <FieldRenderer key={fp.field.id} {...fp} />
          ))}

      <button
        type="submit"
        disabled={form.isSubmitting}
        style={{
          marginTop: 16,
          padding: "10px 24px",
          background: form.isSubmitting ? "#93c5fd" : "#2563eb",
          color: "#fff",
          border: "none",
          borderRadius: 6,
          cursor: form.isSubmitting ? "wait" : "pointer",
          fontSize: 14,
          fontWeight: 500,
        }}
      >
        {form.isSubmitting ? "Submitting..." : (schema.submitLabel ?? "Submit")}
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
  const hasError = state.touched && state.error !== null;

  const wrapperStyle: React.CSSProperties = { marginBottom: 16 };
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

  const hintDisplay = field.hints?.display;
  const hintRows = typeof field.hints?.rows === "number" ? field.hints.rows : 4;

  return (
    <div style={wrapperStyle}>
      <label style={labelStyle}>
        {field.label}
        {field.validation?.required === true && (
          <span style={{ color: "#ef4444", marginLeft: 2 }}>*</span>
        )}
      </label>

      {field.description !== undefined && (
        <div style={descStyle}>{field.description}</div>
      )}

      {field.type === "text" && hintDisplay === "textarea" ? (
        <textarea
          style={{ ...inputStyle, resize: "vertical" }}
          rows={hintRows}
          placeholder={field.placeholder}
          value={(state.value as string | null) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
        />
      ) : field.type === "text" ? (
        <input
          type={hintDisplay === "password" ? "password" : "text"}
          style={inputStyle}
          placeholder={field.placeholder}
          value={(state.value as string | null) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
        />
      ) : null}

      {field.type === "date" && (
        <input
          type="date"
          style={inputStyle}
          value={(state.value as string | null) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
        />
      )}

      {field.type === "number" && (
        <input
          type="number"
          style={inputStyle}
          placeholder={field.placeholder}
          min={field.validation?.min}
          max={field.validation?.max}
          step={field.validation?.step ?? (field.validation?.integer === true ? 1 : undefined)}
          value={state.value === null ? "" : String(state.value)}
          onChange={(e) => {
            const raw = e.target.value;
            if (raw === "") {
              onChange(null);
            } else {
              const parsed = Number(raw);
              onChange(Number.isNaN(parsed) ? null : parsed);
            }
          }}
          onBlur={onBlur}
        />
      )}

      {field.type === "boolean" && hintDisplay === "toggle" ? (
        <button
          type="button"
          onClick={() => onChange(!(state.value as boolean | null))}
          onBlur={onBlur}
          aria-pressed={(state.value as boolean | null) === true}
          style={{
            position: "relative",
            width: 44,
            height: 24,
            borderRadius: 999,
            border: "none",
            background:
              (state.value as boolean | null) === true ? "#2563eb" : "#d1d5db",
            cursor: "pointer",
            transition: "background 120ms",
          }}
        >
          <span
            style={{
              position: "absolute",
              top: 2,
              left: (state.value as boolean | null) === true ? 22 : 2,
              width: 20,
              height: 20,
              background: "#fff",
              borderRadius: "50%",
              transition: "left 120ms",
            }}
          />
        </button>
      ) : field.type === "boolean" ? (
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            cursor: "pointer",
          }}
        >
          <input
            type="checkbox"
            checked={(state.value as boolean | null) === true}
            onChange={(e) => onChange(e.target.checked)}
            onBlur={onBlur}
          />
          <span style={{ fontSize: 14 }}>{field.label}</span>
        </label>
      ) : null}

      {field.type === "radio" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {field.options.map((opt) => (
            <label
              key={opt.value}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                cursor: "pointer",
              }}
            >
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

      {field.type === "select" && field.multiple !== true && (
        <select
          style={inputStyle}
          value={(state.value as string | null) ?? ""}
          onChange={(e) => onChange(e.target.value || null)}
          onBlur={onBlur}
        >
          <option value="">{field.placeholder ?? "Select..."}</option>
          {field.options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      )}

      {field.type === "select" && field.multiple === true && (
        <select
          style={{ ...inputStyle, minHeight: 80 }}
          multiple
          value={(state.value as string[] | null) ?? []}
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

      {field.type === "file" && (
        <FileInput {...props} inputStyle={inputStyle} />
      )}

      {hasError && <div style={errorStyle}>{state.error}</div>}
    </div>
  );
}

function FileInput({
  field,
  onChange,
  onBlur,
  state,
  inputStyle,
}: FieldProps & { inputStyle: React.CSSProperties }) {
  if (field.type !== "file") return null;

  const label = summariseFileValue(state.value);

  return (
    <div>
      <input
        type="file"
        style={inputStyle}
        accept={field.accept}
        multiple={field.multiple}
        onBlur={onBlur}
        onChange={(e) => {
          const files = e.target.files;
          if (files === null || files.length === 0) {
            onChange(field.multiple === true ? [] : null);
            return;
          }
          void adaptFileList(files).then((converted) => {
            if (field.multiple === true) {
              onChange(converted);
            } else {
              onChange(converted[0] ?? null);
            }
          });
        }}
      />
      {label !== null && (
        <div style={{ color: "#6b7280", fontSize: 12, marginTop: 4 }}>{label}</div>
      )}
    </div>
  );
}

function summariseFileValue(
  value:
    | FormloomFileValue
    | FormloomFileValue[]
    | string
    | string[]
    | number
    | boolean
    | null,
): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "object") return null;
  if (Array.isArray(value)) {
    if (value.length === 0) return null;
    if (typeof value[0] !== "object") return null;
    return `${value.length} file${value.length === 1 ? "" : "s"} selected`;
  }
  if ("name" in value) {
    return `${value.name} (${value.size} bytes)`;
  }
  return null;
}
