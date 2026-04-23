import type { FormloomCapabilities, FormloomSchema } from "@formloom/schema";
import { validateSchema } from "@formloom/schema";

export interface ParseResult {
  success: boolean;
  schema: FormloomSchema | null;
  errors: string[];
}

/**
 * Optional parser tuning. When `capabilities` is provided, the extracted
 * schema is also validated against the per-surface subset declared by the
 * host. `forwardCompat` is passed straight through to {@link validateSchema}.
 */
export interface ParseOptions {
  forwardCompat?: "strict" | "lenient";
  capabilities?: FormloomCapabilities;
}

/**
 * Extracts and validates a Formloom schema from LLM output.
 *
 * Handles five input shapes, in order of preference:
 *   1. A plain object (already-parsed tool call args).
 *   2. A JSON string passed directly as the tool call arguments.
 *   3. A ```formloom fenced block inside a prose response (preferred when
 *      the text prompt is used).
 *   4. A ```json fenced block, or an unlabelled ``` block, as a fallback.
 *   5. The first `{ ... }` block in free-form prose — last-resort fallback
 *      for models that ignore the code-fence instructions.
 */
export function parseFormloomResponse(
  input: unknown,
  opts: ParseOptions = {},
): ParseResult {
  if (input !== null && typeof input === "object" && !Array.isArray(input)) {
    return validateAndReturn(input, opts);
  }

  if (typeof input === "string") {
    const extracted = extractJSON(input);
    if (extracted !== null) {
      return validateAndReturn(extracted, opts);
    }
    return {
      success: false,
      schema: null,
      errors: ["Could not extract valid JSON from the LLM response string."],
    };
  }

  return {
    success: false,
    schema: null,
    errors: [
      `Unexpected input type: ${typeof input}. Expected object or string.`,
    ],
  };
}

const FENCED_BLOCK_PATTERN = "```(formloom|json)?[ \\t]*\\r?\\n?([\\s\\S]*?)```";

function extractJSON(text: string): unknown | null {
  const fenced = extractPreferredFence(text);
  if (fenced !== null) {
    const parsed = tryParse(fenced);
    if (parsed !== null) return parsed;
  }

  const braceStart = text.indexOf("{");
  const braceEnd = text.lastIndexOf("}");
  if (braceStart !== -1 && braceEnd > braceStart) {
    const parsed = tryParse(text.slice(braceStart, braceEnd + 1));
    if (parsed !== null) return parsed;
  }

  return null;
}

function extractPreferredFence(text: string): string | null {
  // Fresh regex per call — stateful globals leak lastIndex across callers.
  const re = new RegExp(FENCED_BLOCK_PATTERN, "g");

  let firstFormloom: string | null = null;
  let firstJson: string | null = null;
  let firstAny: string | null = null;

  for (;;) {
    const match = re.exec(text);
    if (match === null) break;
    const tag = match[1] ?? "";
    const body = match[2].trim();
    if (tag === "formloom" && firstFormloom === null) firstFormloom = body;
    else if (tag === "json" && firstJson === null) firstJson = body;
    else if (tag === "" && firstAny === null) firstAny = body;
  }

  return firstFormloom ?? firstJson ?? firstAny;
}

function tryParse(body: string): unknown | null {
  try {
    return JSON.parse(body);
  } catch {
    return null;
  }
}

function validateAndReturn(obj: unknown, opts: ParseOptions): ParseResult {
  const result = validateSchema(obj, {
    forwardCompat: opts.forwardCompat,
    capabilities: opts.capabilities,
  });
  if (result.valid) {
    return { success: true, schema: obj as FormloomSchema, errors: [] };
  }
  return {
    success: false,
    schema: null,
    errors: result.errors.map((e) => `${e.path}: ${e.message}`),
  };
}
