import { FIELD_TYPES, FORMLOOM_MIN_SUPPORTED_VERSION } from "./types";
import type { FormField, ShowIfRule, FieldType } from "./types";
import { parseSchemaVersion } from "./version";
import { isValidRegexSyntax, isCatastrophicPattern } from "./safe-regex";
import { collectShowIfDependencies, findShowIfCycle } from "./show-if";
import {
  isFieldTypeAllowed,
  isVariantAllowed,
  resolveFeatures,
  type FormloomCapabilities,
  type ResolvedFeatures,
} from "./capabilities";

/**
 * The major version this runtime supports, derived from
 * {@link FORMLOOM_MIN_SUPPORTED_VERSION} so public constant and validator
 * behaviour can't drift.
 */
const SUPPORTED_MAJOR = (() => {
  const parsed = parseSchemaVersion(FORMLOOM_MIN_SUPPORTED_VERSION);
  if (parsed === null) {
    throw new Error(
      `FORMLOOM_MIN_SUPPORTED_VERSION "${FORMLOOM_MIN_SUPPORTED_VERSION}" is not a valid major.minor string`,
    );
  }
  return parsed.major;
})();

export interface ValidationError {
  path: string;
  message: string;
}

export interface ValidationWarning {
  path: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  /** Non-fatal notices. Populated in both strict and lenient modes. */
  warnings: ValidationWarning[];
  /**
   * Field ids that were silently dropped in `lenient` mode because their
   * `type` is unknown to this runtime. Always empty in strict mode.
   */
  droppedFields: string[];
}

export interface ValidateOptions {
  /**
   * How to treat fields with unknown `type` values.
   *
   * - `"strict"` (default): unknown types are validation errors. Protects
   *   runtimes from silently producing incomplete forms.
   * - `"lenient"`: unknown fields are dropped with a warning and their ids
   *   are listed in `droppedFields`. Useful when a newer LLM emits a v1.x
   *   schema with a field type only a newer runtime understands.
   */
  forwardCompat?: "strict" | "lenient";
  /**
   * Optional per-surface capabilities declaration. When provided, the
   * validator enforces the host's subset: disallowed field types and
   * features become validation errors in strict mode or silent drops /
   * strips with warnings in lenient mode. Omit for v1.2 behaviour.
   */
  capabilities?: FormloomCapabilities;
}

/**
 * Validates a Formloom schema object.
 *
 * Collects ALL errors rather than failing on the first one, so developers can
 * fix LLM output comprehensively.
 */
