import type { FormloomData, FormloomFieldValue } from "@formloom/schema";

/**
 * Async field validator. Returns an error message, or `null` when the value
 * passes. The bare-function form runs on blur by default; the object form
 * exposes additional modes and debouncing.
 */
export type AsyncValidator =
  | ((
      value: FormloomFieldValue,
      allData: FormloomData,
    ) => Promise<string | null>)
  | AsyncValidatorConfig;

export interface AsyncValidatorConfig {
  validate: (
    value: FormloomFieldValue,
    allData: FormloomData,
  ) => Promise<string | null>;
  /**
   * When to fire:
   *   - `"onBlur"` (default): after the user leaves the field.
   *   - `"onChange"`: on every change, debounced per `debounceMs`.
   *   - `"onSubmit"`: only during submission.
   */
  mode?: "onBlur" | "onChange" | "onSubmit";
  /** Debounce window for `onChange` mode. Ignored otherwise. Default: 300. */
  debounceMs?: number;
}

export type AsyncValidatorMode = Required<AsyncValidatorConfig>["mode"];

export function resolveValidatorConfig(
  v: AsyncValidator,
): Required<AsyncValidatorConfig> {
  if (typeof v === "function") {
    return { validate: v, mode: "onBlur", debounceMs: 300 };
  }
  return {
    validate: v.validate,
    mode: v.mode ?? "onBlur",
    debounceMs: v.debounceMs ?? 300,
  };
}

export interface AsyncValidatorCallbacks {
  onStart: (fieldId: string) => void;
  onComplete: (fieldId: string, error: string | null) => void;
  /** Called when a run is superseded by a newer run or aborted. */
  onAbort: (fieldId: string) => void;
}

/**
 * Tracks in-flight async validations: one per field id. A new run for the
 * same field aborts the previous in-flight run. Exposes a Promise that
 * resolves when all tracked validations settle — used by the submit path.
 */
interface PendingDebounce {
  timer: ReturnType<typeof setTimeout>;
  value: FormloomFieldValue;
  data: FormloomData;
  config: Required<AsyncValidatorConfig>;
}

export class AsyncValidatorRunner {
  private readonly controllers = new Map<string, AbortController>();
  private readonly pending = new Map<string, Promise<void>>();
  private readonly debounced = new Map<string, PendingDebounce>();

  constructor(private readonly callbacks: AsyncValidatorCallbacks) {}

  /** Schedules (or immediately runs) a validator for a field. */
  schedule(
    fieldId: string,
    value: FormloomFieldValue,
    data: FormloomData,
    config: Required<AsyncValidatorConfig>,
    runMode: AsyncValidatorMode,
  ): void {
    if (config.mode !== runMode) return;

    if (runMode === "onChange" && config.debounceMs > 0) {
      const existing = this.debounced.get(fieldId);
      if (existing !== undefined) clearTimeout(existing.timer);
      const timer = setTimeout(() => {
        this.debounced.delete(fieldId);
        this.run(fieldId, value, data, config);
      }, config.debounceMs);
      this.debounced.set(fieldId, { timer, value, data, config });
      return;
    }

    this.run(fieldId, value, data, config);
  }

  /** Runs a validator immediately, cancelling any in-flight run for the same field. */
  run(
    fieldId: string,
    value: FormloomFieldValue,
    data: FormloomData,
    config: Required<AsyncValidatorConfig>,
  ): Promise<void> {
    this.abortField(fieldId);

    const controller = new AbortController();
    this.controllers.set(fieldId, controller);
    this.callbacks.onStart(fieldId);

    // The closure captures `promise` for identity-checked cleanup. The
    // definite-assignment assertion is safe because the IIFE body only reads
    // the variable inside `finally`, which runs after the assignment below.
    let promise!: Promise<void>;
    promise = (async () => {
      try {
        const error = await config.validate(value, data);
        if (controller.signal.aborted) {
          this.callbacks.onAbort(fieldId);
          return;
        }
        this.callbacks.onComplete(fieldId, error);
      } catch (err) {
        if (controller.signal.aborted) {
          this.callbacks.onAbort(fieldId);
          return;
        }
        this.callbacks.onComplete(
          fieldId,
          err instanceof Error ? err.message : "Validation failed",
        );
      } finally {
        if (this.controllers.get(fieldId) === controller) {
          this.controllers.delete(fieldId);
        }
        if (this.pending.get(fieldId) === promise) {
          this.pending.delete(fieldId);
        }
      }
    })();

    this.pending.set(fieldId, promise);
    return promise;
  }

  /**
   * Resolves once every in-flight and debounce-pending validator has settled.
   *
   * Debounce timers are fired immediately (their timers cancelled) rather
   * than waited out — callers typically invoke `settled()` on submit and
   * shouldn't have to block for the remaining `debounceMs`.
   */
  async settled(): Promise<void> {
    this.flushDebounced();
    const promises = Array.from(this.pending.values());
    if (promises.length === 0) return;
    await Promise.allSettled(promises);
  }

  /** Whether any validator is pending (either debouncing or in-flight). */
  isBusy(): boolean {
    return this.pending.size > 0 || this.debounced.size > 0;
  }

  /** Cancels all pending work. Call on unmount. */
  dispose(): void {
    for (const fieldId of this.controllers.keys()) {
      this.abortField(fieldId);
    }
    for (const entry of this.debounced.values()) {
      clearTimeout(entry.timer);
    }
    this.debounced.clear();
  }

  private flushDebounced(): void {
    for (const [fieldId, entry] of this.debounced) {
      clearTimeout(entry.timer);
      this.run(fieldId, entry.value, entry.data, entry.config);
    }
    this.debounced.clear();
  }

  private abortField(fieldId: string): void {
    const controller = this.controllers.get(fieldId);
    if (controller !== undefined) {
      controller.abort();
      this.controllers.delete(fieldId);
    }
    const entry = this.debounced.get(fieldId);
    if (entry !== undefined) {
      clearTimeout(entry.timer);
      this.debounced.delete(fieldId);
    }
  }
}
