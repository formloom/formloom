import { buildSystemPrompt, buildTextPrompt } from "./prompt-fragments";

/**
 * System prompt fragment that teaches an LLM how to generate Formloom schemas
 * via the formloom_collect tool.
 *
 * Usage:
 *   const systemPrompt = `You are a helpful assistant.\n\n${FORMLOOM_SYSTEM_PROMPT}`;
 *
 * Budget ~4 KB so the fragment stays prompt-cache-friendly across turns.
 * Equivalent to `buildSystemPrompt()` / `buildSystemPrompt(FULL_CAPABILITIES)`;
 * use the factory in @formloom/llm to get a narrowed variant for a specific
 * surface.
 */
export const FORMLOOM_SYSTEM_PROMPT = buildSystemPrompt();

/**
 * Prompt variant for models that lack tool-calling. Instructs the model to
 * emit a fenced JSON block that the `parseFormloomResponse` parser will
 * extract. Prefer this only when you cannot use tool-calling or the
 * OpenAI `response_format` equivalent.
 */
export const FORMLOOM_TEXT_PROMPT = buildTextPrompt();

export { buildSystemPrompt, buildTextPrompt } from "./prompt-fragments";
