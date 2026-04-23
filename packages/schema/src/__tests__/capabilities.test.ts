import { describe, it, expect } from "vitest";
import { validateSchema } from "../validate";
import {
  FULL_CAPABILITIES,
  isFieldTypeAllowed,
  isVariantAllowed,
  resolveFeatures,
} from "../capabilities";
import type { FormloomSchema } from "../types";

function baseSchema(overrides: Partial<FormloomSchema> = {}): FormloomSchema {
  return {
    version: "1.2",
    fields: [{ id: "name", type: "text", label: "Name" }],
    ...overrides,
  };
}

// ---- Helpers (the pure ones) ----

describe("capabilities helpers", () => {
  it("resolveFeatures defaults every key to allowed when features omitted", () => {
    expect(resolveFeatures({})).toEqual({
      showIf: true,
      sections: true,
      allowCustom: true,
      optionDescriptions: true,
      readOnly: true,
      disabled: true,
    });
  });

  it("resolveFeatures forbids only keys explicitly set to false", () => {
    expect(
      resolveFeatures({ features: { showIf: false, sections: false } }),
    ).toEqual({
      showIf: false,
      sections: false,
      allowCustom: true,
      optionDescriptions: true,
      readOnly: true,
      disabled: true,
    });
  });

  it("isFieldTypeAllowed returns true when fieldTypes is omitted", () => {
    expect(isFieldTypeAllowed({}, "file")).toBe(true);
    expect(isFieldTypeAllowed({}, "text")).toBe(true);
  });

  it("isFieldTypeAllowed restricts to allowlist when set", () => {
    expect(isFieldTypeAllowed({ fieldTypes: ["text"] }, "text")).toBe(true);
    expect(isFieldTypeAllowed({ fieldTypes: ["text"] }, "file")).toBe(false);
  });

  it("isVariantAllowed obeys the three variant policies", () => {
    expect(isVariantAllowed({}, "combobox")).toBe(true);
    expect(isVariantAllowed({ variants: false }, "combobox")).toBe(false);
    expect(
      isVariantAllowed({ variants: ["combobox"] }, "combobox"),
    ).toBe(true);
    expect(
      isVariantAllowed({ variants: ["combobox"] }, "agent-picker"),
    ).toBe(false);
  });

  it("FULL_CAPABILITIES is frozen and empty (allow-all default)", () => {
    expect(Object.keys(FULL_CAPABILITIES)).toHaveLength(0);
    expect(Object.isFrozen(FULL_CAPABILITIES)).toBe(true);
  });
});

// ---- Regression: omit capabilities = v1.2 behavior ----

describe("capabilities — zero-config regression", () => {
  it("omitting capabilities validates identically to v1.2", () => {
    const schema = baseSchema({
      fields: [
        { id: "any", type: "file", label: "File", accept: "*/*" },
      ],
    });
    const before = validateSchema(schema);
    const after = validateSchema(schema, {});
    expect(before.valid).toBe(after.valid);
    expect(before.errors).toEqual(after.errors);
  });

  it("empty capabilities object is equivalent to omitting it", () => {
    const schema = baseSchema({
      fields: [{ id: "a", type: "file", label: "A" }],
    });
    const withEmpty = validateSchema(schema, { capabilities: {} });
    expect(withEmpty.valid).toBe(true);
  });
});

// ---- fieldTypes ----

describe("capabilities.fieldTypes", () => {
  const fileFieldSchema = baseSchema({
    fields: [
      { id: "name", type: "text", label: "Name" },
      { id: "doc", type: "file", label: "Doc" },
    ],
  });

  it("strict mode: disallowed field type produces an error with path", () => {
    const result = validateSchema(fileFieldSchema, {
      capabilities: { fieldTypes: ["text"] },
    });
    expect(result.valid).toBe(false);
    expect(result.errors[0].path).toBe("fields[1].type");
    expect(result.errors[0].message).toMatch(/not allowed by capabilities.fieldTypes/);
  });

  it("lenient mode: disallowed field type is dropped with a warning", () => {
    const result = validateSchema(fileFieldSchema, {
      capabilities: { fieldTypes: ["text"] },
      forwardCompat: "lenient",
    });
    expect(result.valid).toBe(true);
    expect(result.droppedFields).toEqual(["doc"]);
    expect(result.warnings[0].path).toBe("fields[1].type");
  });
});

