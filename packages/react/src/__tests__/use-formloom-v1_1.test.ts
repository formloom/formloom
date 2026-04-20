import { describe, it, expect, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { useFormloom } from "../use-formloom";
import type { FormloomSchema } from "@formloom/schema";

// ---- showIf ----

describe("useFormloom - showIf visibility", () => {
  const schema: FormloomSchema = {
    version: "1.1",
    fields: [
      { id: "country", type: "text", label: "Country" },
      {
        id: "state",
        type: "text",
        label: "State",
        validation: { required: true },
        showIf: { field: "country", equals: "US" },
      },
    ],
  };

  it("marks the dependent field as hidden when the rule is unmet", () => {
    const { result } = renderHook(() =>
      useFormloom({ schema, onSubmit: vi.fn() }),
    );
    const stateField = result.current.fields.find((f) => f.field.id === "state");
    expect(stateField?.visible).toBe(false);
    expect(result.current.visibleFields.map((f) => f.field.id)).toEqual(["country"]);
  });

  it("reveals the dependent field when the rule becomes true", () => {
    const { result } = renderHook(() =>
      useFormloom({ schema, onSubmit: vi.fn() }),
    );
    act(() => {
      result.current.fields[0].onChange("US");
    });
    const stateField = result.current.fields.find((f) => f.field.id === "state");
    expect(stateField?.visible).toBe(true);
    expect(result.current.visibleFields.map((f) => f.field.id)).toEqual([
      "country",
      "state",
    ]);
  });

  it("excludes hidden fields from submitted data", async () => {
    const onSubmit = vi.fn();
    const { result } = renderHook(() =>
      useFormloom({ schema, onSubmit }),
    );
    act(() => {
      result.current.fields[0].onChange("FR");
      result.current.fields[1].onChange("ghost");
    });
    await act(async () => {
      await result.current.handleSubmit();
    });
    expect(onSubmit).toHaveBeenCalledWith({ country: "FR" });
  });

  it("does not count hidden-field validation toward isValid", () => {
    const { result } = renderHook(() =>
      useFormloom({ schema, onSubmit: vi.fn() }),
    );
    // state is required but hidden. The only remaining field, country, is not
    // required. Initial form should be valid.
    expect(result.current.isValid).toBe(true);
  });

  it("retains hidden-field values when the field reappears", () => {
    const { result } = renderHook(() =>
      useFormloom({ schema, onSubmit: vi.fn() }),
    );
    act(() => {
      result.current.fields[0].onChange("US");
      result.current.fields[1].onChange("CA");
    });
    act(() => {
      result.current.fields[0].onChange("FR");
    });
    act(() => {
      result.current.fields[0].onChange("US");
    });
    const stateField = result.current.fields.find((f) => f.field.id === "state");
    expect(stateField?.state.value).toBe("CA");
  });
});

// ---- sections ----

describe("useFormloom - sections", () => {
  const schema: FormloomSchema = {
    version: "1.1",
    fields: [
      { id: "a", type: "text", label: "A" },
      { id: "b", type: "text", label: "B" },
      { id: "c", type: "text", label: "C" },
    ],
    sections: [
      { id: "top", title: "Top", fieldIds: ["a", "b"] },
      { id: "bottom", title: "Bottom", fieldIds: ["c"] },
    ],
  };

  it("exposes a sections array grouping fields", () => {
    const { result } = renderHook(() =>
      useFormloom({ schema, onSubmit: vi.fn() }),
    );
    const sections = result.current.sections;
    expect(sections).toHaveLength(2);
    expect(sections![0].section.id).toBe("top");
    expect(sections![0].fields.map((f) => f.field.id)).toEqual(["a", "b"]);
    expect(sections![1].fields.map((f) => f.field.id)).toEqual(["c"]);
  });

  it("does not return sections when the schema omits them", () => {
    const flatSchema: FormloomSchema = {
      version: "1.1",
      fields: [{ id: "a", type: "text", label: "A" }],
    };
    const { result } = renderHook(() =>
      useFormloom({ schema: flatSchema, onSubmit: vi.fn() }),
    );
    expect(result.current.sections).toBeUndefined();
  });

  it("section.visible is false when every field is hidden", () => {
    const schemaWithShowIf: FormloomSchema = {
      version: "1.1",
      fields: [
        { id: "toggle", type: "text", label: "Toggle" },
        {
          id: "hidden",
          type: "text",
          label: "Hidden",
          showIf: { field: "toggle", equals: "on" },
        },
      ],
      sections: [
        { id: "s1", fieldIds: ["toggle"] },
        { id: "s2", fieldIds: ["hidden"] },
      ],
    };
    const { result } = renderHook(() =>
      useFormloom({ schema: schemaWithShowIf, onSubmit: vi.fn() }),
    );
    expect(result.current.sections![1].visible).toBe(false);
  });
});

// ---- Number fields ----

describe("useFormloom - number fields", () => {
  const schema: FormloomSchema = {
    version: "1.1",
    fields: [
      {
        id: "age",
        type: "number",
        label: "Age",
        validation: { min: 0, max: 120, integer: true, required: true },
      },
    ],
  };

  it("initialises number fields to null", () => {
    const { result } = renderHook(() =>
      useFormloom({ schema, onSubmit: vi.fn() }),
    );
    expect(result.current.data.age).toBeNull();
  });

  it("honours min/max validation", async () => {
    const onError = vi.fn();
    const { result } = renderHook(() =>
      useFormloom({ schema, onSubmit: vi.fn(), onError }),
    );
    act(() => {
      result.current.fields[0].onChange(-5);
    });
    await act(async () => {
      await result.current.handleSubmit();
    });
    expect(onError).toHaveBeenCalled();
    expect(onError.mock.calls[0][0][0].message).toContain("at least");
  });

  it("accepts valid numbers", async () => {
    const onSubmit = vi.fn();
    const { result } = renderHook(() =>
      useFormloom({ schema, onSubmit }),
    );
    act(() => {
      result.current.fields[0].onChange(30);
    });
    await act(async () => {
      await result.current.handleSubmit();
    });
    expect(onSubmit).toHaveBeenCalledWith({ age: 30 });
  });
});

// ---- File fields ----

describe("useFormloom - file fields", () => {
  const schema: FormloomSchema = {
    version: "1.1",
    fields: [
      {
        id: "avatar",
        type: "file",
        label: "Avatar",
        maxSizeBytes: 1024,
      },
    ],
  };

  it("initialises single-file fields to null", () => {
    const { result } = renderHook(() =>
      useFormloom({ schema, onSubmit: vi.fn() }),
    );
    expect(result.current.data.avatar).toBeNull();
  });

  it("initialises multi-file fields to empty array", () => {
    const multiSchema: FormloomSchema = {
      version: "1.1",
      fields: [
        {
          id: "docs",
          type: "file",
          label: "Docs",
          multiple: true,
        },
      ],
    };
    const { result } = renderHook(() =>
      useFormloom({ schema: multiSchema, onSubmit: vi.fn() }),
    );
    expect(result.current.data.docs).toEqual([]);
  });

  it("accepts a previously-adapted file value and validates size", async () => {
    const onError = vi.fn();
    const { result } = renderHook(() =>
      useFormloom({ schema, onSubmit: vi.fn(), onError }),
    );
    act(() => {
      result.current.fields[0].onChange({
        kind: "inline",
        name: "big.png",
        mime: "image/png",
        size: 5000,
        dataUrl: "data:image/png;base64,xxx",
      });
    });
    await act(async () => {
      await result.current.handleSubmit();
    });
    expect(onError).toHaveBeenCalled();
    expect(onError.mock.calls[0][0][0].message).toContain("larger than");
  });
});

// ---- Async validators ----

describe("useFormloom - async validators", () => {
  const schema: FormloomSchema = {
    version: "1.1",
    fields: [{ id: "username", type: "text", label: "Username" }],
  };

  it("runs async validator on blur and surfaces the error", async () => {
    const onSubmit = vi.fn();
    const { result } = renderHook(() =>
      useFormloom({
        schema,
        onSubmit,
        validators: {
          username: async () => "already taken",
        },
      }),
    );
    act(() => {
      result.current.fields[0].onChange("alice");
    });
    act(() => {
      result.current.fields[0].onBlur();
    });
    await waitFor(() => {
      expect(result.current.errors.some((e) => e.message === "already taken")).toBe(true);
    });
  });

  it("tracks isValidating while the async validator is in flight", async () => {
    let resolveValidate!: (v: string | null) => void;
    const { result } = renderHook(() =>
      useFormloom({
        schema,
        onSubmit: vi.fn(),
        validators: {
          username: () =>
            new Promise<string | null>((r) => {
              resolveValidate = r;
            }),
        },
      }),
    );
    act(() => {
      result.current.fields[0].onChange("alice");
    });
    act(() => {
      result.current.fields[0].onBlur();
    });
    await waitFor(() => {
      expect(result.current.isValidating).toBe(true);
    });
    await act(async () => {
      resolveValidate(null);
    });
    await waitFor(() => {
      expect(result.current.isValidating).toBe(false);
    });
  });

  it("flushes debounced onChange validators when submit fires", async () => {
    const events: string[] = [];
    const onSubmit = vi.fn(() => {
      events.push("submit");
    });
    const { result } = renderHook(() =>
      useFormloom({
        schema,
        onSubmit,
        validators: {
          username: {
            validate: async () => {
              events.push("validate");
              return null;
            },
            mode: "onChange",
            debounceMs: 10_000, // intentionally long — would never fire on its own
          },
        },
      }),
    );
    act(() => {
      result.current.fields[0].onChange("alice");
    });
    // Submit before the debounce timer would have fired.
    await act(async () => {
      await result.current.handleSubmit();
    });
    expect(events).toEqual(["validate", "submit"]);
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("waits for in-flight async validators before calling onSubmit", async () => {
    const events: string[] = [];
    let resolveValidate!: (v: string | null) => void;
    const onSubmit = vi.fn(() => {
      events.push("submit");
    });
    const { result } = renderHook(() =>
      useFormloom({
        schema,
        onSubmit,
        validators: {
          username: {
            validate: () =>
              new Promise<string | null>((r) => {
                events.push("validating");
                resolveValidate = r;
              }),
            mode: "onSubmit",
          },
        },
      }),
    );
    act(() => {
      result.current.fields[0].onChange("alice");
    });
    const submitPromise = act(async () => {
      await result.current.handleSubmit();
    });
    await waitFor(() => expect(events).toContain("validating"));
    await act(async () => {
      resolveValidate(null);
    });
    await submitPromise;
    expect(events).toEqual(["validating", "submit"]);
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});
