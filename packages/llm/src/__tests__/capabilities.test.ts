import { describe, it, expect } from "vitest";
import {
  FORMLOOM_SYSTEM_PROMPT,
  FORMLOOM_TEXT_PROMPT,
  buildSystemPrompt,
  buildTextPrompt,
} from "../prompt";
import { FORMLOOM_PARAMETERS, narrowParameters } from "../parameters";
import { createFormloomCapabilities } from "../capabilities";

// ---- Regression gates — zero-config must equal v1.2 defaults ----

describe("capabilities — zero-config regression", () => {
  it("buildSystemPrompt() === FORMLOOM_SYSTEM_PROMPT (byte-identical)", () => {
    expect(buildSystemPrompt()).toBe(FORMLOOM_SYSTEM_PROMPT);
  });

  it("buildSystemPrompt({}) === FORMLOOM_SYSTEM_PROMPT", () => {
    expect(buildSystemPrompt({})).toBe(FORMLOOM_SYSTEM_PROMPT);
  });

  it("buildTextPrompt() === FORMLOOM_TEXT_PROMPT (byte-identical)", () => {
    expect(buildTextPrompt()).toBe(FORMLOOM_TEXT_PROMPT);
  });

  it("narrowParameters() deep-equals FORMLOOM_PARAMETERS", () => {
    expect(narrowParameters()).toEqual(FORMLOOM_PARAMETERS);
  });

  it("narrowParameters({}) deep-equals FORMLOOM_PARAMETERS", () => {
    expect(narrowParameters({})).toEqual(FORMLOOM_PARAMETERS);
  });

  it("narrowParameters returns a fresh clone each call (never the canonical ref)", () => {
    expect(narrowParameters()).not.toBe(FORMLOOM_PARAMETERS);
  });
});

// ---- buildSystemPrompt narrowing ----

describe("buildSystemPrompt — narrowing", () => {
  it("omits field-type bullets outside the allowlist", () => {
    const prompt = buildSystemPrompt({ fieldTypes: ["text", "select"] });
    expect(prompt).toContain("- **text**");
    expect(prompt).toContain("- **select**");
    expect(prompt).not.toContain("- **file**");
    expect(prompt).not.toContain("- **date**");
    expect(prompt).not.toContain("- **number**");
    expect(prompt).not.toContain("- **radio**");
    expect(prompt).not.toContain("- **boolean**");
  });

  it("drops the showIf section when features.showIf is false", () => {
    const prompt = buildSystemPrompt({ features: { showIf: false } });
    expect(prompt).not.toContain("### Conditional fields");
    expect(prompt).not.toContain('"equals": "US"');
  });

  it("drops the sections section when features.sections is false", () => {
    const prompt = buildSystemPrompt({ features: { sections: false } });
    expect(prompt).not.toContain("### Sections");
  });

  it("drops option descriptions section when disabled", () => {
    const prompt = buildSystemPrompt({
      features: { optionDescriptions: false },
    });
    expect(prompt).not.toContain("### Option descriptions");
  });

  it("drops allowCustom section when disabled", () => {
    const prompt = buildSystemPrompt({ features: { allowCustom: false } });
    expect(prompt).not.toContain('### Custom values ("Other…")');
  });

  it("omits hints.variant line when variants === false", () => {
    const prompt = buildSystemPrompt({ variants: false });
    expect(prompt).not.toContain("hints.variant");
  });

  it("replaces the variant line with an explicit allowlist", () => {
    const prompt = buildSystemPrompt({ variants: ["combobox", "tool-select"] });
    expect(prompt).toContain(
      'hints.variant: one of "combobox" | "tool-select"',
    );
  });
});

// ---- narrowParameters ----

