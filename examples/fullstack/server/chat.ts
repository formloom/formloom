import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import {
  FORMLOOM_SYSTEM_PROMPT,
  FORMLOOM_TOOL_OPENAI,
  parseFormloomResponse,
} from "@formloom/llm";
import type { FormloomSchema } from "@formloom/schema";

export interface ChatResult {
  type: "text" | "form";
  text?: string;
  schema?: FormloomSchema;
  errors?: string[];
}

const SYSTEM_PROMPT = `You are a helpful assistant that collects structured information from users using forms.

When a user wants to do something that requires collecting information (booking, registration, feedback, contact details, orders, etc.), use the formloom_collect tool to present them with a structured form instead of asking one question at a time.

If the user is just chatting or asking questions that don't require data collection, respond normally with text.

${FORMLOOM_SYSTEM_PROMPT}`;

/**
 * Handle a chat message by sending it to GPT-5.2 via LangChain.
 *
 * GPT-5.2 is a reasoning model:
 * - No temperature parameter (not supported when reasoning is active)
 * - Uses reasoning_effort to control thinking depth
 * - useResponsesApi for proper reasoning support
 */
export async function handleChat(userMessage: string): Promise<ChatResult> {
  const llm = new ChatOpenAI({
    model: "gpt-5.2",
    // GPT-5.2 is a reasoning model - do NOT set temperature.
    // Use the Responses API for proper reasoning support.
    useResponsesApi: true,
  });

  // Bind the Formloom tool so the model can generate forms
  const llmWithTools = llm.bindTools([FORMLOOM_TOOL_OPENAI], {
    tool_choice: "auto",
  });

  const messages = [
    new SystemMessage(SYSTEM_PROMPT),
    new HumanMessage(userMessage),
  ];

  const response = await llmWithTools.invoke(messages, {
    // reasoning_effort controls how deeply the model thinks.
    // "low" keeps responses fast and cheap for this demo.
    // Options: "none", "low", "medium", "high", "xhigh"
    reasoning: { effort: "low" },
  });

  // Check if the model made a tool call
  if (response.tool_calls && response.tool_calls.length > 0) {
    const toolCall = response.tool_calls[0];

    if (toolCall.name === "formloom_collect") {
      const parseResult = parseFormloomResponse(toolCall.args);

      if (parseResult.success && parseResult.schema) {
        return {
          type: "form",
          schema: parseResult.schema,
        };
      }

      // Schema validation failed - return errors
      return {
        type: "text",
        text: "I tried to create a form but ran into an issue. Let me try asking you directly instead.",
        errors: parseResult.errors,
      };
    }
  }

  // No tool call - return the text response
  const content =
    typeof response.content === "string"
      ? response.content
      : JSON.stringify(response.content);

  return {
    type: "text",
    text: content,
  };
}
