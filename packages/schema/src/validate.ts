import { FORMLOOM_SCHEMA_VERSION, FIELD_TYPES } from "./types";

export interface ValidationError {
  path: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

/**
 * Validates a Formloom schema object.
 *
 * Collects ALL errors rather than failing on the first one,
 * so developers can fix LLM output comprehensively.
 */
export function validateSchema(input: unknown): ValidationResult {
  const errors: ValidationError[] = [];

  if (input === null || typeof input !== "object") {
    return {
      valid: false,
      errors: [{ path: "", message: "Schema must be a non-null object" }],
    };
  }

  const schema = input as Record<string, unknown>;

  if (schema.version !== FORMLOOM_SCHEMA_VERSION) {
    errors.push({
      path: "version",
      message: `Expected version "${FORMLOOM_SCHEMA_VERSION}", got "${String(schema.version)}"`,
    });
  }

  if (schema.title !== undefined && typeof schema.title !== "string") {
    errors.push({ path: "title", message: "Title must be a string" });
  }

  if (
    schema.description !== undefined &&
    typeof schema.description !== "string"
  ) {
    errors.push({
      path: "description",
      message: "Description must be a string",
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
    errors.push({ path: "fields", message: "Fields must be an array" });
    return { valid: false, errors };
  }

  if (schema.fields.length === 0) {
    errors.push({
      path: "fields",
      message: "Fields array must not be empty",
    });
  }

  const seenIds = new Set<string>();

  (schema.fields as unknown[]).forEach((field, index) => {
    const prefix = `fields[${index}]`;

    if (field === null || typeof field !== "object") {
      errors.push({
        path: prefix,
        message: "Field must be a non-null object",
      });
      return;
    }

    const f = field as Record<string, unknown>;

    if (typeof f.id !== "string" || f.id.trim() === "") {
      errors.push({
        path: `${prefix}.id`,
        message: "Field id must be a non-empty string",
      });
    } else if (seenIds.has(f.id)) {
      errors.push({
        path: `${prefix}.id`,
        message: `Duplicate field id: "${f.id}"`,
      });
    } else {
      seenIds.add(f.id);
    }

    if (!FIELD_TYPES.includes(f.type as (typeof FIELD_TYPES)[number])) {
      errors.push({
        path: `${prefix}.type`,
        message: `Invalid field type "${String(f.type)}". Must be one of: ${FIELD_TYPES.join(", ")}`,
      });
      return;
    }

    if (typeof f.label !== "string" || f.label.trim() === "") {
      errors.push({
        path: `${prefix}.label`,
        message: "Field label must be a non-empty string",
      });
    }

    if (f.validation !== undefined) {
      validateValidationRules(f.validation, prefix, errors);
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
    }
  });

  return { valid: errors.length === 0, errors };
}

function validateValidationRules(
  validation: unknown,
  prefix: string,
  errors: ValidationError[],
): void {
  if (typeof validation !== "object" || validation === null) {
    errors.push({
      path: `${prefix}.validation`,
      message: "Validation must be an object",
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
    } else {
      try {
        new RegExp(v.pattern);
      } catch {
        errors.push({
          path: `${prefix}.validation.pattern`,
          message: `Invalid regex pattern: "${v.pattern}"`,
        });
      }
    }
  }

  if (v.patternMessage !== undefined && typeof v.patternMessage !== "string") {
    errors.push({
      path: `${prefix}.validation.patternMessage`,
      message: "patternMessage must be a string",
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
      message: "Options must be an array",
    });
    return;
  }

  if (options.length === 0) {
    errors.push({
      path: `${prefix}.options`,
      message: "Options array must not be empty",
    });
  }

  const seenValues = new Set<string>();

  options.forEach((opt, i) => {
    const optPrefix = `${prefix}.options[${i}]`;

    if (opt === null || typeof opt !== "object") {
      errors.push({
        path: optPrefix,
        message: "Option must be a non-null object",
      });
      return;
    }

    const o = opt as Record<string, unknown>;

    if (typeof o.value !== "string" || o.value.trim() === "") {
      errors.push({
        path: `${optPrefix}.value`,
        message: "Option value must be a non-empty string",
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
        message: "Option label must be a non-empty string",
      });
    }
  });
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
        message:
          "defaultValue must be a string or string[] for select fields",
      });
    }
  }
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
      message:
        "defaultValue must be a string (ISO 8601) for date fields",
    });
  }
}