describe("narrowParameters — narrowing", () => {
  const fieldProps = (obj: unknown): Record<string, unknown> => {
    const out = obj as {
      properties?: {
        fields?: { items?: { properties?: Record<string, unknown> } };
      };
    };
    return out.properties?.fields?.items?.properties ?? {};
  };

  it("narrows fields.items.properties.type.enum to fieldTypes", () => {
    const narrowed = narrowParameters({ fieldTypes: ["text", "boolean"] });
    const typeNode = fieldProps(narrowed).type as { enum?: unknown[] };
    expect(typeNode.enum).toEqual(["text", "boolean"]);
  });

  it("removes showIf property when features.showIf is false", () => {
    const narrowed = narrowParameters({ features: { showIf: false } });
    expect("showIf" in fieldProps(narrowed)).toBe(false);
  });

  it("removes allowCustom / customLabel / customPlaceholder when allowCustom is false", () => {
    const narrowed = narrowParameters({ features: { allowCustom: false } });
    const props = fieldProps(narrowed);
    expect("allowCustom" in props).toBe(false);
    expect("customLabel" in props).toBe(false);
    expect("customPlaceholder" in props).toBe(false);
  });

  it("removes readOnly / disabled when features toggle them off", () => {
    const narrowed = narrowParameters({
      features: { readOnly: false, disabled: false },
    });
    const props = fieldProps(narrowed);
    expect("readOnly" in props).toBe(false);
    expect("disabled" in props).toBe(false);
  });

  it("removes option.description when optionDescriptions is false", () => {
    const narrowed = narrowParameters({
      features: { optionDescriptions: false },
    });
    const optionProps = (
      fieldProps(narrowed).options as {
        items?: { properties?: Record<string, unknown> };
      }
    ).items?.properties;
    expect("description" in (optionProps ?? {})).toBe(false);
  });

  it("removes top-level sections when features.sections is false", () => {
    const narrowed = narrowParameters({ features: { sections: false } });
    const root = narrowed as { properties: Record<string, unknown> };
    expect("sections" in root.properties).toBe(false);
  });

  it("pins hints.variant.enum when variants is an allowlist", () => {
    const narrowed = narrowParameters({ variants: ["combobox"] });
    const variantNode = (
      fieldProps(narrowed).hints as {
        properties?: { variant?: { enum?: unknown[] } };
      }
    ).properties?.variant;
    expect(variantNode?.enum).toEqual(["combobox"]);
  });

  it("removes hints.variant entirely when variants === false", () => {
    const narrowed = narrowParameters({ variants: false });
    const hintsProps = (
      fieldProps(narrowed).hints as { properties?: Record<string, unknown> }
    ).properties;
    expect("variant" in (hintsProps ?? {})).toBe(false);
  });
});

// ---- createFormloomCapabilities ----

describe("createFormloomCapabilities", () => {
  it("returns a bundle whose systemPrompt equals buildSystemPrompt(caps)", () => {
    const caps = { fieldTypes: ["text"] } as const;
    const bundle = createFormloomCapabilities(caps);
    expect(bundle.systemPrompt).toBe(buildSystemPrompt(caps));
    expect(bundle.textPrompt).toBe(buildTextPrompt(caps));
  });

  it("wraps the narrowed parameters into each provider tool definition (identity)", () => {
    const bundle = createFormloomCapabilities({ fieldTypes: ["text"] });
    const openaiTool = bundle.tool.openai as {
      function: { parameters: unknown };
    };
    expect(openaiTool.function.parameters).toBe(bundle.parameters);

    const anthropicTool = bundle.tool.anthropic as { input_schema: unknown };
    expect(anthropicTool.input_schema).toBe(bundle.parameters);

    const geminiTool = bundle.tool.gemini as {
      functionDeclarations: { parameters: unknown }[];
    };
    expect(geminiTool.functionDeclarations[0].parameters).toBe(
      bundle.parameters,
    );

    const responseFormat = bundle.responseFormat as {
      json_schema: { schema: unknown };
    };
    expect(responseFormat.json_schema.schema).toBe(bundle.parameters);
  });

  it("parse validates against the bundle's capabilities (strict)", () => {
    const bundle = createFormloomCapabilities({ fieldTypes: ["text"] });
    const result = bundle.parse({
      version: "1.2",
      fields: [
        { id: "a", type: "text", label: "A" },
        { id: "b", type: "file", label: "B" },
      ],
    });
    expect(result.success).toBe(false);
    expect(result.errors.some((e) => e.includes("file"))).toBe(true);
  });

  it("parse with forwardCompat lenient drops disallowed fields", () => {
    const bundle = createFormloomCapabilities({ fieldTypes: ["text"] });
    const result = bundle.parse(
      {
        version: "1.2",
        fields: [
          { id: "a", type: "text", label: "A" },
          { id: "b", type: "file", label: "B" },
        ],
      },
      { forwardCompat: "lenient" },
    );
    expect(result.success).toBe(true);
    expect(result.schema?.fields).toHaveLength(2);
  });

  it("round-trips its own declared capabilities (preserved on the bundle)", () => {
    const caps = {
      fieldTypes: ["text", "select"] as const,
      features: { showIf: false, allowCustom: true },
      variants: ["combobox"] as const,
    };
    const bundle = createFormloomCapabilities(caps);
    expect(bundle.capabilities).toBe(caps);
  });
});
