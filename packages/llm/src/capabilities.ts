import type { FormloomCapabilities } from "@formloom/schema";
import { buildSystemPrompt, buildTextPrompt } from "./prompt-fragments";
import {
  FORMLOOM_TOOL_NAME,
  FORMLOOM_TOOL_DESCRIPTION,
  narrowParameters,
} from "./parameters";
import { parseFormloomResponse, type ParseResult } from "./parser";

/**
 * Bundle returned by {@link createFormloomCapabilities}. Every downstream
 * artifact the host calls (prompt, provider tools, response_format, parser)
 * is pre-narrowed to the declared capabilities.
 */
export interface FormloomCapabilitiesBundle {
  /** The capabilities passed to the factory (unchanged). */
  readonly capabilities: FormloomCapabilities;

  /** System prompt teaching only the allowed features. */
  readonly systemPrompt: string;

  /** Text-mode variant of the system prompt. */
  readonly textPrompt: string;

  /** Narrowed FORMLOOM_PARAMETERS JSON Schema. */
  readonly parameters: unknown;

  /** Provider-specific tool definitions wrapping `parameters`. */
  readonly tool: {
    readonly openai: unknown;
    readonly anthropic: unknown;
    readonly gemini: unknown;
    readonly mistral: unknown;
    readonly ollama: unknown;
  };

  /** OpenAI response_format wrapper using the narrowed parameters. */
  readonly responseFormat: unknown;

  /**
   * Parses an LLM response and validates the extracted schema against these
   * capabilities. Thin wrapper over {@link parseFormloomResponse} that
   * threads the capabilities + forwardCompat option into the validator.
   */
  readonly parse: (
    input: unknown,
    opts?: { forwardCompat?: "strict" | "lenient" },
  ) => ParseResult;
}

/**
 * Builds a per-surface capabilities bundle. One declaration drives the
 * system prompt, tool JSON Schema, and validator in lockstep so the LLM,
 * the provider's structured-output layer, and the parser all agree on what
 * may be emitted.
 *
 * Zero-config (`createFormloomCapabilities({})`) produces prompts and tool
 * schemas deep-equal to the top-level defaults in this package.
 */
export function createFormloomCapabilities(
  caps: FormloomCapabilities,
): FormloomCapabilitiesBundle {
  const systemPrompt = buildSystemPrompt(caps);
  const textPrompt = buildTextPrompt(caps);
  const parameters = narrowParameters(caps);

  const openaiTool = {
    type: "function" as const,
    function: {
      name: FORMLOOM_TOOL_NAME,
      description: FORMLOOM_TOOL_DESCRIPTION,
      parameters,
    },
  };
  const anthropicTool = {
    name: FORMLOOM_TOOL_NAME,
    description: FORMLOOM_TOOL_DESCRIPTION,
    input_schema: parameters,
  };
  const geminiTool = {
    functionDeclarations: [
      {
        name: FORMLOOM_TOOL_NAME,
        description: FORMLOOM_TOOL_DESCRIPTION,
        parameters,
      },
    ],
  };
  const mistralTool = {
    type: "function" as const,
    function: {
      name: FORMLOOM_TOOL_NAME,
      description: FORMLOOM_TOOL_DESCRIPTION,
      parameters,
    },
  };
  const ollamaTool = mistralTool;
  const responseFormat = {
    type: "json_schema" as const,
    json_schema: {
      name: FORMLOOM_TOOL_NAME,
      description: FORMLOOM_TOOL_DESCRIPTION,
      schema: parameters,
    },
  };

  const parse = (
    input: unknown,
    opts?: { forwardCompat?: "strict" | "lenient" },
  ): ParseResult => parseFormloomResponse(input, { ...opts, capabilities: caps });

  return {
    capabilities: caps,
    systemPrompt,
    textPrompt,
    parameters,
    tool: {
      openai: openaiTool,
      anthropic: anthropicTool,
      gemini: geminiTool,
      mistral: mistralTool,
      ollama: ollamaTool,
    },
    responseFormat,
    parse,
  };
}
