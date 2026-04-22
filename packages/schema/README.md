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
  "version": "1.1",
  "title": "Job Application",
  "description": "Tell us a bit about yourself",
  "submitLabel": "Submit",
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
      "id": "years_experience",
      "type": "number",
      "label": "Years of experience",
      "validation": { "min": 0, "max": 60, "integer": true, "required": true }
    },
    {
      "id": "employment_type",
      "type": "radio",
      "label": "Employment type",
      "options": [
        { "value": "full_time", "label": "Full-time" },
        { "value": "contract", "label": "Contract" }
      ],
      "validation": { "required": true }
    },
    {
      "id": "day_rate",
      "type": "number",
      "label": "Day rate (USD)",
      "showIf": { "field": "employment_type", "equals": "contract" }
    },
    {
      "id": "resume",
      "type": "file",
      "label": "Resume",
      "accept": "application/pdf",
      "maxSizeBytes": 2000000,
      "validation": { "required": true }
    }
  ],
  "sections": [
    { "id": "details", "title": "Details", "fieldIds": ["email", "years_experience"] },
    { "id": "role", "title": "Role", "fieldIds": ["employment_type", "day_rate"] },
    { "id": "docs", "title": "Documents", "fieldIds": ["resume"] }
  ]
}
```

### Field types

These are **rendering primitives**, not semantic types. A text field with an email regex IS an email field.

| Type | Description | Extra properties |
|------|-------------|------------------|
| `text` | Single-line text input | `placeholder`, `defaultValue` (string) |
| `boolean` | Yes/no toggle | `defaultValue` (boolean) |
| `radio` | Pick one from options | `options` (required), `defaultValue` (string) |
| `select` | Dropdown or multi-select | `options` (required), `multiple`, `placeholder`, `defaultValue` (string / string[]) |
| `date` | Date picker | `placeholder`, `defaultValue` (ISO 8601 string) |
| `number` | Numeric input | `placeholder`, `defaultValue` (number), validation: `min`, `max`, `step`, `integer` |
| `file` | File upload | `accept` (MIME globs), `maxSizeBytes`, `multiple` |

### Validation rules

| Property | Type | Applies to | Description |
|----------|------|------------|-------------|
| `required` | boolean | all | Field must be filled |
| `pattern` | string | text, date | Regex (no delimiters). Catastrophic patterns are rejected. |
| `patternMessage` | string | text, date | Error message on pattern failure |
| `min`, `max` | number | number | Inclusive range |
| `step` | number | number | Granularity; must be > 0 |
| `integer` | boolean | number | Reject non-integers |

### Conditional visibility (`showIf`)

Attach a `showIf` rule to any field. Hidden fields are excluded from submitted data.

```jsonc
// leaf rules
{ "field": "country", "equals": "US" }
{ "field": "plan", "in": ["pro", "enterprise"] }
{ "field": "coupon", "notEmpty": true }

// composites
{ "allOf": [ ... ] }
{ "anyOf": [ ... ] }
{ "not": { ... } }
```

Dependency cycles and references to unknown fields are caught at validation time.

The package exports three helpers so custom renderers and servers can share the same semantics as the React hook:

```ts
import {
  evaluateShowIf,
  collectShowIfDependencies,
  findShowIfCycle,
} from "@formloom/schema";

evaluateShowIf(field.showIf, currentData);     // boolean
collectShowIfDependencies(field.showIf);       // Set<string> of referenced field ids
findShowIfCycle(schema.fields);                // string[] (e.g. ["a","b","a"]) or null
```

### Sections

Optional top-level grouping. When `sections` is present, **every** field id must belong to exactly one section.

```json
"sections": [
  { "id": "personal", "title": "Personal", "fieldIds": ["name", "email"] },
  { "id": "employment", "fieldIds": ["role", "start_date"] }
]
```

### Rendering hints

Hints are advisory — renderers honour what they know and ignore the rest. The canonical registry is exported as `CANONICAL_HINTS`:

| Key | Values | Meaning |
|-----|--------|---------|
| `display` | `"textarea"`, `"password"`, `"toggle"`, `"stepper"` | Ask for a non-default widget |
| `width` | `"full"`, `"half"`, `"third"` | Layout hint |
| `rows` | integer | Textarea row count |
| `autocomplete` | HTML autocomplete token | Browser autofill hint |

Unknown hints pass through, so you can extend without a version bump.

## Validator

```ts
import { validateSchema } from "@formloom/schema";

