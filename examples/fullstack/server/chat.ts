import { ChatOpenAI } from "@langchain/openai";
import {
  AIMessage,
  HumanMessage,
  SystemMessage,
  ToolMessage,
} from "@langchain/core/messages";
import {
  createFormloomCapabilities,
  formatSubmission,
} from "@formloom/llm";
import type { FormloomData, FormloomSchema } from "@formloom/schema";
import { formloomToZod } from "@formloom/zod";

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

/**
 * Per-surface capabilities for this chat. The profile tells the LLM what
 * the renderer supports, narrows the tool JSON Schema the provider enforces,
 * and gates schemas the LLM returns through the bundle's validator — one
 * declaration, three gates.
 */
const capabilities = createFormloomCapabilities({
  // The renderer supports every primitive, so fieldTypes is omitted (allow
  // all). Tighten this if you want to constrain a particular surface —
  // e.g. `fieldTypes: ["text", "select", "boolean"]` for a mobile intake.
  features: {
    // Enable everything by default. Flip these off for surfaces that
    // shouldn't get conditional visibility, file uploads, etc.
  },
  maxFields: 8, // Keep generated forms focused.
});

const SYSTEM_PROMPT = `You are a helpful assistant that collects structured information from users using forms.

When a user wants to do something that requires collecting information (booking, registration, feedback, contact details, orders, etc.), use the formloom_collect tool to present them with a structured form instead of asking one question at a time.

If the user is just chatting or asking questions that don't require data collection, respond normally with text.

${capabilities.systemPrompt}`;

function buildLLM(): ChatOpenAI {
  return new ChatOpenAI({
    model: "gpt-5.2",
    useResponsesApi: true,
  });
}

/** Initial turn: user types a prompt, the model may return text or a form. */
export async function handleChat(userMessage: string): Promise<ChatResult> {
  const llm = buildLLM();
  // LangChain's bindTools type is narrow; our bundle types `tool.openai` as
  // `unknown` to stay provider-agnostic. The runtime shape is identical to
  // the well-known openai tool format that LangChain accepts.
  const llmWithTools = llm.bindTools(
    [capabilities.tool.openai as Parameters<typeof llm.bindTools>[0][number]],
    { tool_choice: "auto" },
  );

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
      // Parse and validate against the same capabilities the prompt
      // advertised. Schemas that violate the profile are rejected here,
      // even if they passed the provider's tool-schema layer.
      const parseResult = capabilities.parse(toolCall.args);
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
 * Continuation turn: user submitted the form. We:
 *   1. Validate the submitted data server-side via @formloom/zod (the
 *      schema from the LLM is the contract; the Zod adapter enforces it
 *      independent of the client-side hook).
 *   2. Replay the short history (user prompt → assistant tool call →
 *      tool result via formatSubmission) so the model can reason about
 *      what it just collected.
 */
export async function handleFormSubmission(args: {
  originalUserMessage: string;
  toolCallId: string;
  schema: FormloomSchema;
  data: FormloomData;
}): Promise<ContinueResult> {
  // Server-side validation with the same schema the LLM emitted. This is
  // the second half of the contract: the client validates at the hook
  // layer, the server validates at the protocol layer, and drift cannot
  // sneak through because both read the same FormloomSchema.
  const zodSchema = formloomToZod(args.schema);
  const zodResult = zodSchema.safeParse(args.data);
  if (!zodResult.success) {
    const issues = zodResult.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    return {
      type: "text",
      text: `Your submission didn't pass server-side validation (${issues}). Please try again.`,
    };
  }

  const llm = buildLLM();
  // LangChain's bindTools type is narrow; our bundle types `tool.openai` as
  // `unknown` to stay provider-agnostic. The runtime shape is identical to
  // the well-known openai tool format that LangChain accepts.
  const llmWithTools = llm.bindTools(
    [capabilities.tool.openai as Parameters<typeof llm.bindTools>[0][number]],
    { tool_choice: "auto" },
  );

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
