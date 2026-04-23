import type {
  FieldType,
  FormloomCapabilities,
} from "@formloom/schema";
import { resolveFeatures } from "@formloom/schema";

/**
 * Composable fragments of the Formloom system prompt. `buildSystemPrompt`
 * stitches these together in a capability-aware way; passing an empty
 * `FormloomCapabilities` (or no capabilities at all) reproduces the default
 * `FORMLOOM_SYSTEM_PROMPT` byte-for-byte.
 */

const PROMPT_INTRO =
  "## Structured Form Generation (Formloom)\n\nWhen you need to collect structured information from the user, generate a JSON form schema using the formloom_collect tool. This presents the user with an interactive form and returns clean structured data.";

const PROMPT_FIELD_TYPES_HEADER =
  "### Field types (rendering primitives, NOT semantic types)\n\nMeaning comes from the combination of type + placeholder + validation + hints.";

/**
 * Per-primitive bullet. Order matches the canonical FIELD_TYPES tuple so the
 * narrowed prompt keeps a stable reading order.
 */
const FIELD_TYPE_BULLETS: Record<FieldType, string> = {
  text: '- **text**: Single-line text input. Placeholder + validation.pattern gives it meaning (a text field with an email regex IS an email field).',
  boolean:
    '- **boolean**: Yes/no. Renderer picks toggle or checkbox (hint with hints.display: "toggle" to bias).',
  radio: '- **radio**: Pick exactly one from 2-5 options. Requires "options".',
  select:
    '- **select**: Pick one or many from a list. Requires "options". Set "multiple": true for multi-select.',
  date: "- **date**: Date picker. Use ISO 8601 (YYYY-MM-DD) for defaultValue.",
  number: "- **number**: Numeric input. Use validation.min/max/step/integer.",
  file: '- **file**: File upload. Use "accept" (MIME globs) and "maxSizeBytes" (keep small — large base64 payloads bloat tool results). No defaultValue.',
};

const FIELD_TYPE_ORDER: readonly FieldType[] = [
  "text",
  "boolean",
  "radio",
  "select",
  "date",
  "number",
  "file",
];

const SECTION_SHOWIF = `### Conditional fields

Attach "showIf" to a field to hide it until a condition is met. Hidden fields are excluded from submitted data. Rules:
- { "field": "country", "equals": "US" }
- { "field": "plan", "in": ["pro", "enterprise"] }
- { "field": "coupon", "notEmpty": true }
- { "allOf": [ ... ] } / { "anyOf": [ ... ] } / { "not": { ... } }`;

const SECTION_SECTIONS = `### Sections

For longer forms, add a top-level "sections" array grouping fieldIds into visual sections. When "sections" is present, every field id must belong to exactly one section.`;

const SECTION_OPTION_DESCRIPTIONS =
  '### Option descriptions\n\nOptions in radio/select can carry an optional "description" — a one-sentence sub-label beside the label. Use it when a label alone is cryptic: `{ "value": "eod", "label": "End-of-day summary", "description": "One report at 5 PM" }`.';

const SECTION_ALLOW_CUSTOM =
  '### Custom values ("Other…")\n\nSet "allowCustom": true on radio/select when real-world answers extend beyond a plausible list (e.g. "What CRM?"). The user may submit any string; "customLabel" (default "Other") and "customPlaceholder" tune the input. Leave it off for closed sets.';

/**
 * Renders the "Rendering hints" section with the variant line tailored to the
 * host's policy:
 *   - omitted (any)       → generic guidance
 *   - array (allowlist)   → explicit list of allowed variants
 *   - false               → variant line omitted entirely
 */
function renderHintsSection(
  variants: FormloomCapabilities["variants"],
): string {
  const bullets = [
    '- hints.display: "textarea" | "password" | "toggle" | "stepper"',
    '- hints.width: "full" | "half" | "third"',
    "- hints.rows: integer (for textarea)",
    "- hints.autocomplete: HTML autocomplete token",
  ];
  if (variants === undefined) {
    bullets.push(
      '- hints.variant: host-defined widget key (e.g. "combobox"). Only emit one the host supports.',
    );
  } else if (Array.isArray(variants) && variants.length > 0) {
    bullets.push(
      `- hints.variant: one of ${variants.map((v) => `"${v}"`).join(" | ")}. Emit only these.`,
    );
  }
  // variants === false ⇒ no variant line at all
  return `### Rendering hints (all optional)\n\n${bullets.join("\n")}`;
}

const RULES = `### Rules

1. Keep forms focused: 3-7 visible fields. Use showIf to keep the initial form short.
2. Every option in radio/select has both "value" (machine key) and "label" (display text). Add "description" only when it sharpens the choice.
3. Field "id" values are snake_case and descriptive ("delivery_date", not "field1").
4. Pre-fill defaultValue whenever you can infer the answer from conversation context.
5. Set validation.required: true for fields that must be filled. Use validation.pattern (plus patternMessage) for format checks. Avoid nested quantifiers and overlapping alternations — catastrophic regexes are rejected at schema validation.
6. Always set version: "1.2" on new schemas.`;

/**
 * Stitches the system prompt from fragments based on the provided
 * capabilities. Passing `{}` or `FULL_CAPABILITIES` reproduces the default
 * `FORMLOOM_SYSTEM_PROMPT` byte-for-byte (asserted in tests).
 */
export function buildSystemPrompt(caps: FormloomCapabilities = {}): string {
  const allowedTypes = new Set(caps.fieldTypes ?? FIELD_TYPE_ORDER);
  const features = resolveFeatures(caps);

  const parts: string[] = [PROMPT_INTRO];

  // Field types header + bullets
  const bullets: string[] = [];
  for (const t of FIELD_TYPE_ORDER) {
    if (allowedTypes.has(t)) bullets.push(FIELD_TYPE_BULLETS[t]);
  }
  if (bullets.length > 0) {
    parts.push(`${PROMPT_FIELD_TYPES_HEADER}\n\n${bullets.join("\n")}`);
  }

  if (features.showIf) parts.push(SECTION_SHOWIF);
  if (features.sections) parts.push(SECTION_SECTIONS);
  if (features.optionDescriptions) parts.push(SECTION_OPTION_DESCRIPTIONS);
  if (features.allowCustom) parts.push(SECTION_ALLOW_CUSTOM);

  parts.push(renderHintsSection(caps.variants));
  parts.push(RULES);

  return parts.join("\n\n");
}

/**
 * Text-mode prompt variant. Teaches the model to emit a fenced JSON block
 * instead of calling the tool. Capabilities flow through to the embedded
 * system prompt exactly as in `buildSystemPrompt`.
 */
export function buildTextPrompt(caps: FormloomCapabilities = {}): string {
  const body = buildSystemPrompt(caps).replace(
    "## Structured Form Generation (Formloom)\n\n",
    "",
  );
  return `## Structured Form Generation (Formloom — text mode)

When you need to collect structured information, emit a JSON schema inside a code fence tagged \`\`\`formloom. Do not use the formloom_collect tool; do not call any other tool; do not wrap the JSON in prose. The rendering layer will extract the block, validate it, and present a form.

${body}

### Example output

\`\`\`formloom
{
  "version": "1.2",
  "title": "Contact",
  "fields": [
    { "id": "email", "type": "text", "label": "Email", "validation": { "required": true } }
  ]
}
\`\`\``;
}
