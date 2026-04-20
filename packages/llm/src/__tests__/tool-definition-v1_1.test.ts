import { describe, it, expect } from "vitest";
import {
  FORMLOOM_TOOL_OPENAI,
  FORMLOOM_TOOL_ANTHROPIC,
  FORMLOOM_TOOL_GEMINI,
  FORMLOOM_TOOL_MISTRAL,
  FORMLOOM_TOOL_OLLAMA,
  FORMLOOM_RESPONSE_FORMAT_OPENAI,
} from "../tool-definition";
import { FORMLOOM_PARAMETERS } from "../parameters";

describe("FORMLOOM_PARAMETERS (v1.1)", () => {
  it("includes number and file in the type enum", () => {
    const typeEnum = FORMLOOM_PARAMETERS.properties.fields.items.properties.type
      .enum as readonly string[];
    expect(typeEnum).toContain("number");
    expect(typeEnum).toContain("file");
  });

  it("accepts both 1.0 and 1.1 versions", () => {
    const enumValues = FORMLOOM_PARAMETERS.properties.version
      .enum as readonly string[];
    expect(enumValues).toContain("1.0");
    expect(enumValues).toContain("1.1");
  });

  it("documents showIf", () => {
    expect(
      FORMLOOM_PARAMETERS.properties.fields.items.properties,
    ).toHaveProperty("showIf");
  });

  it("documents sections at the top level", () => {
    expect(FORMLOOM_PARAMETERS.properties).toHaveProperty("sections");
  });

  it("documents number-specific validation keywords", () => {
    const validationProps =
      FORMLOOM_PARAMETERS.properties.fields.items.properties.validation
        .properties;
    expect(validationProps).toHaveProperty("min");
    expect(validationProps).toHaveProperty("max");
    expect(validationProps).toHaveProperty("step");
    expect(validationProps).toHaveProperty("integer");
  });

  it("documents file-specific keywords", () => {
    const fieldProps =
      FORMLOOM_PARAMETERS.properties.fields.items.properties;
    expect(fieldProps).toHaveProperty("accept");
    expect(fieldProps).toHaveProperty("maxSizeBytes");
  });
});

describe("FORMLOOM_TOOL_GEMINI", () => {
  it("exposes a functionDeclarations array with one entry", () => {
    expect(FORMLOOM_TOOL_GEMINI.functionDeclarations).toHaveLength(1);
    expect(FORMLOOM_TOOL_GEMINI.functionDeclarations[0].name).toBe(
      "formloom_collect",
    );
  });

  it("shares the parameters object", () => {
    expect(FORMLOOM_TOOL_GEMINI.functionDeclarations[0].parameters).toBe(
      FORMLOOM_PARAMETERS,
    );
  });
});

describe("FORMLOOM_TOOL_MISTRAL / FORMLOOM_TOOL_OLLAMA", () => {
  it("have independent identity from the OpenAI export", () => {
    expect(FORMLOOM_TOOL_MISTRAL).not.toBe(FORMLOOM_TOOL_OPENAI);
    expect(FORMLOOM_TOOL_OLLAMA).not.toBe(FORMLOOM_TOOL_OPENAI);
  });

  it("name the tool formloom_collect", () => {
    expect(FORMLOOM_TOOL_MISTRAL.function.name).toBe("formloom_collect");
    expect(FORMLOOM_TOOL_OLLAMA.function.name).toBe("formloom_collect");
  });
});

describe("FORMLOOM_RESPONSE_FORMAT_OPENAI", () => {
  it("wraps parameters in OpenAI's json_schema response_format shape", () => {
    expect(FORMLOOM_RESPONSE_FORMAT_OPENAI.type).toBe("json_schema");
    expect(FORMLOOM_RESPONSE_FORMAT_OPENAI.json_schema.name).toBe(
      "formloom_collect",
    );
    expect(FORMLOOM_RESPONSE_FORMAT_OPENAI.json_schema.schema).toBe(
      FORMLOOM_PARAMETERS,
    );
  });

  it("does not set strict mode — Formloom's schema uses open hints that strict rejects", () => {
    expect("strict" in FORMLOOM_RESPONSE_FORMAT_OPENAI.json_schema).toBe(false);
  });
});

describe("FORMLOOM_TOOL_ANTHROPIC still shares schema with OpenAI (regression)", () => {
  it("uses the same parameters object", () => {
    expect(FORMLOOM_TOOL_ANTHROPIC.input_schema).toBe(FORMLOOM_PARAMETERS);
    expect(FORMLOOM_TOOL_OPENAI.function.parameters).toBe(FORMLOOM_PARAMETERS);
  });
});
