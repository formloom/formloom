import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useFormloom } from "../use-formloom";
import { useFormloomField } from "../use-formloom-field";
import type { FormloomSchema } from "@formloom/schema";

const schema: FormloomSchema = {
  version: "1.0",
  fields: [
    { id: "name", type: "text", label: "Name" },
    { id: "age", type: "text", label: "Age" },
  ],
};

describe("useFormloomField", () => {
  it("returns field props for a valid id", () => {
    const { result } = renderHook(() => {
      const form = useFormloom({ schema, onSubmit: vi.fn() });
      return useFormloomField(form, "name");
    });

    expect(result.current).not.toBeNull();
    expect(result.current!.field.id).toBe("name");
    expect(result.current!.state).toBeDefined();
    expect(typeof result.current!.onChange).toBe("function");
    expect(typeof result.current!.onBlur).toBe("function");
  });

  it("returns null for a non-existent id", () => {
    const { result } = renderHook(() => {
      const form = useFormloom({ schema, onSubmit: vi.fn() });
      return useFormloomField(form, "nonexistent");
    });

    expect(result.current).toBeNull();
  });

  it("reflects updated field state after onChange", () => {
    const { result } = renderHook(() => {
      const form = useFormloom({ schema, onSubmit: vi.fn() });
      return { form, field: useFormloomField(form, "name") };
    });

    expect(result.current.field!.state.value).toBeNull();

    act(() => {
      result.current.field!.onChange("Alice");
    });

    expect(result.current.field!.state.value).toBe("Alice");
  });

  it("returns the correct field when fieldId changes between renders", () => {
    const { result, rerender } = renderHook(
      ({ id }: { id: string }) => {
        const form = useFormloom({ schema, onSubmit: vi.fn() });
        return useFormloomField(form, id);
      },
      { initialProps: { id: "name" } },
    );

    expect(result.current!.field.id).toBe("name");

    rerender({ id: "age" });

    expect(result.current!.field.id).toBe("age");
  });

  it("returns null when fieldId changes to a non-existent id", () => {
    const { result, rerender } = renderHook(
      ({ id }: { id: string }) => {
        const form = useFormloom({ schema, onSubmit: vi.fn() });
        return useFormloomField(form, id);
      },
      { initialProps: { id: "name" } },
    );

    expect(result.current).not.toBeNull();

    rerender({ id: "nonexistent" });

    expect(result.current).toBeNull();
  });
});
