import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useFormloom } from "../use-formloom";
import type { FormloomSchema } from "@formloom/schema";

function makeSchema(
  overrides: Partial<FormloomSchema> = {},
): FormloomSchema {
  return {
    version: "1.0",
    fields: [
      {
        id: "name",
        type: "text",
        label: "Name",
        validation: { required: true },
      },
      {
        id: "email",
        type: "text",
        label: "Email",
        placeholder: "you@example.com",
        validation: {
          required: true,
          pattern: "^[^@]+@[^@]+\\.[^@]+$",
          patternMessage: "Must be a valid email",
        },
      },
    ],
    ...overrides,
  };
}

describe("useFormloom", () => {
  it("initializes with null/empty values when no defaults", () => {
    const onSubmit = vi.fn();
    const { result } = renderHook(() =>
      useFormloom({ schema: makeSchema(), onSubmit }),
    );

    expect(result.current.data.name).toBeNull();
    expect(result.current.data.email).toBeNull();
    expect(result.current.fields).toHaveLength(2);
    expect(result.current.isDirty).toBe(false);
  });

  it("initializes with schema default values", () => {
    const schema: FormloomSchema = {
      version: "1.0",
      fields: [
        {
          id: "agree",
          type: "boolean",
          label: "Agree",
          defaultValue: true,
        },
        {
          id: "color",
          type: "radio",
          label: "Color",
          options: [
            { value: "red", label: "Red" },
            { value: "blue", label: "Blue" },
          ],
          defaultValue: "blue",
        },
      ],
    };
    const { result } = renderHook(() =>
      useFormloom({ schema, onSubmit: vi.fn() }),
    );

    expect(result.current.data.agree).toBe(true);
    expect(result.current.data.color).toBe("blue");
  });

  it("initializes with override values", () => {
    const { result } = renderHook(() =>
      useFormloom({
        schema: makeSchema(),
        onSubmit: vi.fn(),
        initialValues: { name: "Alice" },
      }),
    );

    expect(result.current.data.name).toBe("Alice");
    expect(result.current.data.email).toBeNull();
  });

  it("initializes select fields correctly", () => {
    const schema: FormloomSchema = {
      version: "1.0",
      fields: [
        {
          id: "single",
          type: "select",
          label: "Single",
          options: [{ value: "a", label: "A" }],
        },
        {
          id: "multi",
          type: "select",
          label: "Multi",
          options: [{ value: "a", label: "A" }],
          multiple: true,
        },
      ],
    };
    const { result } = renderHook(() =>
      useFormloom({ schema, onSubmit: vi.fn() }),
    );

    expect(result.current.data.single).toBeNull();
    expect(result.current.data.multi).toEqual([]);
  });

  it("updates data on field change", () => {
    const { result } = renderHook(() =>
      useFormloom({ schema: makeSchema(), onSubmit: vi.fn() }),
    );

    act(() => {
      result.current.fields[0].onChange("Bob");
    });

    expect(result.current.data.name).toBe("Bob");
  });

  it("marks field as touched on blur", () => {
    const { result } = renderHook(() =>
      useFormloom({ schema: makeSchema(), onSubmit: vi.fn() }),
    );

    expect(result.current.fields[0].state.touched).toBe(false);

    act(() => {
      result.current.fields[0].onBlur();
    });

    expect(result.current.fields[0].state.touched).toBe(true);
    expect(result.current.isDirty).toBe(true);
  });

  it("validates required field on blur", () => {
    const { result } = renderHook(() =>
      useFormloom({ schema: makeSchema(), onSubmit: vi.fn() }),
    );

    act(() => {
      result.current.fields[0].onBlur();
    });

    expect(result.current.fields[0].state.error).toBe("Name is required");
    expect(result.current.fields[0].state.isValid).toBe(false);
  });

  it("validates pattern on blur", () => {
    const { result } = renderHook(() =>
      useFormloom({ schema: makeSchema(), onSubmit: vi.fn() }),
    );

    act(() => {
      result.current.fields[1].onChange("not-an-email");
    });
    act(() => {
      result.current.fields[1].onBlur();
    });

    expect(result.current.fields[1].state.error).toBe(
      "Must be a valid email",
    );
  });

  it("clears error when value is corrected", () => {
    const { result } = renderHook(() =>
      useFormloom({ schema: makeSchema(), onSubmit: vi.fn() }),
    );

    // Trigger error
    act(() => {
      result.current.fields[0].onBlur();
    });
    expect(result.current.fields[0].state.error).toBeTruthy();

    // Fix it
    act(() => {
      result.current.fields[0].onChange("Alice");
    });
    expect(result.current.fields[0].state.error).toBeNull();
  });

  it("calls onSubmit with valid data", () => {
    const onSubmit = vi.fn();
    const { result } = renderHook(() =>
      useFormloom({ schema: makeSchema(), onSubmit }),
    );

    act(() => {
      result.current.fields[0].onChange("Alice");
      result.current.fields[1].onChange("alice@example.com");
    });
    act(() => {
      result.current.handleSubmit();
    });

    expect(onSubmit).toHaveBeenCalledWith({
      name: "Alice",
      email: "alice@example.com",
    });
  });

  it("calls onError and touches all fields on invalid submit", () => {
    const onSubmit = vi.fn();
    const onError = vi.fn();
    const { result } = renderHook(() =>
      useFormloom({ schema: makeSchema(), onSubmit, onError }),
    );

    act(() => {
      result.current.handleSubmit();
    });

    expect(onSubmit).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ fieldId: "name" }),
        expect.objectContaining({ fieldId: "email" }),
      ]),
    );

    // All fields should now be touched
    expect(result.current.fields[0].state.touched).toBe(true);
    expect(result.current.fields[1].state.touched).toBe(true);
  });

  it("resets form to defaults", () => {
    const { result } = renderHook(() =>
      useFormloom({ schema: makeSchema(), onSubmit: vi.fn() }),
    );

    act(() => {
      result.current.fields[0].onChange("Alice");
      result.current.fields[0].onBlur();
    });

    expect(result.current.data.name).toBe("Alice");
    expect(result.current.isDirty).toBe(true);

    act(() => {
      result.current.reset();
    });

    expect(result.current.data.name).toBeNull();
    expect(result.current.isDirty).toBe(false);
    expect(result.current.errors).toHaveLength(0);
  });

  it("getField returns correct field by id", () => {
    const { result } = renderHook(() =>
      useFormloom({ schema: makeSchema(), onSubmit: vi.fn() }),
    );

    const field = result.current.getField("email");
    expect(field).toBeDefined();
    expect(field!.field.id).toBe("email");
  });

  it("getField returns undefined for non-existent id", () => {
    const { result } = renderHook(() =>
      useFormloom({ schema: makeSchema(), onSubmit: vi.fn() }),
    );

    expect(result.current.getField("nonexistent")).toBeUndefined();
  });

  it("isValid starts as true (no errors yet)", () => {
    const { result } = renderHook(() =>
      useFormloom({ schema: makeSchema(), onSubmit: vi.fn() }),
    );
    expect(result.current.isValid).toBe(true);
  });

  it("isValid becomes false after failed validation", () => {
    const { result } = renderHook(() =>
      useFormloom({ schema: makeSchema(), onSubmit: vi.fn() }),
    );

    act(() => {
      result.current.handleSubmit();
    });

    expect(result.current.isValid).toBe(false);
  });

  it("skips pattern validation on empty non-required field", () => {
    const schema: FormloomSchema = {
      version: "1.0",
      fields: [
        {
          id: "website",
          type: "text",
          label: "Website",
          validation: {
            pattern: "^https://",
            patternMessage: "Must start with https://",
          },
        },
      ],
    };

    const { result } = renderHook(() =>
      useFormloom({ schema, onSubmit: vi.fn() }),
    );

    act(() => {
      result.current.fields[0].onBlur();
    });

    expect(result.current.fields[0].state.error).toBeNull();
  });
});
