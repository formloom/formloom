import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { parseFormloomResponse, formatSubmission } from "@formloom/llm";
import { useFormloom } from "@formloom/react";
import type { FormloomData, FormloomSchema } from "@formloom/schema";

/**
 * The full v1.1 round trip, stitched across schema + llm + react packages:
 *
 *   1. The LLM emits a tool call with arguments shaped like FormloomSchema.
 *   2. parseFormloomResponse validates and returns a typed schema.
 *   3. useFormloom renders state for the schema.
 *   4. User fills the form; handleSubmit produces FormloomData.
 *   5. formatSubmission wraps the data as a provider-specific tool response.
 *
 * Any cross-package drift shows up here.
 */

function simulatedOpenAIToolCall(schema: FormloomSchema) {
  return {
    id: "call_abc",
    type: "function" as const,
    function: {
      name: "formloom_collect",
      arguments: JSON.stringify(schema),
    },
  };
}

function simulatedAnthropicToolUse(schema: FormloomSchema) {
  return {
    type: "tool_use" as const,
    id: "toolu_xyz",
    name: "formloom_collect",
    input: schema,
  };
}

describe("E2E: OpenAI tool-call round trip", () => {
  const schema: FormloomSchema = {
    version: "1.1",
    title: "Contact",
    fields: [
      { id: "name", type: "text", label: "Name", validation: { required: true } },
      {
        id: "age",
        type: "number",
        label: "Age",
        validation: { integer: true, min: 0, max: 120, required: true },
      },
    ],
  };

  it("parses -> renders -> submits -> formats", async () => {
    const toolCall = simulatedOpenAIToolCall(schema);

    // 1. Parse tool call arguments (OpenAI hands you a string).
    const parse = parseFormloomResponse(toolCall.function.arguments);
    expect(parse.success).toBe(true);
    expect(parse.schema?.version).toBe("1.1");

    // 2. Render into useFormloom.
    const onSubmit = vi.fn((_data: FormloomData): void => {});
    const { result } = renderHook(() =>
      useFormloom({ schema: parse.schema!, onSubmit }),
    );

    // 3. Simulate input + submit.
    act(() => {
      result.current.fields[0].onChange("Alice");
      result.current.fields[1].onChange(30);
    });
    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(onSubmit).toHaveBeenCalledWith({ name: "Alice", age: 30 });

    // 4. Wrap for OpenAI tool response.
    const wrapped = formatSubmission(onSubmit.mock.calls[0][0], {
      provider: "openai",
      toolCallId: toolCall.id,
    });
    if (wrapped.role !== "tool") throw new Error("unreachable");
    expect(wrapped.tool_call_id).toBe("call_abc");
    expect(JSON.parse(wrapped.content)).toEqual({ name: "Alice", age: 30 });
  });
});

describe("E2E: Anthropic tool_use round trip", () => {
  const schema: FormloomSchema = {
    version: "1.1",
    fields: [
      { id: "color", type: "radio", label: "Colour", options: [
        { value: "red", label: "Red" },
        { value: "blue", label: "Blue" },
      ], validation: { required: true } },
    ],
  };

  it("parses -> renders -> submits -> formats as tool_result", async () => {
    const toolUse = simulatedAnthropicToolUse(schema);

    // Anthropic tool_use.input arrives as an already-parsed object.
    const parse = parseFormloomResponse(toolUse.input);
    expect(parse.success).toBe(true);

    const onSubmit = vi.fn((_data: FormloomData): void => {});
    const { result } = renderHook(() =>
      useFormloom({ schema: parse.schema!, onSubmit }),
    );

    act(() => {
      result.current.fields[0].onChange("blue");
    });
    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(onSubmit).toHaveBeenCalledWith({ color: "blue" });

    const wrapped = formatSubmission(onSubmit.mock.calls[0][0], {
      provider: "anthropic",
      toolCallId: toolUse.id,
    });
    if (wrapped.role !== "user" || typeof wrapped.content === "string") {
      throw new Error("unreachable");
    }
    expect(wrapped.content).toHaveLength(1);
    expect(wrapped.content[0].type).toBe("tool_result");
    expect(wrapped.content[0].tool_use_id).toBe("toolu_xyz");
    expect(JSON.parse(wrapped.content[0].content)).toEqual({ color: "blue" });
  });
});

describe("E2E: showIf excludes hidden fields end-to-end", () => {
  const schema: FormloomSchema = {
    version: "1.1",
    fields: [
      { id: "country", type: "text", label: "Country", validation: { required: true } },
      {
        id: "state",
        type: "text",
        label: "State",
        validation: { required: true },
        showIf: { field: "country", equals: "US" },
      },
    ],
  };

  it("skips hidden-field requirement when visibility is false", async () => {
    const parse = parseFormloomResponse(schema);
    expect(parse.success).toBe(true);

    const onSubmit = vi.fn((_data: FormloomData): void => {});
    const { result } = renderHook(() =>
      useFormloom({ schema: parse.schema!, onSubmit }),
    );
    act(() => {
      result.current.fields[0].onChange("FR");
    });
    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(onSubmit).toHaveBeenCalledWith({ country: "FR" });
    const wrapped = formatSubmission(onSubmit.mock.calls[0][0], {
      provider: "openai",
      toolCallId: "x",
    });
    if (wrapped.role !== "tool") throw new Error("unreachable");
    expect(Object.keys(JSON.parse(wrapped.content))).toEqual(["country"]);
  });
});
