import type { FormloomData, FormloomFieldValue } from "@formloom/schema";

/** Providers with first-class round-trip support in v1.1. */
export type SubmissionProvider = "openai" | "anthropic" | "generic";

/** How to represent file bytes in the serialized payload. */
export type AttachFilesMode = "inline-json" | "omit";

export interface FormatSubmissionOptions {
  /** Which provider-specific envelope to emit. */
  provider: SubmissionProvider;
  /**
   * Tool identifier from the original tool_use / tool_call.
   * Required for OpenAI (tool_call_id) and Anthropic (tool_use_id).
   * Ignored for "generic".
   */
  toolCallId?: string;
  /**
   * File handling. "inline-json" (default) stringifies the full FormloomData
   * including data URLs; "omit" replaces file payload bytes with a metadata
   * stub so the LLM sees the file name/mime without transporting the bytes.
   */
  attachFiles?: AttachFilesMode;
}

export type FormattedSubmission =
  | {
      role: "tool";
      tool_call_id: string;
      content: string;
    }
  | {
      role: "user";
      content: Array<{
        type: "tool_result";
        tool_use_id: string;
        content: string;
      }>;
    }
  | {
      role: "user";
      content: string;
    };

export type FormatSubmissionErrorReason =
  | {
      kind: "validation";
      errors: Array<{ fieldId: string; message: string }>;
    }
  | { kind: "cancelled"; reason?: string }
  | { kind: "timeout" };

/**
 * Formats a completed FormloomData submission as a provider-specific tool
 * response, ready to append to the conversation history.
 *
 * Use the returned object as the next message in your messages array; the
 * LLM will then see the form result and can reason about it.
 */
export function formatSubmission(
  data: FormloomData,
  opts: FormatSubmissionOptions,
): FormattedSubmission {
  const content = JSON.stringify(
    prepareData(data, opts.attachFiles ?? "inline-json"),
  );
  return envelope(content, opts);
}

/**
 * Formats an error or cancellation as a provider-specific tool response.
 * Use when the user cancels the form, validation fails at the host layer,
 * or the form times out — so the LLM gets structured feedback and can retry.
 */
export function formatSubmissionError(
  reason: FormatSubmissionErrorReason,
  opts: FormatSubmissionOptions,
): FormattedSubmission {
  const content = JSON.stringify(serializeError(reason));
  return envelope(content, opts);
}

// ---- Helpers ----

function envelope(
  content: string,
  opts: FormatSubmissionOptions,
): FormattedSubmission {
  switch (opts.provider) {
    case "openai": {
      const toolCallId = requireToolCallId(opts);
      return { role: "tool", tool_call_id: toolCallId, content };
    }
    case "anthropic": {
      const toolCallId = requireToolCallId(opts);
      return {
        role: "user",
        content: [
          { type: "tool_result", tool_use_id: toolCallId, content },
        ],
      };
    }
    case "generic":
      return { role: "user", content };
  }
}

function requireToolCallId(opts: FormatSubmissionOptions): string {
  if (typeof opts.toolCallId !== "string" || opts.toolCallId.length === 0) {
    throw new Error(
      `formatSubmission: toolCallId is required for provider "${opts.provider}"`,
    );
  }
  return opts.toolCallId;
}

function prepareData(
  data: FormloomData,
  attachFiles: AttachFilesMode,
): FormloomData {
  if (attachFiles === "inline-json") return data;

  const cleaned: FormloomData = {};
  for (const [key, value] of Object.entries(data)) {
    cleaned[key] = stripFileBytes(value);
  }
  return cleaned;
}

function stripFileBytes(value: FormloomFieldValue): FormloomFieldValue {
  if (value === null) return null;
  if (typeof value !== "object") return value;
  if (Array.isArray(value)) {
    if (value.length === 0) return value;
    if (typeof value[0] === "string") return value as string[];
    return (value as Array<{ kind: "inline" | "remote" }>).map((v) =>
      stripSingleFile(v),
    ) as FormloomFieldValue;
  }
  return stripSingleFile(value as { kind: "inline" | "remote" }) as FormloomFieldValue;
}

function stripSingleFile(
  file: { kind: "inline" | "remote" } & Record<string, unknown>,
): Record<string, unknown> {
  if (file.kind === "inline") {
    return {
      kind: "inline",
      name: file.name,
      mime: file.mime,
      size: file.size,
      dataUrl: "<omitted>",
    };
  }
  return file;
}

function serializeError(reason: FormatSubmissionErrorReason): {
  ok: false;
  reason: string;
  detail?: unknown;
} {
  switch (reason.kind) {
    case "validation":
      return { ok: false, reason: "validation", detail: reason.errors };
    case "cancelled":
      return {
        ok: false,
        reason: "cancelled",
        detail: reason.reason ?? null,
      };
    case "timeout":
      return { ok: false, reason: "timeout" };
  }
}
