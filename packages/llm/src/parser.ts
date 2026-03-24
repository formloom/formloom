import type { FormloomSchema } from "@formloom/schema";
import { validateSchema } from "@formloom/schema";

export interface ParseResult {
  success: boolean;
  schema: FormloomSchema | null;
  errors: string[];
}

/**
 * Extracts and validates a Formloom schema from LLM output.
 *
 * Handles:
 * 1. Direct object (already parsed tool call arguments)
 * 2. JSON string (raw text output)
 * 3. Markdown code block containing JSON
 * 4. JSON embedded in prose text
 */
export function parseFormloomResponse(input: unknown): ParseResult {
  if (input !== null && typeof input === "object" && !Array.isArray(input)) {
    return validateAndReturn(input);
  }

  if (typeof input === "string") {
    const extracted = extractJSON(input);
    if (extracted !== null) {
      return validateAndReturn(extracted);
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

function extractJSON(text: string): unknown | null {
  // Try markdown code block first
  const codeBlockMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)```/);
  if (codeBlockMatch) {
    try {
      return JSON.parse(codeBlockMatch[1].trim());
    } catch {
      // fall through
    }
  }

  // Try first { ... } block
  const braceStart = text.indexOf("{");
  const braceEnd = text.lastIndexOf("}");
  if (braceStart !== -1 && braceEnd > braceStart) {
    try {
      return JSON.parse(text.slice(braceStart, braceEnd + 1));
    } catch {
      // fall through
    }
  }

  return null;
}

function validateAndReturn(obj: unknown): ParseResult {
  const result = validateSchema(obj);
  if (result.valid) {
    return { success: true, schema: obj as FormloomSchema, errors: [] };
  }
  return {
    success: false,
    schema: null,
    errors: result.errors.map((e) => `${e.path}: ${e.message}`),
  };
}
