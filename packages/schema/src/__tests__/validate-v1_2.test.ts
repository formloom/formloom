import { describe, it, expect } from "vitest";
import { validateSchema } from "../validate";
import {
  isRadioCustomValue,
  resolveMultiSelectValue,
} from "../resolve-custom";
import type { FormloomSchema, RadioField, SelectField } from "../types";

function baseSchema(overrides: Partial<FormloomSchema> = {}): FormloomSchema {
  return {
    version: "1.2",
    fields: [{ id: "name", type: "text", label: "Name" }],
    ...overrides,
  };
}

describe("v1.2 — FieldOption.description (R1)", () => {
  it("accepts option description strings", () => {
    const result = validateSchema(
      baseSchema({
        fields: [
          {
            id: "freq",
            type: "radio",
            label: "Frequency",
            options: [
              {
                value: "hourly",
                label: "Hourly reports",
                description: "Brief status updates every hour during work hours",
              },
              { value: "eod", label: "End-of-day summary" },
            ],
          },
        ],
      }),
    );
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("rejects non-string option description with path", () => {
    const result = validateSchema(
      baseSchema({
        fields: [
          {
            id: "freq",
            type: "radio",
            label: "Frequency",
            options: [
              // @ts-expect-error — deliberately bad value
              { value: "hourly", label: "Hourly", description: 42 },
            ],
          },
        ],
      }),
    );
    expect(result.valid).toBe(false);
    expect(result.errors[0].path).toBe("fields[0].options[0].description");
  });
});

describe("v1.2 — allowCustom on radio and select (R2)", () => {
  it("accepts radio with allowCustom and custom input props", () => {
    const result = validateSchema(
      baseSchema({
        fields: [
          {
            id: "crm",
            type: "radio",
            label: "CRM",
            options: [
              { value: "salesforce", label: "Salesforce" },
              { value: "hubspot", label: "HubSpot" },
            ],
            allowCustom: true,
            customLabel: "Other CRM",
            customPlaceholder: "e.g. Zoho",
          },
        ],
      }),
    );
    expect(result.valid).toBe(true);
  });

  it("accepts multi-select with allowCustom", () => {
    const result = validateSchema(
      baseSchema({
        fields: [
          {
            id: "tools",
            type: "select",
            label: "Tools",
            multiple: true,
            options: [
              { value: "notion", label: "Notion" },
              { value: "linear", label: "Linear" },
            ],
            allowCustom: true,
          },
        ],
      }),
    );
    expect(result.valid).toBe(true);
  });

  it("rejects non-boolean allowCustom", () => {
    const result = validateSchema(
      baseSchema({
        fields: [
          {
            id: "crm",
            type: "radio",
            label: "CRM",
            options: [{ value: "sf", label: "SF" }],
            // @ts-expect-error
            allowCustom: "yes",
          },
        ],
      }),
    );
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.path === "fields[0].allowCustom")).toBe(
      true,
    );
  });

  it("rejects non-string customLabel", () => {
    const result = validateSchema(
      baseSchema({
        fields: [
          {
            id: "crm",
            type: "radio",
            label: "CRM",
            options: [{ value: "sf", label: "SF" }],
            allowCustom: true,
            // @ts-expect-error
            customLabel: 5,
          },
        ],
      }),
    );
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.path === "fields[0].customLabel")).toBe(
      true,
    );
  });
});

describe("v1.2 — resolveMultiSelectValue helper", () => {
  const field: SelectField = {
    id: "tags",
    type: "select",
    label: "Tags",
    multiple: true,
    options: [
      { value: "a", label: "Alpha" },
      { value: "b", label: "Beta" },
    ],
    allowCustom: true,
  };

  it("splits a mixed array into selected and custom", () => {
    expect(resolveMultiSelectValue(field, ["a", "zoho", "b", "other"])).toEqual(
      { selected: ["a", "b"], custom: ["zoho", "other"] },
    );
  });

  it("preserves input order within each bucket", () => {
    expect(resolveMultiSelectValue(field, ["zoho", "a"])).toEqual({
      selected: ["a"],
      custom: ["zoho"],
    });
  });

  it("ignores non-string entries", () => {
    expect(resolveMultiSelectValue(field, ["a", 42, null, "x"])).toEqual({
      selected: ["a"],
      custom: ["x"],
    });
  });
});

