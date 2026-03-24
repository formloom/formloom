import { describe, it, expect } from "vitest";
import {
  FORMLOOM_TOOL_OPENAI,
  FORMLOOM_TOOL_ANTHROPIC,
} from "../tool-definition";
import { FIELD_TYPES } from "@formloom/schema";

describe("FORMLOOM_TOOL_OPENAI", () => {
  it("has correct structure", () => {
    expect(FORMLOOM_TOOL_OPENAI.type).toBe("function");
    expect(FORMLOOM_TOOL_OPENAI.function.name).toBe("formloom_collect");
    expect(typeof FORMLOOM_TOOL_OPENAI.function.description).toBe("string");
    expect(FORMLOOM_TOOL_OPENAI.function.parameters.type).toBe("object");
  });

  it("requires version and fields", () => {
    expect(FORMLOOM_TOOL_OPENAI.function.parameters.required).toContain(
      "version",
    );
    expect(FORMLOOM_TOOL_OPENAI.function.parameters.required).toContain(
      "fields",
    );
  });

  it("lists all field types in the type enum", () => {
    const fieldItems = FORMLOOM_TOOL_OPENAI.function.parameters.properties
      .fields.items as Record<string, unknown>;
    const props = fieldItems.properties as Record<
      string,
      Record<string, unknown>
    >;
    const typeEnum = props.type.enum as string[];
    for (const ft of FIELD_TYPES) {
      expect(typeEnum).toContain(ft);
    }
  });

  it("has required field properties: id, type, label", () => {
    const fieldItems = FORMLOOM_TOOL_OPENAI.function.parameters.properties
      .fields.items as Record<string, unknown>;
    const required = fieldItems.required as string[];
    expect(required).toContain("id");
    expect(required).toContain("type");
    expect(required).toContain("label");
  });
});

describe("FORMLOOM_TOOL_ANTHROPIC", () => {
  it("has correct structure", () => {
    expect(FORMLOOM_TOOL_ANTHROPIC.name).toBe("formloom_collect");
    expect(typeof FORMLOOM_TOOL_ANTHROPIC.description).toBe("string");
    expect(FORMLOOM_TOOL_ANTHROPIC.input_schema.type).toBe("object");
  });

  it("shares the same parameter schema as OpenAI format", () => {
    expect(FORMLOOM_TOOL_ANTHROPIC.input_schema).toBe(
      FORMLOOM_TOOL_OPENAI.function.parameters,
    );
  });
});
