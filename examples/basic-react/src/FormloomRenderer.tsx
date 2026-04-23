import { useFormloom, adaptFileList } from "@formloom/react";
import { useState } from "react";
import type {
  FormloomSchema,
  FormloomData,
  FieldProps,
  FieldCustomInfo,
  FormloomFieldValue,
  FormloomFileValue,
  FieldOption,
  AsyncValidator,
} from "@formloom/react";

interface FormloomRendererProps {
  schema: FormloomSchema;
  onSubmit: (data: FormloomData) => void | Promise<void>;
  onValueChange?: (fieldId: string, value: FormloomFieldValue, data: FormloomData) => void;
  validators?: Record<string, AsyncValidator>;
  readOnly?: boolean;
  disabled?: boolean;
}

export function FormloomRenderer({
  schema,
  onSubmit,
  onValueChange,
  validators,
  readOnly,
  disabled,
}: FormloomRendererProps) {
  const form = useFormloom({
    schema,
    onSubmit,
    onValueChange,
    validators,
    readOnly,
    disabled,
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

export function FieldBody(props: FieldProps) {
  return <FieldRenderer {...props} />;
}

function FieldRenderer(props: FieldProps) {
  const { field, state, onChange, onBlur, custom } = props;
  const hasError = state.touched && state.error !== null;
  const lock = state.readOnly || state.disabled;

  const widthHint = field.hints?.width;
  const wrapperStyle: React.CSSProperties = {
    marginBottom: 16,
    opacity: state.disabled ? 0.6 : 1,
    // `width` hint controls the column fraction. This example lays fields
    // out vertically, so we cap maxWidth as an easily-visible demonstration.
    maxWidth:
      widthHint === "half" ? 280 : widthHint === "third" ? 180 : undefined,
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
    background: lock ? "#f3f4f6" : "#fff",
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
  const optionDescStyle: React.CSSProperties = {
    color: "#6b7280",
    fontSize: 12,
    marginLeft: 24,
    marginTop: -2,
    marginBottom: 4,
  };

  const hintDisplay = field.hints?.display;
  const hintRows = typeof field.hints?.rows === "number" ? field.hints.rows : 4;

  if (state.readOnly) {
    return (
      <div style={wrapperStyle}>
        <label style={labelStyle}>{field.label}</label>
        {field.description !== undefined && (
          <div style={descStyle}>{field.description}</div>
        )}
        <div
          style={{
            ...inputStyle,
            minHeight: 36,
            display: "flex",
            alignItems: "center",
            color: "#374151",
          }}
        >
          {formatReadOnlyValue(state.value) ?? (
            <span style={{ color: "#9ca3af" }}>—</span>
          )}
        </div>
      </div>
    );
  }

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
          disabled={state.disabled}
          value={(state.value as string | null) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
        />
      ) : field.type === "text" ? (
        <input
          type={hintDisplay === "password" ? "password" : "text"}
          style={inputStyle}
          placeholder={field.placeholder}
          disabled={state.disabled}
          autoComplete={field.hints?.autocomplete}
          value={(state.value as string | null) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
        />
      ) : null}

      {field.type === "date" && (
        <input
          type="date"
          style={inputStyle}
          disabled={state.disabled}
          value={(state.value as string | null) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
        />
      )}

      {field.type === "number" && hintDisplay === "stepper" && (
        <NumberStepper {...props} />
      )}

      {field.type === "number" && hintDisplay !== "stepper" && (
        <input
          type="number"
          style={inputStyle}
          placeholder={field.placeholder}
          disabled={state.disabled}
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
            <div key={opt.value}>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  cursor: state.disabled ? "not-allowed" : "pointer",
                }}
              >
                <input
                  type="radio"
                  name={field.id}
                  value={opt.value}
                  checked={state.value === opt.value}
                  disabled={state.disabled}
                  onChange={() => onChange(opt.value)}
                  onBlur={onBlur}
                />
                <span style={{ fontSize: 14 }}>{opt.label}</span>
              </label>
              {opt.description !== undefined && (
                <div style={optionDescStyle}>{opt.description}</div>
              )}
            </div>
          ))}
          {custom?.allowed === true && (
            <RadioCustomOption
              fieldId={field.id}
              value={state.value}
              options={field.options.map((o) => o.value)}
              disabled={state.disabled}
              custom={custom}
              onChange={onChange}
              onBlur={onBlur}
            />
          )}
        </div>
      )}

      {field.type === "select" && field.multiple !== true && (
        <select
          style={inputStyle}
          disabled={state.disabled}
          value={(state.value as string | null) ?? ""}
          onChange={(e) => onChange(e.target.value || null)}
          onBlur={onBlur}
        >
          <option value="">{field.placeholder ?? "Select..."}</option>
          {field.options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
              {opt.description !== undefined ? ` — ${opt.description}` : ""}
            </option>
          ))}
        </select>
      )}

      {field.type === "select" && field.multiple === true && custom?.allowed === true && (
        <MultiSelectWithCustom
          value={Array.isArray(state.value) ? (state.value as string[]) : []}
          options={field.options}
          custom={custom}
          disabled={state.disabled}
          onChange={onChange}
          onBlur={onBlur}
        />
      )}

      {field.type === "select" && field.multiple === true && custom?.allowed !== true && (
        <select
          style={{ ...inputStyle, minHeight: 80 }}
          multiple
          disabled={state.disabled}
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
      {state.isValidating && !hasError && (
        <div style={{ color: "#2563eb", fontSize: 12, marginTop: 4 }}>
          Checking…
        </div>
      )}
    </div>
  );
}

