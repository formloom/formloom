# @formloom/schema

The core schema specification for Formloom. TypeScript types, constants, and a validator. Zero runtime dependencies.

## Installation

```bash
npm install @formloom/schema
```

## Schema Spec

A Formloom schema is a JSON object with this shape:

```json
{
  "version": "1.0",
  "title": "Contact Form",
  "description": "Please fill out your details",
  "submitLabel": "Send",
  "fields": [
    {
      "id": "email",
      "type": "text",
      "label": "Email Address",
      "placeholder": "you@example.com",
      "validation": {
        "required": true,
        "pattern": "^[^@]+@[^@]+\\.[^@]+$",
        "patternMessage": "Must be a valid email"
      }
    },
    {
      "id": "plan",
      "type": "radio",
      "label": "Plan",
      "options": [
        { "value": "free", "label": "Free" },
        { "value": "pro", "label": "Pro ($10/mo)" }
      ],
      "defaultValue": "free"
    }
  ]
}
```

### Field Types

These are **rendering primitives**, not semantic types. A text field with an email regex IS an email field.

| Type | Description | Extra Properties |
|------|-------------|-----------------|
| `text` | Single-line text input | `placeholder`, `defaultValue` (string) |
| `boolean` | Yes/no toggle | `defaultValue` (boolean) |
| `radio` | Pick one from options | `options` (required), `defaultValue` (string) |
| `select` | Dropdown / multi-select | `options` (required), `multiple`, `placeholder`, `defaultValue` (string or string[]) |
| `date` | Date picker | `placeholder`, `defaultValue` (ISO 8601 string) |

### Validation Rules

| Property | Type | Description |
|----------|------|-------------|
| `required` | boolean | Field must be filled |
| `pattern` | string | Regex (no delimiters) |
| `patternMessage` | string | Error message on pattern failure |

## Validator

```ts
import { validateSchema } from "@formloom/schema";

const result = validateSchema(maybeSchema);

if (result.valid) {
  // result.errors is []
} else {
  // result.errors is ValidationError[]
  // Each error has { path: string, message: string }
  console.log(result.errors);
}
```

The validator collects **all** errors rather than failing on the first one, so you can fix LLM output comprehensively.

## TypeScript Types

```ts
import type {
  FormloomSchema,
  FormField,
  TextField,
  BooleanField,
  RadioField,
  SelectField,
  DateField,
  FormloomData,
  FieldOption,
  ValidationRule,
  RenderHints,
} from "@formloom/schema";
```

## License

MIT