const result = validateSchema(maybeSchema);

if (result.valid) {
  // result.errors is []; result.warnings may contain non-fatal notices
} else {
  // result.errors is ValidationError[] with { path, message }
  console.log(result.errors);
}
```

Collects **all** errors rather than failing on the first one.

If you prefer a throw-on-invalid style, wrap the result:

```ts
import { validateSchema, FormloomValidationError } from "@formloom/schema";

const result = validateSchema(maybeSchema);
if (!result.valid) throw new FormloomValidationError(result.errors);
```

`FormloomValidationError` extends `Error` with an `errors: ValidationError[]` property and a pre-formatted message listing every issue.

### Forward compatibility

A v1.5 schema emitted by a newer LLM may contain a field type this runtime doesn't know. Control the behaviour via the `forwardCompat` option:

```ts
validateSchema(schema, { forwardCompat: "lenient" });
// → unknown field types are dropped (with a warning) and listed in result.droppedFields
// → `"strict"` (default) errors out
```

## Versioning

Any `1.x` version string is accepted. Export constants:

```ts
FORMLOOM_SCHEMA_VERSION          // "1.1"
FORMLOOM_MIN_SUPPORTED_VERSION   // "1.0"
FIELD_TYPES                      // readonly ["text","boolean","radio","select","date","number","file"]
```

Helpers for working with version strings:

```ts
import {
  parseSchemaVersion,
  isSupportedVersion,
  compareVersions,
} from "@formloom/schema";

parseSchemaVersion("1.1");       // { major: 1, minor: 1 }
parseSchemaVersion("not-a-ver"); // null — malformed input returns null instead of throwing

isSupportedVersion("1.3", 1);    // true  — same major
isSupportedVersion("2.0", 1);    // false — different major

compareVersions({ major: 1, minor: 1 }, { major: 1, minor: 0 }); // positive: a > b
```

## Safe regex

LLM-authored regex patterns are passed to `safeRegexTest`, which detects catastrophic shapes (nested quantifiers, overlapping alternations, backrefs) and caps input length. It never hangs and never throws.

```ts
import {
  safeRegexTest,
  isCatastrophicPattern,
  isValidRegexSyntax,
  DEFAULT_MAX_INPUT_LENGTH,
} from "@formloom/schema";

const result = safeRegexTest(pattern, value);
// { matched: boolean, skipped: boolean, reason?: string }
//
// skipped = true when:
//   - the pattern is syntactically invalid
//   - the pattern matches a known catastrophic shape
//   - the input exceeds DEFAULT_MAX_INPUT_LENGTH (10 KB by default)

isCatastrophicPattern("(a+)+");       // true
isValidRegexSyntax("^[a-z]+$");       // true
```

Pass `{ maxInputLength }` as the third argument to change the cap per-call.

## File matching

Every layer of Formloom (validator, React hook, Zod adapter) uses the same accept-string matcher, so behaviour is identical across the stack.

```ts
import { fileMatchesAccept, mimeMatches } from "@formloom/schema";

fileMatchesAccept("image/*,.pdf", "image/png", "photo.png");      // true
fileMatchesAccept("image/*,.pdf", "application/pdf", "cv.pdf");   // true (via .pdf)

// mimeMatches is MIME-only — extension tokens are ignored because
// there is no filename context. Prefer fileMatchesAccept when you have a name.
mimeMatches("image/png", "image/*");         // true
mimeMatches("application/pdf", ".pdf");      // false
```

## TypeScript types

```ts
import type {
  // Schema shape
  FormloomSchema,
  Section,
  FieldType,
  BaseField,
  FormField,
  TextField, BooleanField, RadioField, SelectField,
  DateField, NumberField, FileField,

  // Values
  FormloomData, FormloomFieldValue, FormloomFileValue,

  // Per-field bits
  FieldOption, ValidationRule, NumberValidationRule,
  RenderHints,
  CanonicalHints, CanonicalHintEntry, CanonicalDisplayHint, CanonicalWidthHint,
  ShowIfRule,

  // Validator
  ValidationResult, ValidationError, ValidationWarning, ValidateOptions,

  // Version helpers
  ParsedVersion,

  // Safe regex
  SafeRegexOptions, SafeRegexResult,
} from "@formloom/schema";
```

## License

MIT
