import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useFormloom } from "../use-formloom";
import type { FormloomSchema } from "@formloom/schema";

// ---- R2: FieldProps.custom for allowCustom radio/select ----

describe("useFormloom — FieldProps.custom (R2)", () => {
  it("omits custom info when allowCustom is not set", () => {
    const schema: FormloomSchema = {
      version: "1.2",
      fields: [
        {
          id: "crm",
          type: "radio",
          label: "CRM",
          options: [{ value: "sf", label: "SF" }],
        },
      ],
    };
    const { result } = renderHook(() =>
      useFormloom({ schema, onSubmit: vi.fn() }),
    );
    expect(result.current.fields[0].custom).toBeUndefined();
  });

  it("surfaces custom info when allowCustom is true, flagging freeform values", () => {
    const schema: FormloomSchema = {
      version: "1.2",
      fields: [
        {
          id: "crm",
          type: "radio",
          label: "CRM",
          options: [
            { value: "sf", label: "Salesforce" },
            { value: "hs", label: "HubSpot" },
          ],
          allowCustom: true,
          customLabel: "Other CRM",
          customPlaceholder: "e.g. Zoho",
        },
      ],
    };
    const { result } = renderHook(() =>
      useFormloom({ schema, onSubmit: vi.fn() }),
    );
    const initial = result.current.fields[0].custom;
    expect(initial).toEqual({
      allowed: true,
      label: "Other CRM",
      placeholder: "e.g. Zoho",
      isCustomValue: false,
    });

    act(() => result.current.fields[0].onChange("sf"));
    expect(result.current.fields[0].custom?.isCustomValue).toBe(false);

    act(() => result.current.fields[0].onChange("zoho"));
    expect(result.current.fields[0].custom?.isCustomValue).toBe(true);
  });

  it("detects a mixed multi-select as a custom value", () => {
    const schema: FormloomSchema = {
      version: "1.2",
      fields: [
        {
          id: "tools",
          type: "select",
          label: "Tools",
          multiple: true,
          options: [{ value: "notion", label: "Notion" }],
          allowCustom: true,
        },
      ],
    };
    const { result } = renderHook(() =>
      useFormloom({ schema, onSubmit: vi.fn() }),
    );

    act(() => result.current.fields[0].onChange(["notion", "asana"]));
    expect(result.current.fields[0].custom?.isCustomValue).toBe(true);

    act(() => result.current.fields[0].onChange(["notion"]));
    expect(result.current.fields[0].custom?.isCustomValue).toBe(false);
  });
});

// ---- R5: onValueChange ----

describe("useFormloom — onValueChange (R5)", () => {
  const schema: FormloomSchema = {
    version: "1.2",
    fields: [
      { id: "a", type: "text", label: "A" },
      { id: "b", type: "text", label: "B" },
    ],
  };

  it("fires synchronously once per change with fieldId, value, and full data", () => {
    const onValueChange = vi.fn();
    const { result } = renderHook(() =>
      useFormloom({ schema, onSubmit: vi.fn(), onValueChange }),
    );

    act(() => result.current.fields[0].onChange("hello"));
    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange).toHaveBeenLastCalledWith(
      "a",
      "hello",
      expect.objectContaining({ a: "hello", b: null }),
    );

    act(() => result.current.fields[1].onChange("world"));
    expect(onValueChange).toHaveBeenCalledTimes(2);
    expect(onValueChange).toHaveBeenLastCalledWith(
      "b",
      "world",
      expect.objectContaining({ a: "hello", b: "world" }),
    );
  });

  it("does not fire on initial render", () => {
    const onValueChange = vi.fn();
    renderHook(() =>
      useFormloom({ schema, onSubmit: vi.fn(), onValueChange }),
    );
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it("does not fire on reset()", () => {
    const onValueChange = vi.fn();
    const { result } = renderHook(() =>
      useFormloom({ schema, onSubmit: vi.fn(), onValueChange }),
    );

    act(() => result.current.fields[0].onChange("x"));
    onValueChange.mockClear();

    act(() => result.current.reset());
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it("picks up the latest callback closure across renders", () => {
    const first = vi.fn();
    const second = vi.fn();
    const { result, rerender } = renderHook(
      ({ cb }: { cb: typeof first }) =>
        useFormloom({ schema, onSubmit: vi.fn(), onValueChange: cb }),
      { initialProps: { cb: first } },
    );

    act(() => result.current.fields[0].onChange("one"));
    expect(first).toHaveBeenCalledTimes(1);

    rerender({ cb: second });
    act(() => result.current.fields[0].onChange("two"));
    expect(second).toHaveBeenCalledTimes(1);
    expect(first).toHaveBeenCalledTimes(1);
  });
});

// ---- R6: readOnly / disabled ----

describe("useFormloom — readOnly and disabled (R6)", () => {
  const schema: FormloomSchema = {
    version: "1.2",
    fields: [
      { id: "a", type: "text", label: "A" },
      { id: "b", type: "text", label: "B", readOnly: true },
    ],
  };

  it("marks every field readOnly when hook option is true", () => {
    const { result } = renderHook(() =>
      useFormloom({ schema, onSubmit: vi.fn(), readOnly: true }),
    );
    expect(result.current.fields[0].state.readOnly).toBe(true);
    expect(result.current.fields[1].state.readOnly).toBe(true);
  });

  it("per-field readOnly overrides hook-level false", () => {
    const { result } = renderHook(() =>
      useFormloom({ schema, onSubmit: vi.fn() }),
    );
    expect(result.current.fields[0].state.readOnly).toBe(false);
    expect(result.current.fields[1].state.readOnly).toBe(true);
  });

  it("per-field readOnly: false overrides hook-level true", () => {
    const schemaWithOverride: FormloomSchema = {
      version: "1.2",
      fields: [{ id: "a", type: "text", label: "A", readOnly: false }],
    };
    const { result } = renderHook(() =>
      useFormloom({
        schema: schemaWithOverride,
        onSubmit: vi.fn(),
        readOnly: true,
      }),
    );
    expect(result.current.fields[0].state.readOnly).toBe(false);
  });

  it("handleSubmit is a no-op when hook readOnly is true", async () => {
    const onSubmit = vi.fn();
    const { result } = renderHook(() =>
      useFormloom({ schema, onSubmit, readOnly: true }),
    );
    await act(async () => {
      await result.current.handleSubmit();
    });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("handleSubmit is a no-op when hook disabled is true", async () => {
    const onSubmit = vi.fn();
    const { result } = renderHook(() =>
      useFormloom({ schema, onSubmit, disabled: true }),
    );
    await act(async () => {
      await result.current.handleSubmit();
    });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("ignores handleChange on readOnly field; isDirty stays false", () => {
    const onValueChange = vi.fn();
    const { result } = renderHook(() =>
      useFormloom({ schema, onSubmit: vi.fn(), onValueChange }),
    );
    // field "b" is readOnly via schema
    act(() => result.current.fields[1].onChange("tainted"));
    expect(result.current.data.b).toBeNull();
    expect(result.current.isDirty).toBe(false);
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it("ignores handleChange on disabled field", () => {
    const disabledSchema: FormloomSchema = {
      version: "1.2",
      fields: [{ id: "a", type: "text", label: "A", disabled: true }],
    };
    const { result } = renderHook(() =>
      useFormloom({ schema: disabledSchema, onSubmit: vi.fn() }),
    );
    act(() => result.current.fields[0].onChange("nope"));
    expect(result.current.data.a).toBeNull();
  });
});
