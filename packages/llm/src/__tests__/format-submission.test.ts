import { describe, it, expect } from "vitest";
import {
  formatSubmission,
  formatSubmissionError,
} from "../format-submission";

describe("formatSubmission - OpenAI envelope", () => {
  it("produces { role, tool_call_id, content } with JSON string", () => {
    const msg = formatSubmission(
      { name: "Alice", age: 30 },
      { provider: "openai", toolCallId: "call_abc" },
    );
    expect(msg.role).toBe("tool");
    if (msg.role !== "tool") throw new Error("unreachable");
    expect(msg.tool_call_id).toBe("call_abc");
    expect(JSON.parse(msg.content)).toEqual({ name: "Alice", age: 30 });
  });

  it("throws when toolCallId is missing", () => {
    expect(() =>
      formatSubmission({}, { provider: "openai" }),
    ).toThrow(/toolCallId is required/);
  });
});

describe("formatSubmission - Anthropic envelope", () => {
  it("produces { role: user, content: [tool_result] }", () => {
    const msg = formatSubmission(
      { name: "Alice" },
      { provider: "anthropic", toolCallId: "toolu_123" },
    );
    expect(msg.role).toBe("user");
    if (msg.role !== "user" || typeof msg.content === "string")
      throw new Error("unreachable");
    expect(msg.content).toHaveLength(1);
    expect(msg.content[0].type).toBe("tool_result");
    expect(msg.content[0].tool_use_id).toBe("toolu_123");
    expect(JSON.parse(msg.content[0].content)).toEqual({ name: "Alice" });
  });
});

describe("formatSubmission - generic envelope", () => {
  it("produces { role: user, content: string } with no toolCallId needed", () => {
    const msg = formatSubmission({ x: 1 }, { provider: "generic" });
    expect(msg.role).toBe("user");
    if (msg.role !== "user" || typeof msg.content !== "string")
      throw new Error("unreachable");
    expect(JSON.parse(msg.content)).toEqual({ x: 1 });
  });
});

describe("formatSubmission - attachFiles modes", () => {
  const data = {
    photo: {
      kind: "inline" as const,
      name: "a.png",
      mime: "image/png",
      size: 100,
      dataUrl: "data:image/png;base64,AAAA",
    },
  };

  it("inline-json (default) includes the data URL", () => {
    const msg = formatSubmission(data, {
      provider: "openai",
      toolCallId: "x",
    });
    if (msg.role !== "tool") throw new Error("unreachable");
    expect(msg.content).toContain("data:image/png;base64,AAAA");
  });

  it("omit replaces the data URL with a placeholder", () => {
    const msg = formatSubmission(data, {
      provider: "openai",
      toolCallId: "x",
      attachFiles: "omit",
    });
    if (msg.role !== "tool") throw new Error("unreachable");
    const parsed = JSON.parse(msg.content) as {
      photo: { dataUrl: string; name: string };
    };
    expect(parsed.photo.dataUrl).toBe("<omitted>");
    expect(parsed.photo.name).toBe("a.png");
  });
});

describe("formatSubmissionError", () => {
  it("emits validation error envelope", () => {
    const msg = formatSubmissionError(
      {
        kind: "validation",
        errors: [{ fieldId: "email", message: "required" }],
      },
      { provider: "openai", toolCallId: "x" },
    );
    if (msg.role !== "tool") throw new Error("unreachable");
    const parsed = JSON.parse(msg.content);
    expect(parsed.ok).toBe(false);
    expect(parsed.reason).toBe("validation");
    expect(parsed.detail).toHaveLength(1);
  });

  it("emits cancellation envelope", () => {
    const msg = formatSubmissionError(
      { kind: "cancelled", reason: "user closed form" },
      { provider: "anthropic", toolCallId: "x" },
    );
    if (msg.role !== "user" || typeof msg.content === "string")
      throw new Error("unreachable");
    const parsed = JSON.parse(msg.content[0].content);
    expect(parsed.ok).toBe(false);
    expect(parsed.reason).toBe("cancelled");
    expect(parsed.detail).toBe("user closed form");
  });

  it("emits timeout envelope", () => {
    const msg = formatSubmissionError(
      { kind: "timeout" },
      { provider: "generic" },
    );
    if (msg.role !== "user" || typeof msg.content !== "string")
      throw new Error("unreachable");
    const parsed = JSON.parse(msg.content);
    expect(parsed.reason).toBe("timeout");
  });
});