// ---- features.showIf ----

describe("capabilities.features.showIf", () => {
  const schema = baseSchema({
    fields: [
      { id: "a", type: "boolean", label: "A", defaultValue: false },
      {
        id: "b",
        type: "text",
        label: "B",
        showIf: { field: "a", equals: true },
      },
    ],
  });

  it("strict: showIf on a field errors when disabled", () => {
    const result = validateSchema(schema, {
      capabilities: { features: { showIf: false } },
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.path === "fields[1].showIf")).toBe(true);
  });

  it("lenient: showIf on a field warns when disabled", () => {
    const result = validateSchema(schema, {
      capabilities: { features: { showIf: false } },
      forwardCompat: "lenient",
    });
    expect(result.valid).toBe(true);
    expect(
      result.warnings.some((w) => w.path === "fields[1].showIf"),
    ).toBe(true);
  });
});

// ---- features.sections ----

describe("capabilities.features.sections", () => {
  const schema = baseSchema({
    fields: [{ id: "a", type: "text", label: "A" }],
    sections: [{ id: "s", fieldIds: ["a"] }],
  });

  it("strict: schema with sections errors when disabled", () => {
    const result = validateSchema(schema, {
      capabilities: { features: { sections: false } },
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.path === "sections")).toBe(true);
  });

  it("lenient: schema with sections warns when disabled", () => {
    const result = validateSchema(schema, {
      capabilities: { features: { sections: false } },
      forwardCompat: "lenient",
    });
    expect(result.valid).toBe(true);
    expect(result.warnings.some((w) => w.path === "sections")).toBe(true);
  });
});

// ---- features.allowCustom ----

describe("capabilities.features.allowCustom", () => {
  const schema = baseSchema({
    fields: [
      {
        id: "crm",
        type: "radio",
        label: "CRM",
        options: [{ value: "sf", label: "SF" }],
        allowCustom: true,
      },
    ],
  });

  it("strict: allowCustom errors when disabled", () => {
    const result = validateSchema(schema, {
      capabilities: { features: { allowCustom: false } },
    });
    expect(result.valid).toBe(false);
    expect(
      result.errors.some((e) => e.path === "fields[0].allowCustom"),
    ).toBe(true);
  });

  it("lenient: allowCustom warns when disabled", () => {
    const result = validateSchema(schema, {
      capabilities: { features: { allowCustom: false } },
      forwardCompat: "lenient",
    });
    expect(result.valid).toBe(true);
    expect(
      result.warnings.some((w) => w.path === "fields[0].allowCustom"),
    ).toBe(true);
  });
});

// ---- features.optionDescriptions ----

describe("capabilities.features.optionDescriptions", () => {
  const schema = baseSchema({
    fields: [
      {
        id: "freq",
        type: "radio",
        label: "Frequency",
        options: [
          { value: "hourly", label: "Hourly", description: "Every hour" },
          { value: "eod", label: "EOD" },
        ],
      },
    ],
  });

  it("strict: option descriptions error when disabled (path includes option index)", () => {
    const result = validateSchema(schema, {
      capabilities: { features: { optionDescriptions: false } },
    });
    expect(result.valid).toBe(false);
    expect(
      result.errors.some((e) => e.path === "fields[0].options[0].description"),
    ).toBe(true);
  });

  it("lenient: option descriptions warn when disabled", () => {
    const result = validateSchema(schema, {
      capabilities: { features: { optionDescriptions: false } },
      forwardCompat: "lenient",
    });
    expect(result.valid).toBe(true);
    expect(
      result.warnings.some(
        (w) => w.path === "fields[0].options[0].description",
      ),
    ).toBe(true);
  });
});

// ---- features.readOnly / features.disabled ----

