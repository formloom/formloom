import { ChatOpenAI } from "@langchain/openai";
import {
  AIMessage,
  HumanMessage,
  SystemMessage,
  ToolMessage,
} from "@langchain/core/messages";
import {
  FORMLOOM_SYSTEM_PROMPT,
  FORMLOOM_TOOL_OPENAI,
  formatSubmission,
  parseFormloomResponse,
} from "@formloom/llm";
import type { FormloomData, FormloomSchema } from "@formloom/schema";

export interface FormTurn {
  schema: FormloomSchema;
  toolCallId: string;
  originalUserMessage: string;
}

export interface ChatResult {
  type: "text" | "form";
  text?: string;
  schema?: FormloomSchema;
  toolCallId?: string;
  errors?: string[];
}

export interface ContinueResult {
  type: "text";
  text: string;
}

const SYSTEM_PROMPT = `You are a helpful assistant that collects structured information from users using forms.

When a user wants to do something that requires collecting information (booking, registration, feedback, contact details, orders, etc.), use the formloom_collect tool to present them with a structured form instead of asking one question at a time.

If the user is just chatting or asking questions that don't require data collection, respond normally with text.

${FORMLOOM_SYSTEM_PROMPT}`;

function buildLLM(): ChatOpenAI {
  return new ChatOpenAI({
    model: "gpt-5.2",
    useResponsesApi: true,
  });
}

/** Initial turn: user types a prompt, the model may return text or a form. */
export async function handleChat(userMessage: string): Promise<ChatResult> {
  const llm = buildLLM();
  const llmWithTools = llm.bindTools([FORMLOOM_TOOL_OPENAI], {
    tool_choice: "auto",
  });

  const messages = [
    new SystemMessage(SYSTEM_PROMPT),
    new HumanMessage(userMessage),
  ];

  const response = await llmWithTools.invoke(messages, {
    reasoning: { effort: "low" },
  });

  if (response.tool_calls !== undefined && response.tool_calls.length > 0) {
    const toolCall = response.tool_calls[0];
    if (toolCall.name === "formloom_collect") {
      const parseResult = parseFormloomResponse(toolCall.args);
      if (parseResult.success && parseResult.schema !== null) {
        return {
          type: "form",
          schema: parseResult.schema,
          toolCallId: toolCall.id ?? "",
        };
      }
      return {
        type: "text",
        text: "I tried to create a form but ran into an issue. Let me try asking you directly instead.",
        errors: parseResult.errors,
      };
    }
  }

  const content =
    typeof response.content === "string"
      ? response.content
      : JSON.stringify(response.content);
  return { type: "text", text: content };
}

/**
 * Continuation turn: user submitted the form. We replay the short history
 * (user prompt → assistant tool call → tool result formatted via
 * formatSubmission) so the model can reason about the structured data it
 * just collected.
 */
export async function handleFormSubmission(args: {
  originalUserMessage: string;
  toolCallId: string;
  schema: FormloomSchema;
  data: FormloomData;
}): Promise<ContinueResult> {
  const llm = buildLLM();
  const llmWithTools = llm.bindTools([FORMLOOM_TOOL_OPENAI], {
    tool_choice: "auto",
  });

  // Rebuild the assistant's original tool call so the tool_result has context.
  const assistantWithToolCall = new AIMessage({
    content: "",
    tool_calls: [
      {
        id: args.toolCallId,
        name: "formloom_collect",
        args: args.schema as unknown as Record<string, unknown>,
      },
    ],
  });

  const wrapped = formatSubmission(args.data, {
    provider: "openai",
    toolCallId: args.toolCallId,
  });
  if (wrapped.role !== "tool") {
    throw new Error("formatSubmission returned an unexpected envelope");
  }

  const toolMessage = new ToolMessage({
    content: wrapped.content,
    tool_call_id: wrapped.tool_call_id,
  });

  const response = await llmWithTools.invoke(
    [
      new SystemMessage(SYSTEM_PROMPT),
      new HumanMessage(args.originalUserMessage),
      assistantWithToolCall,
      toolMessage,
    ],
    { reasoning: { effort: "low" } },
  );

  const content =
    typeof response.content === "string"
      ? response.content
      : JSON.stringify(response.content);
  return { type: "text", text: content };
}
