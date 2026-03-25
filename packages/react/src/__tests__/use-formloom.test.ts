import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useFormloom } from "../use-formloom";
import type { FormloomSchema } from "@formloom/schema";

function makeSchema(overrides: Partial<FormloomSchema> = {}): FormloomSchema {
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

describe("useFormloom — initialisation", () => {
  it("initialises with null/empty values when no defaults", () => {
    const { result } = renderHook(() =>
      useFormloom({ schema: makeSchema(), onSubmit: vi.fn() }),
    );

    expect(result.current.data.name).toBeNull();
    expect(result.current.data.email).toBeNull();
    expect(result.current.fields).toHaveLength(2);
    expect(result.current.isDirty).toBe(false);
    expect(result.current.isSubmitting).toBe(false);
  });

  it("initialises with schema defaultValues", () => {
    const schema: FormloomSchema = {
      version: "1.0",
      fields: [
        { id: "agree", type: "boolean", label: "Agree", defaultValue: true },
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

  it("initialises with initialValues overrides", () => {
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

  it("does not re-initialise when caller passes a new initialValues object reference", () => {
    // Simulates the common pattern: <Form initialValues={{ name: "" }} />
    // where a new object is created on every parent render.
    const { result, rerender } = renderHook(
      ({ iv }) =>
        useFormloom({
          schema: makeSchema(),
          onSubmit: vi.fn(),
          initialValues: iv,
        }),
      { initialProps: { iv: { name: "Alice" } } },
    );

    expect(result.current.data.name).toBe("Alice");

    // User has typed something
    act(() => {
      result.current.fields[0].onChange("Bob");
    });
    expect(result.current.data.name).toBe("Bob");

    // Parent re-renders with a new object reference — must NOT reset form
    rerender({ iv: { name: "Alice" } });
    expect(result.current.data.name).toBe("Bob");
  });

  it("initialises select fields correctly", () => {
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
});

describe("useFormloom — isValid", () => {
  it("is false on a fresh form with unfilled required fields", () => {
    const { result } = renderHook(() =>
      useFormloom({ schema: makeSchema(), onSubmit: vi.fn() }),
    );
    // Required fields are empty — form is not valid even before any interaction
    expect(result.current.isValid).toBe(false);
  });

  it("is true for a form with only optional fields and no data", () => {
    const schema: FormloomSchema = {
      version: "1.0",
      fields: [
        { id: "note", type: "text", label: "Note" }, // no validation
      ],
    };
    const { result } = renderHook(() =>
      useFormloom({ schema, onSubmit: vi.fn() }),
    );
    expect(result.current.isValid).toBe(true);
  });

  it("becomes true once all required fields are filled correctly", () => {
    const { result } = renderHook(() =>
      useFormloom({ schema: makeSchema(), onSubmit: vi.fn() }),
    );

    act(() => {
      result.current.fields[0].onChange("Alice");
      result.current.fields[1].onChange("alice@example.com");
    });

    expect(result.current.isValid).toBe(true);
  });

  it("goes back to false when a required field is cleared", () => {
    const { result } = renderHook(() =>
      useFormloom({ schema: makeSchema(), onSubmit: vi.fn() }),
    );

    act(() => {
      result.current.fields[0].onChange("Alice");
      result.current.fields[1].onChange("alice@example.com");
    });
    expect(result.current.isValid).toBe(true);

    act(() => {
      result.current.fields[0].onChange("");
    });
    expect(result.current.isValid).toBe(false);
  });

  it("is false when pattern fails even if field is filled", () => {
    const { result } = renderHook(() =>
      useFormloom({ schema: makeSchema(), onSubmit: vi.fn() }),
    );

    act(() => {
      result.current.fields[0].onChange("Alice");
      result.current.fields[1].onChange("not-an-email");
    });

    expect(result.current.isValid).toBe(false);
  });
});

describe("useFormloom — field interaction", () => {
  it("updates data on onChange", () => {
    const { result } = renderHook(() =>
      useFormloom({ schema: makeSchema(), onSubmit: vi.fn() }),
    );

    act(() => {
      result.current.fields[0].onChange("Bob");
    });

    expect(result.current.data.name).toBe("Bob");
  });

  it("marks field as touched on blur and sets isDirty", () => {
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

    expect(result.current.fields[1].state.error).toBe("Must be a valid email");
  });

  it("clears error when value is corrected after blur", () => {
    const { result } = renderHook(() =>
      useFormloom({ schema: makeSchema(), onSubmit: vi.fn() }),
    );

    act(() => {
      result.current.fields[0].onBlur();
    });
    expect(result.current.fields[0].state.error).toBeTruthy();

    act(() => {
      result.current.fields[0].onChange("Alice");
    });
    expect(result.current.fields[0].state.error).toBeNull();
  });

  it("does not show error on onChange before first blur", () => {
    const { result } = renderHook(() =>
      useFormloom({ schema: makeSchema(), onSubmit: vi.fn() }),
    );

    act(() => {
      result.current.fields[1].onChange("not-an-email");
    });

    // Not touched yet — error must stay hidden
    expect(result.current.fields[1].state.error).toBeNull();
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

describe("useFormloom — submit", () => {
  it("calls onSubmit with form data when all fields are valid", async () => {
    const onSubmit = vi.fn();
    const { result } = renderHook(() =>
      useFormloom({ schema: makeSchema(), onSubmit }),
    );

    act(() => {
      result.current.fields[0].onChange("Alice");
      result.current.fields[1].onChange("alice@example.com");
    });
    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(onSubmit).toHaveBeenCalledOnce();
    expect(onSubmit).toHaveBeenCalledWith({
      name: "Alice",
      email: "alice@example.com",
    });
  });

  it("awaits an async onSubmit handler", async () => {
    let resolveSubmit!: () => void;
    const onSubmit = vi.fn(
      () => new Promise<void>((resolve) => { resolveSubmit = resolve; }),
    );
    const { result } = renderHook(() =>
      useFormloom({ schema: makeSchema(), onSubmit }),
    );

    act(() => {
      result.current.fields[0].onChange("Alice");
      result.current.fields[1].onChange("alice@example.com");
    });

    // Start submit — should be submitting while promise is pending
    let submitDone = false;
    act(() => {
      result.current.handleSubmit().then(() => { submitDone = true; });
    });

    expect(result.current.isSubmitting).toBe(true);
    expect(submitDone).toBe(false);

    // Resolve the async handler
    await act(async () => {
      resolveSubmit();
    });

    expect(result.current.isSubmitting).toBe(false);
    expect(submitDone).toBe(true);
  });

  it("resets isSubmitting to false even if onSubmit throws", async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error("server error"));
    const { result } = renderHook(() =>
      useFormloom({ schema: makeSchema(), onSubmit }),
    );

    act(() => {
      result.current.fields[0].onChange("Alice");
      result.current.fields[1].onChange("alice@example.com");
    });

    await act(async () => {
      await result.current.handleSubmit().catch(() => {});
    });

    expect(result.current.isSubmitting).toBe(false);
  });

  it("calls onError and touches all fields when validation fails", async () => {
    const onSubmit = vi.fn();
    const onError = vi.fn();
    const { result } = renderHook(() =>
      useFormloom({ schema: makeSchema(), onSubmit, onError }),
    );

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(onSubmit).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ fieldId: "name" }),
        expect.objectContaining({ fieldId: "email" }),
      ]),
    );
    expect(result.current.fields[0].state.touched).toBe(true);
    expect(result.current.fields[1].state.touched).toBe(true);
  });

  it("does not call onSubmit on invalid form", async () => {
    const onSubmit = vi.fn();
    const { result } = renderHook(() =>
      useFormloom({ schema: makeSchema(), onSubmit }),
    );

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(onSubmit).not.toHaveBeenCalled();
    expect(result.current.isSubmitting).toBe(false);
  });
});

describe("useFormloom — reset", () => {
  it("resets values, touched, and errors to defaults", async () => {
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
    expect(result.current.fields[0].state.touched).toBe(false);
    expect(result.current.fields[0].state.error).toBeNull();
  });
});

describe("useFormloom — getField", () => {
  it("returns the FieldProps for a valid id", () => {
    const { result } = renderHook(() =>
      useFormloom({ schema: makeSchema(), onSubmit: vi.fn() }),
    );

    const field = result.current.getField("email");
    expect(field).toBeDefined();
    expect(field!.field.id).toBe("email");
  });

  it("returns undefined for an unknown id", () => {
    const { result } = renderHook(() =>
      useFormloom({ schema: makeSchema(), onSubmit: vi.fn() }),
    );

    expect(result.current.getField("nonexistent")).toBeUndefined();
  });
});
