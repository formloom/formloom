# @formloom/react

Headless React hooks for rendering Formloom schemas. Manages form state, validation, visibility, and submission. Zero DOM opinions — bring your own UI.

## Installation

```bash
npm install @formloom/react @formloom/schema
```

Peer dependency: React `^18.0.0 || ^19.0.0`.

## Basic usage

```tsx
import { useFormloom } from "@formloom/react";
import type { FormloomSchema } from "@formloom/react";

function DynamicForm({ schema }: { schema: FormloomSchema }) {
  const form = useFormloom({
    schema,
    onSubmit: async (data) => {
      // Send data back to LLM via @formloom/llm's formatSubmission
    },
    onError: (errors) => console.warn("invalid", errors),
  });

  return (
    <form onSubmit={(e) => { e.preventDefault(); void form.handleSubmit(); }}>
      {form.visibleFields.map(({ field, state, onChange, onBlur }) => (
        <div key={field.id}>
          <label>{field.label}</label>
          {field.type === "text" && (
            <input
              value={(state.value as string | null) ?? ""}
              onChange={(e) => onChange(e.target.value)}
              onBlur={onBlur}
            />
          )}
          {/* ... other field types ... */}
          {state.touched && state.error !== null && (
            <span className="error">{state.error}</span>
          )}
        </div>
      ))}
      <button type="submit" disabled={form.isSubmitting || !form.isValid}>
        {form.isSubmitting ? "Submitting..." : (schema.submitLabel ?? "Submit")}
      </button>
    </form>
  );
}
```

### Rendering sections

```tsx
{form.sections !== undefined
  ? form.sections.map((s) =>
      s.visible ? (
        <fieldset key={s.section.id}>
          {s.section.title !== undefined && <legend>{s.section.title}</legend>}
          {s.visibleFields.map((f) => <FieldInput key={f.field.id} {...f} />)}
        </fieldset>
      ) : null,
    )
  : form.visibleFields.map((f) => <FieldInput key={f.field.id} {...f} />)}
```

### File fields

Use `adaptFileList` (or `adaptFile`) in the `<input type="file">` onChange handler:

```tsx
import { adaptFileList } from "@formloom/react";

<input
  type="file"
  multiple={field.multiple}
  onChange={(e) => {
    const files = e.target.files;
    if (files === null) return;
    void adaptFileList(files).then((converted) => {
      onChange(field.multiple === true ? converted : converted[0] ?? null);
    });
  }}
/>
```

By default files are captured inline as base64 data URLs. Pass an upload handler to `adaptFile` / `adaptFileList` directly to upload instead:

```tsx
import { adaptFileList, type UploadHandler } from "@formloom/react";

const uploadHandler: UploadHandler = async (file) => {
  const { url } = await myUploader(file);
  return { url, name: file.name, mime: file.type, size: file.size };
};

<input
  type="file"
  onChange={(e) => {
    const files = e.target.files;
    if (files === null) return;
    void adaptFileList(files, uploadHandler).then((converted) => {
      onChange(field.multiple === true ? converted : converted[0] ?? null);
    });
  }}
/>
```

### Async validators

Each entry in `validators` can be either a bare function (runs on blur) or an `AsyncValidatorConfig` object:

```ts
import type { AsyncValidator, AsyncValidatorConfig } from "@formloom/react";

useFormloom({
  schema,
  onSubmit,
  validators: {
    // Config form — useful when you want onChange + debounce
    username: {
      validate: async (value) => {
        const res = await fetch(`/api/usernames/${value}`);
        return res.ok ? null : "Username is taken";
      },
      mode: "onChange",    // "onBlur" (default) | "onChange"
      debounceMs: 400,
    },
    // Bare-function form — runs on blur
    email: async (value) => {
      return value === "blocked@example.com" ? "Blocked domain" : null;
    },
  },
});
```

- Return `null` if the value is valid, or a string message if not.
- The validator receives the field's current value and the full `FormloomData` as a second argument if you need cross-field context.
- `handleSubmit` awaits all in-flight async validators before invoking `onSubmit`. Failures become entries in the returned `errors` array.
- Track per-field and form-wide pending state via `state.isValidating` and `form.isValidating`.

## Per-field hook

```tsx
import { useFormloom, useFormloomField } from "@formloom/react";

function EmailInput() {
  const form = useFormloom({ schema, onSubmit });
  const emailField = useFormloomField(form, "email");
  if (emailField === null) return null;
  return <input value={(emailField.state.value as string) ?? ""} ... />;
}
```

## API reference

### `useFormloom(options)`

| Option | Type | Description |
|--------|------|-------------|
| `schema` | `FormloomSchema` | The schema to render |
| `onSubmit` | `(data) => void \| Promise<void>` | Called on valid submission |
| `onError` | `(errors) => void` | Called when submit fails validation |
| `initialValues` | `Partial<FormloomData>` | Override default values (read on mount only) |
| `validators` | `Record<fieldId, AsyncValidator>` | Async validators per field |

`initialValues` and `validators` are captured on mount — passing new references across renders does not reset state. File uploads are handled by calling `adaptFile(file, uploadHandler)` in your input's `onChange`.

**Returns `UseFormloomReturn`:**

| Property | Type | Description |
|----------|------|-------------|
| `schema` | `FormloomSchema` | Original schema |
| `fields` | `FieldProps[]` | Every field, including hidden |
| `visibleFields` | `FieldProps[]` | Fields passing their `showIf` rule |
| `sections` | `SectionProps[] \| undefined` | Grouped fields when schema declares sections |
| `getField(id)` | `(id) => FieldProps \| undefined` | Lookup by id |
| `data` | `FormloomData` | Current values, hidden fields omitted |
| `isValid` | `boolean` | Eager sync validity across visible fields |
| `isDirty` | `boolean` | Any field touched |
| `isSubmitting` | `boolean` | Async `onSubmit` in flight |
| `isValidating` | `boolean` | Any async validator pending or debouncing |
| `handleSubmit` | `() => Promise<void>` | Validate (sync + async) and submit |
| `reset` | `() => void` | Reset to defaults |
| `errors` | `Array<{ fieldId, message }>` | Current visible-field errors |

### `FieldProps`

| Property | Type | Description |
|----------|------|-------------|
| `field` | `FormField` | The field definition |
| `state.value` | `FormloomFieldValue` | Current value |
| `state.error` | `string \| null` | Validation error |
| `state.touched` | `boolean` | Interacted with |
| `state.isValid` | `boolean` | No current error |
| `state.isValidating` | `boolean` | Per-field async validator in flight |
| `onChange` | `(value) => void` | Change handler |
| `onBlur` | `() => void` | Blur handler |
| `visible` | `boolean` | False when hidden by `showIf` |

## Re-usable validation helpers

The package exports the sync-validation primitives the hook uses internally so
custom renderers and server-side integrators can validate with identical
semantics:

```ts
import { validateField, fileMatchesAccept, mimeMatches } from "@formloom/react";

// Sync validation of a single field value. Returns a message or null.
validateField(field, value);

// HTML <input accept> matching — pass the filename so extension tokens work.
fileMatchesAccept("image/*,.pdf", file.mime, file.name);

// MIME-only subset of fileMatchesAccept. Prefer fileMatchesAccept when the filename is available.
mimeMatches(file.mime, "image/png,image/*");
```

`fileMatchesAccept` and `mimeMatches` are re-exported from `@formloom/schema`
so they're also available without the React dep.

## License

MIT