export function validateSchema(
  input: unknown,
  opts: ValidateOptions = {},
): ValidationResult {
  const { forwardCompat = "strict", capabilities } = opts;
  const features: ResolvedFeatures | null =
    capabilities === undefined ? null : resolveFeatures(capabilities);
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  const droppedFields: string[] = [];

  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    return {
      valid: false,
      errors: [{ path: "", message: "Schema must be a non-null object" }],
      warnings,
      droppedFields,
    };
  }

  const schema = input as Record<string, unknown>;

  validateVersion(schema.version, errors);

  if (schema.title !== undefined && typeof schema.title !== "string") {
    errors.push({ path: "title", message: "title must be a string" });
  }
  if (
    schema.description !== undefined &&
    typeof schema.description !== "string"
  ) {
    errors.push({
      path: "description",
      message: "description must be a string",
    });
  }
  if (
    schema.submitLabel !== undefined &&
    typeof schema.submitLabel !== "string"
  ) {
    errors.push({
      path: "submitLabel",
      message: "submitLabel must be a string",
    });
  }

  if (!Array.isArray(schema.fields)) {
    errors.push({ path: "fields", message: "fields must be an array" });
    return { valid: false, errors, warnings, droppedFields };
  }
  if (schema.fields.length === 0) {
    errors.push({ path: "fields", message: "fields array must not be empty" });
  }

  const retainedFieldIds = new Set<string>();
  const seenIds = new Set<string>();

  (schema.fields as unknown[]).forEach((field, index) => {
    const prefix = `fields[${index}]`;

    if (field === null || typeof field !== "object" || Array.isArray(field)) {
      errors.push({ path: prefix, message: "field must be a non-null object" });
      return;
    }

    const f = field as Record<string, unknown>;

    const idOk = validateFieldId(f, prefix, seenIds, errors);

    if (!isKnownFieldType(f.type)) {
      if (forwardCompat === "lenient") {
        warnings.push({
          path: `${prefix}.type`,
          message: `Unknown field type "${String(f.type)}"; dropped. Runtime supports: ${FIELD_TYPES.join(", ")}`,
        });
        if (idOk && typeof f.id === "string") {
          droppedFields.push(f.id);
        }
      } else {
        errors.push({
          path: `${prefix}.type`,
          message: `Unknown field type "${String(f.type)}". Runtime supports: ${FIELD_TYPES.join(", ")}. Pass { forwardCompat: "lenient" } to drop unknown fields instead.`,
        });
      }
      return;
    }

    // Capability gate: disallowed field types behave the same as unknown types
    // under the active forwardCompat mode so hosts get one consistent story.
    if (
      capabilities !== undefined &&
      !isFieldTypeAllowed(capabilities, f.type as FieldType)
    ) {
      if (forwardCompat === "lenient") {
        warnings.push({
          path: `${prefix}.type`,
          message: `Field type "${String(f.type)}" is not in capabilities.fieldTypes; dropped.`,
        });
        if (idOk && typeof f.id === "string") {
          droppedFields.push(f.id);
        }
      } else {
        errors.push({
          path: `${prefix}.type`,
          message: `Field type "${String(f.type)}" is not allowed by capabilities.fieldTypes (allowed: ${
            capabilities.fieldTypes?.join(", ") ?? "none"
          }).`,
        });
      }
      return;
    }

    if (idOk && typeof f.id === "string") {
      retainedFieldIds.add(f.id);
    }

    if (typeof f.label !== "string" || f.label.trim() === "") {
      errors.push({
        path: `${prefix}.label`,
        message: "field label must be a non-empty string",
      });
    }

    if (f.validation !== undefined) {
      validateValidationRules(f.validation, f.type, prefix, errors);
    }

    if (f.showIf !== undefined) {
      validateShowIfRule(f.showIf, `${prefix}.showIf`, errors);
    }

    if (f.hints !== undefined) {
      validateHints(f.hints, prefix, errors);
    }

    if (f.readOnly !== undefined && typeof f.readOnly !== "boolean") {
      errors.push({
        path: `${prefix}.readOnly`,
        message: "readOnly must be a boolean",
      });
    }
    if (f.disabled !== undefined && typeof f.disabled !== "boolean") {
      errors.push({
        path: `${prefix}.disabled`,
        message: "disabled must be a boolean",
      });
    }

    // Feature-level capability gates. In strict mode each triggers an error;
    // in lenient mode the offending sub-property is silently stripped (or
    // flipped off) and validation continues.
    if (features !== null) {
      checkFeatureCapabilities(f, prefix, features, forwardCompat, errors, warnings);
    }
    if (capabilities !== undefined) {
      checkVariantCapability(f, prefix, capabilities, forwardCompat, errors, warnings);
      checkMaxOptionsCapability(f, prefix, capabilities, forwardCompat, errors, warnings);
    }

    switch (f.type) {
      case "text":
        validateTextField(f, prefix, errors);
        break;
      case "boolean":
        validateBooleanField(f, prefix, errors);
        break;
      case "radio":
        validateRadioField(f, prefix, errors);
        break;
      case "select":
        validateSelectField(f, prefix, errors);
        break;
      case "date":
        validateDateField(f, prefix, errors);
        break;
      case "number":
        validateNumberField(f, prefix, errors);
        break;
      case "file":
        validateFileField(f, prefix, errors);
        break;
    }
  });

  validateShowIfReferences(
    schema.fields as unknown[],
    retainedFieldIds,
    errors,
  );
  validateShowIfCycles(schema.fields as unknown[], errors);

  // Schema-level capability gates.
  if (features !== null && features.sections === false && schema.sections !== undefined) {
    if (forwardCompat === "lenient") {
      warnings.push({
        path: "sections",
        message: "sections are not allowed by capabilities.features.sections; stripped.",
      });
    } else {
      errors.push({
        path: "sections",
        message: "sections are not allowed by capabilities.features.sections.",
      });
    }
  } else if (schema.sections !== undefined) {
    validateSections(schema.sections, retainedFieldIds, errors);
  }

  if (capabilities?.maxFields !== undefined) {
    const count = (schema.fields as unknown[]).length;
    if (count > capabilities.maxFields) {
      if (forwardCompat === "lenient") {
        warnings.push({
          path: "fields",
          message: `fields length ${count} exceeds capabilities.maxFields (${capabilities.maxFields}); trailing fields would be truncated.`,
        });
      } else {
        errors.push({
          path: "fields",
          message: `fields length ${count} exceeds capabilities.maxFields (${capabilities.maxFields}).`,
        });
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    droppedFields,
  };
}

// ---- Helpers ----

function validateVersion(raw: unknown, errors: ValidationError[]): void {
  if (typeof raw !== "string") {
    errors.push({
      path: "version",
      message: `version must be a string (e.g. "1.0"), got ${typeof raw}`,
    });
    return;
  }
  const parsed = parseSchemaVersion(raw);
  if (parsed === null) {
    errors.push({
      path: "version",
      message: `version "${raw}" is not a valid major.minor string`,
    });
    return;
  }
  if (parsed.major !== SUPPORTED_MAJOR) {
    errors.push({
      path: "version",
      message: `Unsupported schema major version ${parsed.major}. This runtime supports ${SUPPORTED_MAJOR}.x`,
    });
  }
}

function validateFieldId(
  f: Record<string, unknown>,
  prefix: string,
  seenIds: Set<string>,
  errors: ValidationError[],
): boolean {
  if (typeof f.id !== "string" || f.id.trim() === "") {
    errors.push({
      path: `${prefix}.id`,
      message: "field id must be a non-empty string",
    });
    return false;
  }
  if (seenIds.has(f.id)) {
    errors.push({
      path: `${prefix}.id`,
      message: `Duplicate field id: "${f.id}"`,
    });
    return false;
  }
  seenIds.add(f.id);
  return true;
}

function isKnownFieldType(t: unknown): t is FormField["type"] {
  return (
    typeof t === "string" &&
    FIELD_TYPES.includes(t as (typeof FIELD_TYPES)[number])
  );
}

function validateValidationRules(
  validation: unknown,
  fieldType: unknown,
  prefix: string,
  errors: ValidationError[],
): void {
  if (typeof validation !== "object" || validation === null) {
    errors.push({
      path: `${prefix}.validation`,
      message: "validation must be an object",
    });
    return;
  }
  const v = validation as Record<string, unknown>;

  if (v.required !== undefined && typeof v.required !== "boolean") {
    errors.push({
      path: `${prefix}.validation.required`,
      message: "required must be a boolean",
    });
  }

  if (v.pattern !== undefined) {
    if (typeof v.pattern !== "string") {
      errors.push({
        path: `${prefix}.validation.pattern`,
        message: "pattern must be a string",
      });
    } else if (!isValidRegexSyntax(v.pattern)) {
      errors.push({
        path: `${prefix}.validation.pattern`,
        message: `Invalid regex pattern: "${v.pattern}"`,
      });
    } else if (isCatastrophicPattern(v.pattern)) {
      errors.push({
        path: `${prefix}.validation.pattern`,
        message: `Pattern "${v.pattern}" matches a known catastrophic-backtracking shape and will be skipped at runtime. Rewrite to avoid nested quantifiers or overlapping alternations.`,
      });
    }
  }

  if (v.patternMessage !== undefined && typeof v.patternMessage !== "string") {
    errors.push({
      path: `${prefix}.validation.patternMessage`,
      message: "patternMessage must be a string",
    });
  }

  if (fieldType === "number") {
    validateNumberValidationRule(v, prefix, errors);
  }
}

function validateNumberValidationRule(
  v: Record<string, unknown>,
  prefix: string,
  errors: ValidationError[],
): void {
  const path = `${prefix}.validation`;
  const { min, max, step, integer } = v;

  if (min !== undefined && (typeof min !== "number" || !Number.isFinite(min))) {
    errors.push({ path: `${path}.min`, message: "min must be a finite number" });
  }
  if (max !== undefined && (typeof max !== "number" || !Number.isFinite(max))) {
    errors.push({ path: `${path}.max`, message: "max must be a finite number" });
  }
  if (
    typeof min === "number" &&
    typeof max === "number" &&
    Number.isFinite(min) &&
    Number.isFinite(max) &&
    min > max
  ) {
    errors.push({
      path: `${path}.min`,
      message: `min (${min}) must be <= max (${max})`,
    });
  }

  if (step !== undefined) {
    if (typeof step !== "number" || !Number.isFinite(step)) {
      errors.push({
        path: `${path}.step`,
        message: "step must be a finite number",
      });
    } else if (step <= 0) {
      errors.push({ path: `${path}.step`, message: "step must be > 0" });
    }
  }

  if (integer !== undefined && typeof integer !== "boolean") {
    errors.push({
      path: `${path}.integer`,
      message: "integer must be a boolean",
    });
  }
}

function validateOptions(
  options: unknown,
  prefix: string,
  errors: ValidationError[],
): void {
  if (!Array.isArray(options)) {
    errors.push({
      path: `${prefix}.options`,
      message: "options must be an array",
    });
    return;
  }
  if (options.length === 0) {
    errors.push({
      path: `${prefix}.options`,
      message: "options array must not be empty",
    });
  }

  const seenValues = new Set<string>();
  options.forEach((opt, i) => {
    const optPrefix = `${prefix}.options[${i}]`;
    if (opt === null || typeof opt !== "object") {
      errors.push({
        path: optPrefix,
        message: "option must be a non-null object",
      });
      return;
    }
    const o = opt as Record<string, unknown>;
    if (typeof o.value !== "string" || o.value.trim() === "") {
      errors.push({
        path: `${optPrefix}.value`,
        message: "option value must be a non-empty string",
      });
    } else if (seenValues.has(o.value)) {
      errors.push({
        path: `${optPrefix}.value`,
        message: `Duplicate option value: "${o.value}"`,
      });
    } else {
      seenValues.add(o.value);
    }
    if (typeof o.label !== "string" || o.label.trim() === "") {
      errors.push({
        path: `${optPrefix}.label`,
        message: "option label must be a non-empty string",
      });
    }
    if (o.description !== undefined && typeof o.description !== "string") {
      errors.push({
        path: `${optPrefix}.description`,
        message: "option description must be a string",
      });
    }
  });
}

function validateAllowCustomProps(
  f: Record<string, unknown>,
  prefix: string,
  errors: ValidationError[],
): void {
  if (f.allowCustom !== undefined && typeof f.allowCustom !== "boolean") {
    errors.push({
      path: `${prefix}.allowCustom`,
      message: "allowCustom must be a boolean",
    });
  }
  if (f.customLabel !== undefined && typeof f.customLabel !== "string") {
    errors.push({
      path: `${prefix}.customLabel`,
      message: "customLabel must be a string",
    });
  }
  if (
    f.customPlaceholder !== undefined &&
    typeof f.customPlaceholder !== "string"
  ) {
    errors.push({
      path: `${prefix}.customPlaceholder`,
      message: "customPlaceholder must be a string",
    });
  }
}

function validateHints(
  hints: unknown,
  prefix: string,
  errors: ValidationError[],
): void {
  if (hints === null || typeof hints !== "object" || Array.isArray(hints)) {
    errors.push({
      path: `${prefix}.hints`,
      message: "hints must be a non-null object",
    });
    return;
  }
  const h = hints as Record<string, unknown>;
  if (h.variant !== undefined && typeof h.variant !== "string") {
    errors.push({
      path: `${prefix}.hints.variant`,
      message: "hints.variant must be a string",
    });
  }
  // Other canonical hints are checked only when their renderer cares; unknown
  // keys intentionally pass through so hosts can ship extensions without
  // minor-version bumps.
}

function validateTextField(
  f: Record<string, unknown>,
  prefix: string,
  errors: ValidationError[],
): void {
  if (f.placeholder !== undefined && typeof f.placeholder !== "string") {
    errors.push({
      path: `${prefix}.placeholder`,
      message: "placeholder must be a string",
    });
  }
  if (f.defaultValue !== undefined && typeof f.defaultValue !== "string") {
    errors.push({
      path: `${prefix}.defaultValue`,
      message: "defaultValue must be a string for text fields",
    });
  }
}

function validateBooleanField(
  f: Record<string, unknown>,
  prefix: string,
  errors: ValidationError[],
): void {
  if (f.defaultValue !== undefined && typeof f.defaultValue !== "boolean") {
    errors.push({
      path: `${prefix}.defaultValue`,
      message: "defaultValue must be a boolean for boolean fields",
    });
  }
}

function validateRadioField(
  f: Record<string, unknown>,
  prefix: string,
  errors: ValidationError[],
): void {
  validateOptions(f.options, prefix, errors);
  if (f.defaultValue !== undefined && typeof f.defaultValue !== "string") {
    errors.push({
      path: `${prefix}.defaultValue`,
      message: "defaultValue must be a string for radio fields",
    });
  }
  validateAllowCustomProps(f, prefix, errors);
}

function validateSelectField(
  f: Record<string, unknown>,
  prefix: string,
  errors: ValidationError[],
): void {
  validateOptions(f.options, prefix, errors);
  if (f.multiple !== undefined && typeof f.multiple !== "boolean") {
    errors.push({
      path: `${prefix}.multiple`,
      message: "multiple must be a boolean",
    });
  }
  if (f.placeholder !== undefined && typeof f.placeholder !== "string") {
    errors.push({
      path: `${prefix}.placeholder`,
      message: "placeholder must be a string",
    });
  }
  if (f.defaultValue !== undefined) {
    const isString = typeof f.defaultValue === "string";
    const isStringArray =
      Array.isArray(f.defaultValue) &&
      f.defaultValue.every((v: unknown) => typeof v === "string");
    if (!isString && !isStringArray) {
      errors.push({
        path: `${prefix}.defaultValue`,
        message: "defaultValue must be a string or string[] for select fields",
      });
    }
  }
  validateAllowCustomProps(f, prefix, errors);
}

function validateDateField(
  f: Record<string, unknown>,
  prefix: string,
  errors: ValidationError[],
): void {
  if (f.placeholder !== undefined && typeof f.placeholder !== "string") {
    errors.push({
      path: `${prefix}.placeholder`,
      message: "placeholder must be a string",
    });
  }
  if (f.defaultValue !== undefined && typeof f.defaultValue !== "string") {
    errors.push({
      path: `${prefix}.defaultValue`,
      message: "defaultValue must be a string (ISO 8601) for date fields",
    });
  }
}

function validateNumberField(
  f: Record<string, unknown>,
  prefix: string,
  errors: ValidationError[],
): void {
  if (f.placeholder !== undefined && typeof f.placeholder !== "string") {
    errors.push({
      path: `${prefix}.placeholder`,
      message: "placeholder must be a string",
    });
  }
  if (f.defaultValue !== undefined) {
    if (
      typeof f.defaultValue !== "number" ||
      !Number.isFinite(f.defaultValue)
    ) {
      errors.push({
        path: `${prefix}.defaultValue`,
        message: "defaultValue must be a finite number for number fields",
      });
    } else if (
      f.validation !== undefined &&
      typeof f.validation === "object" &&
      f.validation !== null
    ) {
      const v = f.validation as Record<string, unknown>;
      if (v.integer === true && !Number.isInteger(f.defaultValue)) {
        errors.push({
          path: `${prefix}.defaultValue`,
          message: "defaultValue must be an integer when validation.integer is true",
        });
      }
    }
  }
}

function validateFileField(
  f: Record<string, unknown>,
  prefix: string,
  errors: ValidationError[],
): void {
  if (f.accept !== undefined && typeof f.accept !== "string") {
    errors.push({
      path: `${prefix}.accept`,
      message: "accept must be a string",
    });
  }
  if (f.maxSizeBytes !== undefined) {
    if (
      typeof f.maxSizeBytes !== "number" ||
      !Number.isFinite(f.maxSizeBytes) ||
      f.maxSizeBytes <= 0 ||
      !Number.isInteger(f.maxSizeBytes)
    ) {
      errors.push({
        path: `${prefix}.maxSizeBytes`,
        message: "maxSizeBytes must be a positive integer",
      });
    }
  }
  if (f.multiple !== undefined && typeof f.multiple !== "boolean") {
    errors.push({
      path: `${prefix}.multiple`,
      message: "multiple must be a boolean",
    });
  }
  if (f.defaultValue !== undefined) {
    errors.push({
      path: `${prefix}.defaultValue`,
      message: "file fields do not support defaultValue",
    });
  }
}

// ---- showIf ----

function validateShowIfRule(
  rule: unknown,
  path: string,
  errors: ValidationError[],
): void {
  if (rule === null || typeof rule !== "object" || Array.isArray(rule)) {
    errors.push({ path, message: "showIf must be an object" });
    return;
  }
  const r = rule as Record<string, unknown>;

  if ("allOf" in r) {
    if (!Array.isArray(r.allOf)) {
      errors.push({
        path: `${path}.allOf`,
        message: "allOf must be an array of rules",
      });
      return;
    }
    r.allOf.forEach((sub, i) =>
      validateShowIfRule(sub, `${path}.allOf[${i}]`, errors),
    );
    return;
  }
  if ("anyOf" in r) {
    if (!Array.isArray(r.anyOf)) {
      errors.push({
        path: `${path}.anyOf`,
        message: "anyOf must be an array of rules",
      });
      return;
    }
    r.anyOf.forEach((sub, i) =>
      validateShowIfRule(sub, `${path}.anyOf[${i}]`, errors),
    );
    return;
  }
  if ("not" in r) {
    validateShowIfRule(r.not, `${path}.not`, errors);
    return;
  }

  if (typeof r.field !== "string" || r.field.trim() === "") {
    errors.push({
      path: `${path}.field`,
      message: "showIf leaf rule must have a non-empty 'field' string",
    });
    return;
  }

  const hasEquals = "equals" in r;
  const hasIn = "in" in r;
  const hasNotEmpty = "notEmpty" in r;
  const count = Number(hasEquals) + Number(hasIn) + Number(hasNotEmpty);

  if (count !== 1) {
    errors.push({
      path,
      message:
        "showIf leaf rule must have exactly one of: equals, in, notEmpty",
    });
    return;
  }

  if (hasEquals) {
    const val = r.equals;
    if (
      typeof val !== "string" &&
      typeof val !== "number" &&
      typeof val !== "boolean"
    ) {
      errors.push({
        path: `${path}.equals`,
        message: "equals must be a string, number, or boolean literal",
      });
    }
  }
  if (hasIn) {
    if (!Array.isArray(r.in) || r.in.length === 0) {
      errors.push({
        path: `${path}.in`,
        message: "in must be a non-empty array of literals",
      });
    } else {
      r.in.forEach((v, i) => {
        if (
          typeof v !== "string" &&
          typeof v !== "number" &&
          typeof v !== "boolean"
        ) {
          errors.push({
            path: `${path}.in[${i}]`,
            message: "in entries must be string, number, or boolean literals",
          });
        }
      });
    }
  }
  if (hasNotEmpty) {
    if (r.notEmpty !== true) {
      errors.push({
        path: `${path}.notEmpty`,
        message: "notEmpty must be the literal true",
      });
    }
  }
}

function validateShowIfReferences(
  rawFields: unknown[],
  retainedFieldIds: Set<string>,
  errors: ValidationError[],
): void {
  rawFields.forEach((field, index) => {
    if (field === null || typeof field !== "object") return;
    const f = field as Record<string, unknown>;
    if (f.showIf === undefined) return;
    if (typeof f.id !== "string") return;
    const prefix = `fields[${index}].showIf`;
    const deps = tryCollectDeps(f.showIf);
    if (deps === null) return;
    for (const dep of deps) {
      if (dep === f.id) {
        errors.push({
          path: prefix,
          message: `showIf on field "${f.id}" cannot reference itself`,
        });
        continue;
      }
      if (!retainedFieldIds.has(dep)) {
        errors.push({
          path: prefix,
          message: `showIf references unknown field "${dep}"`,
        });
      }
    }
  });
}

function tryCollectDeps(rule: unknown): Set<string> | null {
  try {
    return collectShowIfDependencies(rule as ShowIfRule);
  } catch {
    return null;
  }
}

function validateShowIfCycles(
  rawFields: unknown[],
  errors: ValidationError[],
): void {
  const entries: Array<{ id: string; showIf?: ShowIfRule }> = [];
  for (const field of rawFields) {
    if (field === null || typeof field !== "object") continue;
    const f = field as Record<string, unknown>;
    if (typeof f.id !== "string") continue;
    entries.push({
      id: f.id,
      showIf: f.showIf === undefined ? undefined : (f.showIf as ShowIfRule),
    });
  }
  const cycle = findShowIfCycle(entries);
  if (cycle !== null) {
    errors.push({
      path: "fields",
      message: `showIf dependency cycle detected: ${cycle.join(" -> ")}`,
    });
  }
}

// ---- sections ----

function validateSections(
  rawSections: unknown,
  retainedFieldIds: Set<string>,
  errors: ValidationError[],
): void {
  if (!Array.isArray(rawSections)) {
    errors.push({ path: "sections", message: "sections must be an array" });
    return;
  }

  const seenSectionIds = new Set<string>();
  const fieldToSection = new Map<string, string>();
  const assignedFields = new Set<string>();

  rawSections.forEach((section, i) => {
    const path = `sections[${i}]`;
    if (section === null || typeof section !== "object") {
      errors.push({ path, message: "section must be a non-null object" });
      return;
    }
    const s = section as Record<string, unknown>;

    if (typeof s.id !== "string" || s.id.trim() === "") {
      errors.push({
        path: `${path}.id`,
        message: "section id must be a non-empty string",
      });
    } else if (seenSectionIds.has(s.id)) {
      errors.push({
        path: `${path}.id`,
        message: `Duplicate section id: "${s.id}"`,
      });
    } else {
      seenSectionIds.add(s.id);
    }

    if (s.title !== undefined && typeof s.title !== "string") {
      errors.push({ path: `${path}.title`, message: "title must be a string" });
    }
    if (s.description !== undefined && typeof s.description !== "string") {
      errors.push({
        path: `${path}.description`,
        message: "description must be a string",
      });
    }

    if (!Array.isArray(s.fieldIds)) {
      errors.push({
        path: `${path}.fieldIds`,
        message: "fieldIds must be an array of field id strings",
      });
      return;
    }

    s.fieldIds.forEach((fid, j) => {
      const fpath = `${path}.fieldIds[${j}]`;
      if (typeof fid !== "string" || fid.trim() === "") {
        errors.push({
          path: fpath,
          message: "fieldIds entry must be a non-empty string",
        });
        return;
      }
      if (!retainedFieldIds.has(fid)) {
        errors.push({
          path: fpath,
          message: `fieldIds references unknown field "${fid}"`,
        });
        return;
      }
      if (fieldToSection.has(fid)) {
        errors.push({
          path: fpath,
          message: `field "${fid}" already belongs to section "${fieldToSection.get(fid)}"`,
        });
        return;
      }
      if (typeof s.id === "string") {
        fieldToSection.set(fid, s.id);
      }
      assignedFields.add(fid);
    });
  });

  for (const fid of retainedFieldIds) {
    if (!assignedFields.has(fid)) {
      errors.push({
        path: "sections",
        message: `field "${fid}" is not assigned to any section. When sections is present, every field must belong to exactly one section.`,
      });
    }
  }
}

// ---- Capability helpers ----

function checkFeatureCapabilities(
  f: Record<string, unknown>,
  prefix: string,
  features: ResolvedFeatures,
  forwardCompat: "strict" | "lenient",
  errors: ValidationError[],
  warnings: ValidationWarning[],
): void {
  const report = (subpath: string, message: string): void => {
    const path = `${prefix}.${subpath}`;
    if (forwardCompat === "lenient") {
      warnings.push({ path, message: `${message}; stripped.` });
    } else {
      errors.push({ path, message });
    }
  };

  if (!features.showIf && f.showIf !== undefined) {
    report("showIf", "showIf is not allowed by capabilities.features.showIf");
  }
  if (!features.allowCustom && f.allowCustom === true) {
    report(
      "allowCustom",
      "allowCustom is not allowed by capabilities.features.allowCustom",
    );
  }
  if (!features.readOnly && f.readOnly === true) {
    report(
      "readOnly",
      "readOnly is not allowed by capabilities.features.readOnly",
    );
  }
  if (!features.disabled && f.disabled === true) {
    report(
      "disabled",
      "disabled is not allowed by capabilities.features.disabled",
    );
  }
  if (!features.optionDescriptions && Array.isArray(f.options)) {
    (f.options as unknown[]).forEach((opt, j) => {
      if (opt !== null && typeof opt === "object") {
        const o = opt as Record<string, unknown>;
        if (typeof o.description === "string") {
          report(
            `options[${j}].description`,
            "option descriptions are not allowed by capabilities.features.optionDescriptions",
          );
        }
      }
    });
  }
}

function checkVariantCapability(
  f: Record<string, unknown>,
  prefix: string,
  capabilities: FormloomCapabilities,
  forwardCompat: "strict" | "lenient",
  errors: ValidationError[],
  warnings: ValidationWarning[],
): void {
  if (capabilities.variants === undefined) return;
  if (f.hints === null || typeof f.hints !== "object") return;
  const variant = (f.hints as Record<string, unknown>).variant;
  if (typeof variant !== "string") return;
  if (isVariantAllowed(capabilities, variant)) return;

  const path = `${prefix}.hints.variant`;
  const detail =
    capabilities.variants === false
      ? "capabilities.variants forbids all variants"
      : `capabilities.variants allows only: ${capabilities.variants.join(", ")}`;
  const message = `variant "${variant}" is not allowed (${detail})`;
  if (forwardCompat === "lenient") {
    warnings.push({ path, message: `${message}; stripped.` });
  } else {
    errors.push({ path, message });
  }
}

function checkMaxOptionsCapability(
  f: Record<string, unknown>,
  prefix: string,
  capabilities: FormloomCapabilities,
  forwardCompat: "strict" | "lenient",
  errors: ValidationError[],
  warnings: ValidationWarning[],
): void {
  if (capabilities.maxOptions === undefined) return;
  if (!Array.isArray(f.options)) return;
  const count = (f.options as unknown[]).length;
  if (count <= capabilities.maxOptions) return;

  const path = `${prefix}.options`;
  const message = `options length ${count} exceeds capabilities.maxOptions (${capabilities.maxOptions})`;
  if (forwardCompat === "lenient") {
    warnings.push({ path, message: `${message}; trailing options would be truncated.` });
  } else {
    errors.push({ path, message });
  }
}
