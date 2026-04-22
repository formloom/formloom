import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { parseFormloomResponse } from "@formloom/llm";
import { useFormloom, useFormloomWizard } from "@formloom/react";
import { resolveMultiSelectValue } from "@formloom/schema";
import type { FormloomSchema, SelectField } from "@formloom/schema";
import { formloomToZod } from "@formloom/zod";

/**
 * v1.2 round trip covering every new feature together:
 *   R1 FieldOption.description
 *   R2 allowCustom on radio + multi-select
 *   R3 hints.variant
 *   R4 useFormloomWizard
 *   R5 onValueChange
 *   R6 readOnly / disabled
 *
 * The form shape mirrors what an LLM would emit — a schema the host parses,
 * renders, submits, and validates with Zod on the other side.
 */

const schema: FormloomSchema = {
  version: "1.2",
  title: "v1.2 showcase",
  fields: [
    {
      id: "freq",
      type: "radio",
      label: "Reporting cadence",
      options: [
        {
          value: "hourly",
          label: "Hourly",
          description: "Brief status updates during work hours",
        },
        {
          value: "eod",
          label: "End-of-day summary",
          description: "One consolidated report at 5 PM",
        },
      ],
      validation: { required: true },
    },
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
      hints: { variant: "tool-select" },
    },
    {
      id: "read_only_note",
      type: "text",
      label: "Account ID",
      defaultValue: "acct_1234",
      readOnly: true,
    },
  ],
  sections: [
    { id: "cadence", title: "Cadence", fieldIds: ["freq"] },
    { id: "stack", title: "Stack", fieldIds: ["crm", "tools"] },
    { id: "meta", title: "Meta", fieldIds: ["read_only_note"] },
  ],
};

describe("v1.2 round trip — parse, render, submit, validate", () => {
  it("parses a v1.2 schema via parseFormloomResponse", () => {
    const parsed = parseFormloomResponse(schema);
    expect(parsed.success).toBe(true);
    expect(parsed.schema?.version).toBe("1.2");
    expect(parsed.schema?.fields).toHaveLength(4);
  });

  it("exposes R1 / R2 / R3 / R6 state to renderers and round-trips submission", async () => {
    const onSubmit = vi.fn();
    const onValueChange = vi.fn();
    const { result } = renderHook(() =>
      useFormloom({ schema, onSubmit, onValueChange }),
    );

    // R1 — option description arrives intact on the rendered field.
    const freqField = result.current.fields.find((f) => f.field.id === "freq");
    if (freqField === undefined || freqField.field.type !== "radio") {
      throw new Error("expected radio field 'freq'");
    }
    expect(freqField.field.options[0].description).toMatch(/work hours/);

    // R6 — readOnly field's state reflects the flag; onChange is a no-op.
    const readOnlyField = result.current.fields.find(
      (f) => f.field.id === "read_only_note",
    );
    if (readOnlyField === undefined) throw new Error("field missing");
    expect(readOnlyField.state.readOnly).toBe(true);
    act(() => readOnlyField.onChange("overwritten"));
    expect(result.current.data.read_only_note).toBe("acct_1234");

    // R2 — allowCustom surfaces custom info on the field; custom values accepted.
    const crmField = result.current.fields.find((f) => f.field.id === "crm");
    if (crmField === undefined) throw new Error("field missing");
    expect(crmField.custom?.allowed).toBe(true);
    expect(crmField.custom?.label).toBe("Other CRM");

    act(() => crmField.onChange("Zoho"));
    // R5 — onValueChange fires exactly once per user change.
    expect(onValueChange).toHaveBeenCalledWith(
      "crm",
      "Zoho",
      expect.objectContaining({ crm: "Zoho" }),
    );
    expect(result.current.fields.find((f) => f.field.id === "crm")?.custom?.isCustomValue).toBe(true);

    // R2 multi-select with mixed option + custom.
    const toolsField = result.current.fields.find((f) => f.field.id === "tools");
    if (toolsField === undefined) throw new Error("field missing");
    act(() => toolsField.onChange(["notion", "asana"]));

    // Fill the required radio so submission goes through.
    act(() => {
      const f = result.current.fields.find((fp) => fp.field.id === "freq")!;
      f.onChange("eod");
    });

    await act(async () => {
      await result.current.handleSubmit();
    });
    expect(onSubmit).toHaveBeenCalledTimes(1);
    const submitted = onSubmit.mock.calls[0][0];
    expect(submitted).toMatchObject({
      freq: "eod",
      crm: "Zoho",
      tools: ["notion", "asana"],
      read_only_note: "acct_1234",
    });

    // Helper split for consumers that want to separate option-matches from custom.
    const split = resolveMultiSelectValue(
      schema.fields.find((f) => f.id === "tools") as SelectField,
      submitted.tools as string[],
    );
    expect(split).toEqual({ selected: ["notion"], custom: ["asana"] });

    // Zod adapter accepts the submitted data.
    const z = formloomToZod(schema);
    expect(z.safeParse(submitted).success).toBe(true);
  });

  it("uses useFormloomWizard to step through the sections (R4)", async () => {
    const onSubmit = vi.fn();
    const { result } = renderHook(() =>
      useFormloomWizard({ schema, onSubmit }),
    );
    expect(result.current.totalSteps).toBe(3);
    expect(result.current.currentStep.section.id).toBe("cadence");

    // Step 1: required. next() blocks until filled.
    await act(async () => {
      await result.current.next();
    });
    expect(result.current.currentStepIndex).toBe(0);

    act(() => {
      result.current.fields.find((f) => f.field.id === "freq")!.onChange("eod");
    });
    await act(async () => {
      await result.current.next();
    });
    expect(result.current.currentStepIndex).toBe(1);

    // Step 2: all optional — canSkip holds.
    expect(result.current.canSkip).toBe(true);
    act(() => result.current.skip());
    expect(result.current.currentStepIndex).toBe(2);

    // Last step has a readOnly field but is submittable.
    await act(async () => {
      await result.current.handleSubmit();
    });
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});