describe("v1.2 — isRadioCustomValue helper", () => {
  const field: RadioField = {
    id: "crm",
    type: "radio",
    label: "CRM",
    options: [
      { value: "salesforce", label: "Salesforce" },
      { value: "hubspot", label: "HubSpot" },
    ],
    allowCustom: true,
  };

  it("returns false when value is in options", () => {
    expect(isRadioCustomValue(field, "salesforce")).toBe(false);
  });

  it("returns true when value is freeform", () => {
    expect(isRadioCustomValue(field, "zoho")).toBe(true);
  });

  it("returns false for null / empty", () => {
    expect(isRadioCustomValue(field, null)).toBe(false);
    expect(isRadioCustomValue(field, "")).toBe(false);
  });
});

describe("v1.2 — hints.variant (R3)", () => {
  it("accepts a string variant hint", () => {
    const result = validateSchema(
      baseSchema({
        fields: [
          {
            id: "tools",
            type: "select",
            label: "Tools",
            multiple: true,
            options: [{ value: "a", label: "A" }],
            hints: { variant: "tool-select" },
          },
        ],
      }),
    );
    expect(result.valid).toBe(true);
  });

  it("rejects non-string variant", () => {
    const result = validateSchema(
      baseSchema({
        fields: [
          {
            id: "tools",
            type: "select",
            label: "Tools",
            options: [{ value: "a", label: "A" }],
            // @ts-expect-error
            hints: { variant: 7 },
          },
        ],
      }),
    );
    expect(result.valid).toBe(false);
    expect(
      result.errors.some((e) => e.path === "fields[0].hints.variant"),
    ).toBe(true);
  });

  it("passes through unknown hint keys without error", () => {
    const result = validateSchema(
      baseSchema({
        fields: [
          {
            id: "name",
            type: "text",
            label: "Name",
            hints: { variant: "custom", someHostKey: "anything" },
          },
        ],
      }),
    );
    expect(result.valid).toBe(true);
  });
});

describe("v1.2 — readOnly and disabled (R6)", () => {
  it("accepts booleans on BaseField", () => {
    const result = validateSchema(
      baseSchema({
        fields: [
          { id: "a", type: "text", label: "A", readOnly: true },
          { id: "b", type: "text", label: "B", disabled: true },
          { id: "c", type: "text", label: "C", readOnly: false, disabled: false },
        ],
      }),
    );
    expect(result.valid).toBe(true);
  });

  it("rejects non-boolean readOnly", () => {
    const result = validateSchema(
      baseSchema({
        fields: [
          // @ts-expect-error
          { id: "a", type: "text", label: "A", readOnly: "yes" },
        ],
      }),
    );
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.path === "fields[0].readOnly")).toBe(
      true,
    );
  });

  it("rejects non-boolean disabled", () => {
    const result = validateSchema(
      baseSchema({
        fields: [
          // @ts-expect-error
          { id: "a", type: "text", label: "A", disabled: 1 },
        ],
      }),
    );
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.path === "fields[0].disabled")).toBe(
      true,
    );
  });
});

describe("v1.2 — schema version", () => {
  it("accepts 1.2 schemas", () => {
    const result = validateSchema(baseSchema({ version: "1.2" }));
    expect(result.valid).toBe(true);
  });

  it("still accepts 1.0 and 1.1 schemas (backward compat)", () => {
    expect(validateSchema(baseSchema({ version: "1.0" })).valid).toBe(true);
    expect(validateSchema(baseSchema({ version: "1.1" })).valid).toBe(true);
  });
});
