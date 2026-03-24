# @formloom/react

Headless React hooks for rendering Formloom schemas. Manages form state, validation, and submission. Zero DOM opinions - you bring your own UI.

## Installation

```bash
npm install @formloom/react @formloom/schema
```

Requires React 18+ or 19+ as a peer dependency.

## Basic Usage

```tsx
import { useFormloom } from "@formloom/react";
import type { FormloomSchema } from "@formloom/react";

function DynamicForm({ schema }: { schema: FormloomSchema }) {
  const form = useFormloom({
    schema,
    onSubmit: (data) => {
      console.log("Form data:", data);
      // Send data back to LLM or your API
    },
    onError: (errors) => {
      console.log("Validation failed:", errors);
    },
  });

  return (
    <form onSubmit={(e) => { e.preventDefault(); form.handleSubmit(); }}>
      {form.fields.map(({ field, state, onChange, onBlur }) => (
        <div key={field.id}>
          <label>{field.label}</label>

          {field.type === "text" && (
            <input
              type="text"
              placeholder={field.placeholder}
              value={(state.value as string) ?? ""}
              onChange={(e) => onChange(e.target.value)}
              onBlur={onBlur}
            />
          )}

          {field.type === "boolean" && (
            <input
              type="checkbox"
              checked={(state.value as boolean) ?? false}
              onChange={(e) => onChange(e.target.checked)}
              onBlur={onBlur}
            />
          )}

          {field.type === "radio" && field.options.map((opt) => (
            <label key={opt.value}>
              <input
                type="radio"
                name={field.id}
                checked={state.value === opt.value}
                onChange={() => onChange(opt.value)}
              />
              {opt.label}
            </label>
          ))}

          {field.type === "select" && (
            <select
              value={(state.value as string) ?? ""}
              onChange={(e) => onChange(e.target.value || null)}
              onBlur={onBlur}
            >
              <option value="">Select...</option>
              {field.options.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          )}

          {field.type === "date" && (
            <input
              type="date"
              value={(state.value as string) ?? ""}
              onChange={(e) => onChange(e.target.value)}
              onBlur={onBlur}
            />
          )}

          {state.touched && state.error && (
            <span className="error">{state.error}</span>
          )}
        </div>
      ))}

      <button type="submit" disabled={!form.isValid}>
        {schema.submitLabel || "Submit"}
      </button>
    </form>
  );
}
```

## Per-Field Hook

For more control, use `useFormloomField` to grab a single field by id:

```tsx
import { useFormloom, useFormloomField } from "@formloom/react";

function MyForm({ schema }) {
  const form = useFormloom({ schema, onSubmit: handleSubmit });
  const emailField = useFormloomField(form, "email");

  if (!emailField) return null;

  return (
    <input
      value={emailField.state.value ?? ""}
      onChange={(e) => emailField.onChange(e.target.value)}
      onBlur={emailField.onBlur}
    />
  );
}
```

## API Reference

### `useFormloom(options)`

| Option | Type | Description |
|--------|------|-------------|
| `schema` | `FormloomSchema` | The schema to render |
| `onSubmit` | `(data: FormloomData) => void` | Called on valid submission |
| `onError` | `(errors) => void` | Called on invalid submission |
| `initialValues` | `Partial<FormloomData>` | Override default values |

**Returns `UseFormloomReturn`:**

| Property | Type | Description |
|----------|------|-------------|
| `schema` | `FormloomSchema` | The original schema |
| `fields` | `FieldProps[]` | Array of field props in schema order |
| `getField` | `(id: string) => FieldProps` | Get field by id |
| `data` | `FormloomData` | Current form values |
| `isValid` | `boolean` | Whether all fields are valid |
| `isDirty` | `boolean` | Whether any field has been touched |
| `handleSubmit` | `() => void` | Validate and submit |
| `reset` | `() => void` | Reset to defaults |
| `errors` | `Array<{ fieldId, message }>` | Current errors |

### `FieldProps`

| Property | Type | Description |
|----------|------|-------------|
| `field` | `FormField` | The field definition |
| `state.value` | `string \| boolean \| string[] \| null` | Current value |
| `state.error` | `string \| null` | Validation error |
| `state.touched` | `boolean` | Has been interacted with |
| `state.isValid` | `boolean` | No current error |
| `onChange` | `(value) => void` | Value change handler |
| `onBlur` | `() => void` | Blur handler (triggers validation) |

## License

MIT
