export {
  FORMLOOM_SYSTEM_PROMPT,
  FORMLOOM_TEXT_PROMPT,
  buildSystemPrompt,
  buildTextPrompt,
} from "./prompt";

export {
  FORMLOOM_TOOL_OPENAI,
  FORMLOOM_TOOL_ANTHROPIC,
  FORMLOOM_TOOL_GEMINI,
  FORMLOOM_TOOL_MISTRAL,
  FORMLOOM_TOOL_OLLAMA,
  FORMLOOM_RESPONSE_FORMAT_OPENAI,
} from "./tool-definition";

export {
  FORMLOOM_PARAMETERS,
  FORMLOOM_TOOL_NAME,
  FORMLOOM_TOOL_DESCRIPTION,
  narrowParameters,
} from "./parameters";

export { parseFormloomResponse } from "./parser";
export type { ParseResult, ParseOptions } from "./parser";

export { formatSubmission, formatSubmissionError } from "./format-submission";
export type {
  SubmissionProvider,
  AttachFilesMode,
  FormatSubmissionOptions,
  FormattedSubmission,
  FormatSubmissionErrorReason,
} from "./format-submission";

export { toolChoice } from "./tool-choice";

// Capabilities (re-export the schema type for ergonomics)
export { createFormloomCapabilities } from "./capabilities";
export type { FormloomCapabilitiesBundle } from "./capabilities";
export type { FormloomCapabilities } from "@formloom/schema";
export { FULL_CAPABILITIES } from "@formloom/schema";
