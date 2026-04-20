import {
  FORMLOOM_PARAMETERS,
  FORMLOOM_TOOL_NAME,
  FORMLOOM_TOOL_DESCRIPTION,
} from "./parameters";

/** Formloom tool definition for OpenAI function calling. */
export const FORMLOOM_TOOL_OPENAI = {
  type: "function" as const,
  function: {
    name: FORMLOOM_TOOL_NAME,
    description: FORMLOOM_TOOL_DESCRIPTION,
    parameters: FORMLOOM_PARAMETERS,
  },
};

/** Formloom tool definition for Anthropic Claude tool_use. */
export const FORMLOOM_TOOL_ANTHROPIC = {
  name: FORMLOOM_TOOL_NAME,
  description: FORMLOOM_TOOL_DESCRIPTION,
  input_schema: FORMLOOM_PARAMETERS,
};

/**
 * Formloom tool definition for Google Gemini function declarations.
 *
 * Note: Gemini's response-schema dialect is a restricted subset of JSON Schema
 * (no additionalProperties, no anyOf/oneOf, limited `format` support). The
 * tool-definition dialect accepts the full parameters. If you need a
 * deterministic response_format on Gemini, translate via `toGeminiResponseSchema`
 * or use this tool with tool-choice forcing (see README recipes).
 *
 * v1.1 ships this as a lean export — provider-specific helpers
 * (tool_choice, formatSubmission paths) are OpenAI/Anthropic only and land
 * for Gemini in a later minor release.
 */
export const FORMLOOM_TOOL_GEMINI = {
  functionDeclarations: [
    {
      name: FORMLOOM_TOOL_NAME,
      description: FORMLOOM_TOOL_DESCRIPTION,
      parameters: FORMLOOM_PARAMETERS,
    },
  ],
};

/**
 * Formloom tool definition for Mistral function calling.
 * Structurally identical to OpenAI's — exported separately so identity stays
 * stable if Mistral's shape diverges.
 */
export const FORMLOOM_TOOL_MISTRAL = {
  type: "function" as const,
  function: {
    name: FORMLOOM_TOOL_NAME,
    description: FORMLOOM_TOOL_DESCRIPTION,
    parameters: FORMLOOM_PARAMETERS,
  },
};

/**
 * Formloom tool definition for Ollama function calling.
 * Structurally identical to OpenAI's — exported separately so identity stays
 * stable if Ollama's shape diverges.
 */
export const FORMLOOM_TOOL_OLLAMA = {
  type: "function" as const,
  function: {
    name: FORMLOOM_TOOL_NAME,
    description: FORMLOOM_TOOL_DESCRIPTION,
    parameters: FORMLOOM_PARAMETERS,
  },
};

/**
 * Formloom schema wrapped for OpenAI's `response_format: { type: "json_schema" }`.
 *
 * Use this for deterministic "always return a form" flows where the LLM
 * doesn't get to choose between tool-call and prose. Pair with a system prompt
 * that tells the model what form to produce.
 *
 * `strict` is deliberately omitted. OpenAI's strict structured-outputs mode
 * demands every object set `additionalProperties: false` and list every
 * property in `required`. Formloom's schema intentionally keeps `hints` open
 * (`additionalProperties: true`) so custom renderer hints can evolve without
 * a version bump, and its field objects list only the universally-required
 * `id`/`type`/`label` in `required` because what's required depends on the
 * primitive (`options` for radio, etc.). Running under non-strict mode, the
 * schema still guides generation; validation happens at
 * `parseFormloomResponse`.
 *
 * Example:
 *   await openai.chat.completions.create({
 *     model: "gpt-5.2",
 *     messages: [...],
 *     response_format: FORMLOOM_RESPONSE_FORMAT_OPENAI,
 *   });
 */
export const FORMLOOM_RESPONSE_FORMAT_OPENAI = {
  type: "json_schema" as const,
  json_schema: {
    name: FORMLOOM_TOOL_NAME,
    description: FORMLOOM_TOOL_DESCRIPTION,
    schema: FORMLOOM_PARAMETERS,
  },
};
