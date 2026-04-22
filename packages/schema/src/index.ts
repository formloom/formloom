// Types
export type {
  FieldType,
  ValidationRule,
  NumberValidationRule,
  FieldOption,
  RenderHints,
  BaseField,
  TextField,
  BooleanField,
  RadioField,
  SelectField,
  DateField,
  NumberField,
  FileField,
  FormField,
  FormloomSchema,
  FormloomData,
  FormloomFieldValue,
  FormloomFileValue,
  Section,
  ShowIfRule,
} from "./types";

// Constants
export {
  FORMLOOM_SCHEMA_VERSION,
  FORMLOOM_MIN_SUPPORTED_VERSION,
  FIELD_TYPES,
} from "./types";

// Hints registry
export { CANONICAL_HINTS, CANONICAL_HINT_VALUES } from "./hints";
export type {
  CanonicalHints,
  CanonicalHintEntry,
  CanonicalDisplayHint,
  CanonicalWidthHint,
  FieldHints,
} from "./hints";

// Custom-value helpers (radio/select with allowCustom)
export { resolveMultiSelectValue, isRadioCustomValue } from "./resolve-custom";

// showIf
export { evaluateShowIf, collectShowIfDependencies, findShowIfCycle } from "./show-if";

// Safe regex
export {
  safeRegexTest,
  isCatastrophicPattern,
  isValidRegexSyntax,
  DEFAULT_MAX_INPUT_LENGTH,
} from "./safe-regex";
export type { SafeRegexOptions, SafeRegexResult } from "./safe-regex";

// File accept matching
export { fileMatchesAccept, mimeMatches } from "./file-accept";

// Version helpers
export {
  parseSchemaVersion,
  isSupportedVersion,
  compareVersions,
} from "./version";
export type { ParsedVersion } from "./version";

// Validator
export { validateSchema } from "./validate";
export type {
  ValidationResult,
  ValidationError,
  ValidationWarning,
  ValidateOptions,
} from "./validate";

// Errors
export { FormloomValidationError } from "./errors";
