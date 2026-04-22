# @formloom/zod

Zod and Standard Schema adapters for Formloom. Converts a `FormloomSchema` into a Zod schema or a Standard Schema v1 validator so integrators can plug submitted form data straight into their validation pipeline.

## Installation

```bash
npm install @formloom/zod @formloom/schema zod
```

`zod` is a peer dependency (`^3.23.0 || ^4.0.0`). Use `formloomToStandardSchema` if you don't want to pull Zod in.

## Usage

### Zod adapter

```ts
import { formloomToZod } from "@formloom/zod";

const zodSchema = formloomToZod(formloomSchema);
const parsed = zodSchema.safeParse(submittedData);

if (parsed.success) {
  // parsed.data is FormloomData
} else {
  parsed.error.issues.forEach((i) => console.warn(i.path, i.message));
}
```

Options:

```ts
formloomToZod(schema, {
  honorShowIf: true,      // required-ness skips hidden fields (default)
  unknownKeys: "strip",   // "strip" | "strict" | "passthrough"
});
```

Every field is `.optional().nullable()` at the individual level, and required-ness is enforced via a top-level `.superRefine` that checks visibility. This matches the shape of `FormloomData` returned by `useFormloom`.

Because `formloomToZod` returns a `ZodEffects`-wrapped object, you cannot reach `.shape` or `.extend()` on the result directly. If you need those, use `formloomToZodObject`.

### `formloomToZodObject`

Returns the bare `ZodObject` without the `superRefine` that enforces required-when-visible. Every field is still `.optional().nullable()`, so empty or hidden fields are accepted at the per-field level. Use this when you want to:

- Read `.shape` to drive form generation from the Zod side.
- Extend the object with additional keys via `.extend({ ... })`.
- Compose it into a larger schema and apply your own required-ness rules.

```ts
import { formloomToZodObject } from "@formloom/zod";

const base = formloomToZodObject(formloomSchema, { unknownKeys: "strict" });

// Add extra fields your form doesn't cover:
const extended = base.extend({
  submittedAt: z.string().datetime(),
  submittedBy: z.string().uuid(),
});

// Inspect the shape:
Object.keys(base.shape); // ["email", "years_experience", ...]
```

If you just want to validate submitted data end-to-end, prefer `formloomToZod`.

### Standard Schema adapter

Produces a [Standard Schema v1](https://standardschema.dev) validator. Works with any Standard-Schema-aware library (tRPC, react-hook-form, drizzle-zod, etc.) without a Zod dependency.

```ts
import { formloomToStandardSchema } from "@formloom/zod";
import type { StandardSchemaV1, StandardSchemaIssue } from "@formloom/zod";

const std = formloomToStandardSchema(formloomSchema);

const result = std["~standard"].validate(submittedData);
if ("value" in result) {
  // result.value is the validated data
} else {
  result.issues.forEach((i) => console.warn(i.path, i.message));
}
```

## Per-field translation

| Formloom | Zod |
|----------|-----|
| `text` | `z.string()` + regex refine via `safeRegexTest` |
| `date` | `z.string()` + ISO 8601 pattern |
| `boolean` | `z.boolean()` |
| `radio` (closed set) | `z.enum(options.map(o => o.value))` |
| `radio` with `allowCustom` | `z.string()` + optional pattern refine |
| `select` (single, closed) | `z.enum(...)` |
| `select` (multi, closed) | `z.array(z.enum(...))` |
| `select` with `allowCustom` | `z.string()` (single) or `z.array(z.string())` (multi); pattern refine applies per entry |
| `number` | `z.number()` + min/max/int/step |
| `file` | `z.object({ kind, name, mime, size, dataUrl?, url? })` |

Required-ness is enforced at the object level via `.superRefine`, so `showIf`-gated fields only become required when their rule evaluates true against the same object.

Regex patterns go through `safeRegexTest` so catastrophic patterns never hang Zod parsing.

## v1.2 notes

- `allowCustom` relaxes radio/select to accept freeform strings, but `validation.pattern` is still applied — including to each entry of a multi-select array.
- `BaseField.readOnly` / `BaseField.disabled` are presentation-only flags; they do not alter the generated Zod shape or Standard Schema validator.

## License

MIT