function NumberStepper(props: FieldProps) {
  const { field, state, onChange, onBlur } = props;
  if (field.type !== "number") return null;
  const step = field.validation?.step ?? (field.validation?.integer === true ? 1 : 1);
  const current = typeof state.value === "number" ? state.value : 0;
  const clamp = (v: number): number => {
    const min = field.validation?.min;
    const max = field.validation?.max;
    if (typeof min === "number" && v < min) return min;
    if (typeof max === "number" && v > max) return max;
    return v;
  };
  const btn: React.CSSProperties = {
    padding: "4px 10px",
    border: "1px solid #d1d5db",
    background: "#fff",
    cursor: state.disabled ? "not-allowed" : "pointer",
    borderRadius: 6,
    fontSize: 14,
    minWidth: 32,
  };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <button
        type="button"
        style={btn}
        disabled={state.disabled}
        onClick={() => onChange(clamp(current - step))}
        onBlur={onBlur}
      >
        −
      </button>
      <span style={{ minWidth: 32, textAlign: "center", fontSize: 14 }}>
        {current}
      </span>
      <button
        type="button"
        style={btn}
        disabled={state.disabled}
        onClick={() => onChange(clamp(current + step))}
        onBlur={onBlur}
      >
        +
      </button>
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

function RadioCustomOption({
  fieldId,
  value,
  options,
  disabled,
  custom,
  onChange,
  onBlur,
}: {
  fieldId: string;
  value: FormloomFieldValue;
  options: string[];
  disabled: boolean;
  custom: FieldCustomInfo;
  onChange: (next: FormloomFieldValue) => void;
  onBlur: () => void;
}) {
  const selected = custom.isCustomValue;
  const customValue = selected && typeof value === "string" ? value : "";

  return (
    <div>
      <label
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          cursor: disabled ? "not-allowed" : "pointer",
        }}
      >
        <input
          type="radio"
          name={fieldId}
          checked={selected}
          disabled={disabled}
          onChange={() => onChange(customValue === "" ? "__placeholder__" : customValue)}
          onBlur={onBlur}
        />
        <span style={{ fontSize: 14 }}>{custom.label}</span>
      </label>
      {(selected || !options.includes(String(value ?? ""))) && (
        <input
          type="text"
          placeholder={custom.placeholder}
          disabled={disabled}
          style={{
            marginTop: 4,
            marginLeft: 24,
            padding: "6px 10px",
            fontSize: 13,
            border: "1px solid #d1d5db",
            borderRadius: 4,
          }}
          value={customValue}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
        />
      )}
    </div>
  );
}

function MultiSelectWithCustom({
  value,
  options,
  custom,
  disabled,
  onChange,
  onBlur,
}: {
  value: string[];
  options: FieldOption[];
  custom: FieldCustomInfo;
  disabled: boolean;
  onChange: (next: FormloomFieldValue) => void;
  onBlur: () => void;
}) {
  const [pending, setPending] = useState("");
  const optionValues = options.map((o) => o.value);
  const customValues = value.filter((v) => !optionValues.includes(v));

  const toggle = (v: string) => {
    if (value.includes(v)) onChange(value.filter((x) => x !== v));
    else onChange([...value, v]);
  };

  const addCustom = () => {
    const trimmed = pending.trim();
    if (trimmed === "") return;
    if (value.includes(trimmed)) {
      setPending("");
      return;
    }
    onChange([...value, trimmed]);
    setPending("");
  };

  return (
    <div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {options.map((opt) => (
          <label
            key={opt.value}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              cursor: disabled ? "not-allowed" : "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={value.includes(opt.value)}
              disabled={disabled}
              onChange={() => toggle(opt.value)}
              onBlur={onBlur}
            />
            <span style={{ fontSize: 14 }}>{opt.label}</span>
          </label>
        ))}
      </div>
      {customValues.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
          {customValues.map((v) => (
            <span
              key={v}
              style={{
                background: "#e0e7ff",
                color: "#3730a3",
                padding: "2px 8px",
                borderRadius: 999,
                fontSize: 12,
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              {v}
              <button
                type="button"
                disabled={disabled}
                onClick={() => onChange(value.filter((x) => x !== v))}
                style={{
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  padding: 0,
                  color: "#3730a3",
                  fontSize: 14,
                }}
                aria-label={`Remove ${v}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
      <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
        <input
          type="text"
          placeholder={custom.placeholder ?? custom.label}
          disabled={disabled}
          style={{
            flex: 1,
            padding: "6px 10px",
            fontSize: 13,
            border: "1px solid #d1d5db",
            borderRadius: 4,
          }}
          value={pending}
          onChange={(e) => setPending(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addCustom();
            }
          }}
          onBlur={onBlur}
        />
        <button
          type="button"
          disabled={disabled || pending.trim() === ""}
          onClick={addCustom}
          style={{
            padding: "6px 12px",
            fontSize: 13,
            border: "1px solid #d1d5db",
            borderRadius: 4,
            background: "#fff",
            cursor: disabled ? "not-allowed" : "pointer",
          }}
        >
          Add
        </button>
      </div>
    </div>
  );
}

function formatReadOnlyValue(value: FormloomFieldValue): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value === "" ? null : value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) {
    if (value.length === 0) return null;
    if (typeof value[0] === "string") return (value as string[]).join(", ");
    return `${value.length} item${value.length === 1 ? "" : "s"}`;
  }
  if (typeof value === "object" && "name" in value) return String(value.name);
  return null;
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