describe("capabilities.features.readOnly and .disabled", () => {
  it("strict: readOnly on a field errors when disabled", () => {
    const schema = baseSchema({
      fields: [{ id: "a", type: "text", label: "A", readOnly: true }],
    });
    const result = validateSchema(schema, {
      capabilities: { features: { readOnly: false } },
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.path === "fields[0].readOnly")).toBe(true);
  });

  it("strict: disabled on a field errors when disabled", () => {
    const schema = baseSchema({
      fields: [{ id: "a", type: "text", label: "A", disabled: true }],
    });
    const result = validateSchema(schema, {
      capabilities: { features: { disabled: false } },
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.path === "fields[0].disabled")).toBe(true);
  });
});

// ---- variants ----

describe("capabilities.variants", () => {
  const schema = baseSchema({
    fields: [
      {
        id: "tools",
        type: "select",
        label: "Tools",
        multiple: true,
        options: [{ value: "a", label: "A" }],
        hints: { variant: "agent-picker" },
      },
    ],
  });

  it("omit = any variant passes", () => {
    const result = validateSchema(schema, { capabilities: {} });
    expect(result.valid).toBe(true);
  });

  it("allowlist: variant in list passes", () => {
    const result = validateSchema(schema, {
      capabilities: { variants: ["agent-picker"] },
    });
    expect(result.valid).toBe(true);
  });

  it("strict: allowlist with unlisted variant errors", () => {
    const result = validateSchema(schema, {
      capabilities: { variants: ["combobox"] },
    });
    expect(result.valid).toBe(false);
    expect(
      result.errors.some((e) => e.path === "fields[0].hints.variant"),
    ).toBe(true);
  });

  it("strict: variants === false errors on any variant", () => {
    const result = validateSchema(schema, {
      capabilities: { variants: false },
    });
    expect(result.valid).toBe(false);
    expect(
      result.errors.some((e) => e.path === "fields[0].hints.variant"),
    ).toBe(true);
  });

  it("lenient: disallowed variant warns instead of erroring", () => {
    const result = validateSchema(schema, {
      capabilities: { variants: false },
      forwardCompat: "lenient",
    });
    expect(result.valid).toBe(true);
    expect(
      result.warnings.some((w) => w.path === "fields[0].hints.variant"),
    ).toBe(true);
  });
});

// ---- maxFields / maxOptions ----

describe("capabilities.maxFields and .maxOptions", () => {
  it("strict: maxFields exceeded errors", () => {
    const schema = baseSchema({
      fields: [
        { id: "a", type: "text", label: "A" },
        { id: "b", type: "text", label: "B" },
        { id: "c", type: "text", label: "C" },
      ],
    });
    const result = validateSchema(schema, {
      capabilities: { maxFields: 2 },
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.path === "fields")).toBe(true);
  });

  it("lenient: maxFields exceeded warns", () => {
    const schema = baseSchema({
      fields: [
        { id: "a", type: "text", label: "A" },
        { id: "b", type: "text", label: "B" },
        { id: "c", type: "text", label: "C" },
      ],
    });
    const result = validateSchema(schema, {
      capabilities: { maxFields: 2 },
      forwardCompat: "lenient",
    });
    expect(result.valid).toBe(true);
    expect(result.warnings.some((w) => w.path === "fields")).toBe(true);
  });

  it("strict: maxOptions exceeded on a radio errors", () => {
    const schema = baseSchema({
      fields: [
        {
          id: "pick",
          type: "radio",
          label: "Pick",
          options: [
            { value: "a", label: "A" },
            { value: "b", label: "B" },
            { value: "c", label: "C" },
          ],
        },
      ],
    });
    const result = validateSchema(schema, {
      capabilities: { maxOptions: 2 },
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.path === "fields[0].options")).toBe(true);
  });

  it("lenient: maxOptions exceeded warns", () => {
    const schema = baseSchema({
      fields: [
        {
          id: "pick",
          type: "radio",
          label: "Pick",
          options: [
            { value: "a", label: "A" },
            { value: "b", label: "B" },
            { value: "c", label: "C" },
          ],
        },
      ],
    });
    const result = validateSchema(schema, {
      capabilities: { maxOptions: 2 },
      forwardCompat: "lenient",
    });
    expect(result.valid).toBe(true);
    expect(
      result.warnings.some((w) => w.path === "fields[0].options"),
    ).toBe(true);
  });
});
