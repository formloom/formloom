import { FORMLOOM_TOOL_NAME } from "./parameters";

/**
 * Provider-specific `tool_choice` / `tool_choice`-equivalent values that
 * force the model to invoke `formloom_collect` on the current turn.
 *
 * Useful for "always present a form" endpoints where you don't want the
 * model to answer in prose. Pair with the matching tool definition.
 *
 * v1.1 ships helpers for OpenAI and Anthropic. Other providers'
 * tool-forcing patterns are documented in the package README.
 */
export const toolChoice = {
  /** OpenAI Chat Completions + Responses API tool-forcing shape. */
  openai: () => ({
    type: "function" as const,
    function: { name: FORMLOOM_TOOL_NAME },
  }),

  /** Anthropic Messages API tool-forcing shape. */
  anthropic: () => ({
    type: "tool" as const,
    name: FORMLOOM_TOOL_NAME,
  }),
};
