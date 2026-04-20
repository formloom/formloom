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

### Standard Schema adapter

Produces a [Standard Schema v1](https://standardschema.dev) validator. Works with any Standard-Schema-aware library (tRPC, react-hook-form, drizzle-zod, etc.) without a Zod dependency.

```ts
import { formloomToStandardSchema } from "@formloom/zod";

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
| `radio` | `z.enum(options.map(o => o.value))` |
| `select` (single) | `z.enum(...)` |
| `select` (multiple) | `z.array(z.enum(...))` |
| `number` | `z.number()` + min/max/int/step |
| `file` | `z.object({ kind, name, mime, size, dataUrl?, url? })` |

Required-ness is enforced at the object level via `.superRefine`, so `showIf`-gated fields only become required when their rule evaluates true against the same object.

Regex patterns go through `safeRegexTest` so catastrophic patterns never hang Zod parsing.

## License

MIT
