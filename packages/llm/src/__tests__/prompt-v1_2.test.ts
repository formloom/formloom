import { describe, it, expect } from "vitest";
import { FORMLOOM_SYSTEM_PROMPT } from "../prompt";
import { FORMLOOM_PARAMETERS } from "../parameters";

describe("FORMLOOM_SYSTEM_PROMPT (v1.2 additions)", () => {
  it("teaches option descriptions", () => {
    expect(FORMLOOM_SYSTEM_PROMPT).toMatch(/Option descriptions/i);
    expect(FORMLOOM_SYSTEM_PROMPT).toMatch(/description/);
  });

  it("teaches allowCustom with an example", () => {
    expect(FORMLOOM_SYSTEM_PROMPT).toMatch(/allowCustom/);
    expect(FORMLOOM_SYSTEM_PROMPT).toMatch(/Other/i);
  });

  it("documents hints.variant", () => {
    expect(FORMLOOM_SYSTEM_PROMPT).toMatch(/hints\.variant/);
  });

  it("bumps the authored schema version to 1.2", () => {
    expect(FORMLOOM_SYSTEM_PROMPT).toMatch(/version:\s*"1\.2"/);
  });
});

describe("FORMLOOM_PARAMETERS (v1.2 additions)", () => {
  const fieldProps = FORMLOOM_PARAMETERS.properties.fields.items.properties;

  it("accepts 1.2 in version enum", () => {
    expect(FORMLOOM_PARAMETERS.properties.version.enum).toContain("1.2");
  });

  it("advertises option.description in the options schema", () => {
    const optionProps = (fieldProps.options as { items: { properties: Record<string, unknown> } })
      .items.properties;
    expect(optionProps.description).toBeDefined();
  });

  it("includes allowCustom, customLabel, customPlaceholder on fields", () => {
    expect(fieldProps.allowCustom).toBeDefined();
    expect(fieldProps.customLabel).toBeDefined();
    expect(fieldProps.customPlaceholder).toBeDefined();
  });

  it("includes readOnly and disabled on fields", () => {
    expect(fieldProps.readOnly).toBeDefined();
    expect(fieldProps.disabled).toBeDefined();
  });

  it("documents hints.variant under hints", () => {
    const hintProps = (fieldProps.hints as { properties: Record<string, unknown> }).properties;
    expect(hintProps.variant).toBeDefined();
  });
});
