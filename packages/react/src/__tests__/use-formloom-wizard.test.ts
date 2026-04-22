import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useFormloomWizard } from "../use-formloom-wizard";
import type { FormloomSchema } from "@formloom/schema";

function threeStepSchema(): FormloomSchema {
  return {
    version: "1.2",
    fields: [
      {
        id: "name",
        type: "text",
        label: "Name",
        validation: { required: true },
      },
      { id: "topic", type: "text", label: "Topic" },
      {
        id: "tier",
        type: "radio",
        label: "Tier",
        options: [
          { value: "basic", label: "Basic" },
          { value: "pro", label: "Pro" },
        ],
      },
    ],
    sections: [
      { id: "step1", title: "Who", fieldIds: ["name"] },
      { id: "step2", title: "What", fieldIds: ["topic"] },
      { id: "step3", title: "Tier", fieldIds: ["tier"] },
    ],
  };
}

describe("useFormloomWizard", () => {
  it("initialises on step 0 of N", () => {
    const { result } = renderHook(() =>
      useFormloomWizard({ schema: threeStepSchema(), onSubmit: vi.fn() }),
    );
    expect(result.current.currentStepIndex).toBe(0);
    expect(result.current.totalSteps).toBe(3);
    expect(result.current.isFirstStep).toBe(true);
    expect(result.current.isLastStep).toBe(false);
    expect(result.current.currentStep.section.id).toBe("step1");
  });

  it("throws when schema has no sections", () => {
    const noSections: FormloomSchema = {
      version: "1.2",
      fields: [{ id: "a", type: "text", label: "A" }],
    };
    expect(() =>
      renderHook(() =>
        useFormloomWizard({ schema: noSections, onSubmit: vi.fn() }),
      ),
    ).toThrow(/requires a schema with a non-empty `sections`/);
  });

  it("next() blocks and does not advance when a required field is empty", async () => {
    const { result } = renderHook(() =>
      useFormloomWizard({ schema: threeStepSchema(), onSubmit: vi.fn() }),
    );
    await act(async () => {
      await result.current.next();
    });
    expect(result.current.currentStepIndex).toBe(0);
    // The blocked step's required field is now touched so the renderer
    // surfaces the error.
    expect(result.current.fields[0].state.touched).toBe(true);
  });

  it("next() advances once the current step's required fields are filled", async () => {
    const { result } = renderHook(() =>
      useFormloomWizard({ schema: threeStepSchema(), onSubmit: vi.fn() }),
    );
    act(() => result.current.fields[0].onChange("Ada"));
    await act(async () => {
      await result.current.next();
    });
    expect(result.current.currentStepIndex).toBe(1);
    expect(result.current.currentStep.section.id).toBe("step2");
  });

  it("back() walks backwards and is a no-op at step 0", async () => {
    const { result } = renderHook(() =>
      useFormloomWizard({ schema: threeStepSchema(), onSubmit: vi.fn() }),
    );
    act(() => result.current.fields[0].onChange("Ada"));
    await act(async () => {
      await result.current.next();
    });
    act(() => result.current.back());
    expect(result.current.currentStepIndex).toBe(0);
    // No-op at step 0
    act(() => result.current.back());
    expect(result.current.currentStepIndex).toBe(0);
  });

  it("canSkip is false on a step with required fields; skip() throws", () => {
    const { result } = renderHook(() =>
      useFormloomWizard({ schema: threeStepSchema(), onSubmit: vi.fn() }),
    );
    expect(result.current.canSkip).toBe(false);
    expect(() => act(() => result.current.skip())).toThrow(/Cannot skip/);
  });

  it("canSkip is true on a step with no required fields; skip() advances", async () => {
    const { result } = renderHook(() =>
      useFormloomWizard({ schema: threeStepSchema(), onSubmit: vi.fn() }),
    );
    act(() => result.current.fields[0].onChange("Ada"));
    await act(async () => {
      await result.current.next();
    });
    expect(result.current.canSkip).toBe(true);
    act(() => result.current.skip());
    expect(result.current.currentStepIndex).toBe(2);
  });

  it("handleSubmit succeeds once the final step is filled", async () => {
    const onSubmit = vi.fn();
    const { result } = renderHook(() =>
      useFormloomWizard({ schema: threeStepSchema(), onSubmit }),
    );
    act(() => result.current.fields[0].onChange("Ada"));
    await act(async () => {
      await result.current.next();
    });
    await act(async () => {
      await result.current.next();
    });
    await act(async () => {
      await result.current.next();
    });
    expect(result.current.isLastStep).toBe(true);
    await act(async () => {
      await result.current.handleSubmit();
    });
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("showIf hiding every field in a step doesn't break stepping", async () => {
    const schema: FormloomSchema = {
      version: "1.2",
      fields: [
        { id: "mode", type: "boolean", label: "Advanced mode", defaultValue: false },
        {
          id: "knob",
          type: "text",
          label: "Knob",
          showIf: { field: "mode", equals: true },
        },
        { id: "name", type: "text", label: "Name" },
      ],
      sections: [
        { id: "s1", fieldIds: ["mode"] },
        { id: "s2", fieldIds: ["knob"] },
        { id: "s3", fieldIds: ["name"] },
      ],
    };
    const { result } = renderHook(() =>
      useFormloomWizard({ schema, onSubmit: vi.fn() }),
    );
    // Step 2 has the showIf-hidden field; wizard exposes an empty visible list.
    await act(async () => {
      await result.current.next();
    });
    expect(result.current.currentStepIndex).toBe(1);
    expect(result.current.currentStep.visibleFields).toHaveLength(0);
    // canSkip is trivially true (no required visible fields).
    expect(result.current.canSkip).toBe(true);
    expect(result.current.canGoNext).toBe(true);
    await act(async () => {
      await result.current.next();
    });
    expect(result.current.currentStepIndex).toBe(2);
  });
});
