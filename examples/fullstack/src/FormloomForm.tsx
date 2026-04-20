import { useFormloom, adaptFileList } from "@formloom/react";
import type {
  FormloomSchema,
  FormloomData,
  FieldProps,
  FormloomFileValue,
} from "@formloom/react";

interface Props {
  schema: FormloomSchema;
  onSubmit: (data: FormloomData) => void | Promise<void>;
}

export function FormloomForm({ schema, onSubmit }: Props) {
  const form = useFormloom({ schema, onSubmit });

  return (
    <div>
      {schema.title !== undefined && (
        <h3 style={{ margin: "0 0 4px", fontSize: 16 }}>{schema.title}</h3>
      )}

      {form.sections !== undefined
        ? form.sections.map((section) =>
            section.visible ? (
              <fieldset
                key={section.section.id}
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: 8,
                  padding: 12,
                  marginBottom: 12,
                }}
              >
                {section.section.title !== undefined && (
                  <legend style={{ padding: "0 6px", fontWeight: 600, fontSize: 13 }}>
                    {section.section.title}
                  </legend>
                )}
                {section.visibleFields.map((fp) => (
                  <Field key={fp.field.id} {...fp} />
                ))}
              </fieldset>
            ) : null,
          )
        : form.visibleFields.map((fp) => <Field key={fp.field.id} {...fp} />)}

      <button
        type="button"
        onClick={() => void form.handleSubmit()}
        disabled={form.isSubmitting}
        style={{
          marginTop: 12,
          padding: "8px 20px",
          background: form.isSubmitting ? "#93c5fd" : "#2563eb",
          color: "#fff",
          border: "none",
          borderRadius: 6,
          cursor: form.isSubmitting ? "wait" : "pointer",
          fontSize: 13,
          fontWeight: 500,
        }}
      >
        {form.isSubmitting ? "Submitting..." : (schema.submitLabel ?? "Submit")}
      </button>
    </div>
  );
}

function Field(props: FieldProps) {
  const { field, state, onChange, onBlur } = props;
  const hasError = state.touched && state.error !== null;

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "6px 10px",
    border: `1px solid ${hasError ? "#ef4444" : "#d1d5db"}`,
    borderRadius: 6,
    fontSize: 13,
    boxSizing: "border-box",
  };

  const hintDisplay = field.hints?.display;
  const hintRows = typeof field.hints?.rows === "number" ? field.hints.rows : 4;

  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 3 }}>
        {field.label}
        {field.validation?.required === true && (
          <span style={{ color: "#ef4444", marginLeft: 2 }}>*</span>
        )}
      </label>

      {field.description !== undefined && (
        <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 4 }}>
          {field.description}
        </div>
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
            if (raw === "") onChange(null);
            else {
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
            width: 40,
            height: 22,
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
              left: (state.value as boolean | null) === true ? 20 : 2,
              width: 18,
              height: 18,
              background: "#fff",
              borderRadius: "50%",
              transition: "left 120ms",
            }}
          />
        </button>
      ) : field.type === "boolean" ? (
        <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={(state.value as boolean | null) === true}
            onChange={(e) => onChange(e.target.checked)}
            onBlur={onBlur}
          />
          <span style={{ fontSize: 13 }}>{field.label}</span>
        </label>
      ) : null}

      {field.type === "radio" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {field.options.map((opt) => (
            <label
              key={opt.value}
              style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}
            >
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
          style={{ ...inputStyle, minHeight: 72 }}
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

      {hasError && (
        <div style={{ color: "#ef4444", fontSize: 11, marginTop: 2 }}>
          {state.error}
        </div>
      )}
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
  const summary = summariseFileValue(state.value);
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
            if (field.multiple === true) onChange(converted);
            else onChange(converted[0] ?? null);
          });
        }}
      />
      {summary !== null && (
        <div style={{ color: "#6b7280", fontSize: 11, marginTop: 2 }}>{summary}</div>
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
  if ("name" in value) return `${value.name} (${value.size} bytes)`;
  return null;
}
