/**
 * Canonical JSON Schema for the formloom_collect tool parameters.
 *
 * This is the single source of truth. All provider-specific tool definitions
 * and the OpenAI response_format export wrap this schema; editing it in one
 * place keeps every provider in sync.
 *
 * The schema is draft-07 compatible. It intentionally leaves `additionalProperties`
 * unset on field objects so future minor versions can add properties without
 * breaking older runtimes that emitted the schema. The `hints` object is
 * explicitly `additionalProperties: true` so custom rendering hints pass through.
 */

export const FORMLOOM_PARAMETERS = {
  type: "object" as const,
  required: ["version", "fields"],
  properties: {
    version: {
      type: "string",
      enum: ["1.0", "1.1"],
      description:
        "Schema version. Use '1.1' for new schemas; '1.0' is accepted for backward compatibility.",
    },
    title: {
      type: "string",
      description: "Form title displayed to the user.",
    },
    description: {
      type: "string",
      description: "Form description or instructions.",
    },
    submitLabel: {
      type: "string",
      description: "Custom submit button label. Defaults to 'Submit'.",
    },
    fields: {
      type: "array",
      minItems: 1,
      description: "The form fields in display order.",
      items: {
        type: "object",
        required: ["id", "type", "label"],
        properties: {
          id: {
            type: "string",
            description:
              "Unique field identifier (snake_case). Used as the key in submitted data.",
          },
          type: {
            type: "string",
            enum: [
              "text",
              "boolean",
              "radio",
              "select",
              "date",
              "number",
              "file",
            ],
            description:
              "Rendering primitive. Meaning comes from the combination of type + validation + hints.",
          },
          label: {
            type: "string",
            description: "Human-readable label.",
          },
          description: {
            type: "string",
            description: "Helper text shown below the field.",
          },
          placeholder: {
            type: "string",
            description: "Placeholder text (for text, select, date, number).",
          },
          defaultValue: {
            description:
              "Pre-filled value. String for text/radio/date, boolean for boolean, string or string[] for select, number for number. File fields do not support defaultValue.",
          },
          options: {
            type: "array",
            description:
              "Options for radio and select fields. Each must have value and label.",
            items: {
              type: "object",
              required: ["value", "label"],
              properties: {
                value: { type: "string" },
                label: { type: "string" },
              },
            },
          },
          multiple: {
            type: "boolean",
            description:
              "For select fields: allow multiple selections. For file fields: allow multiple files.",
          },
          accept: {
            type: "string",
            description:
              "For file fields: MIME-style accept list, e.g. 'image/*,application/pdf'.",
          },
          maxSizeBytes: {
            type: "integer",
            minimum: 1,
            description:
              "For file fields: maximum byte size per file. Keep small — inline base64 is bound by LLM tool-result size limits.",
          },
          validation: {
            type: "object",
            description: "Validation rules.",
            properties: {
              required: { type: "boolean" },
              pattern: {
                type: "string",
                description:
                  "Regex pattern (without delimiters). Avoid nested quantifiers and overlapping alternations — catastrophic patterns are rejected.",
              },
              patternMessage: {
                type: "string",
                description: "Error message if pattern fails.",
              },
              min: {
                type: "number",
                description: "For number fields: inclusive minimum value.",
              },
              max: {
                type: "number",
                description: "For number fields: inclusive maximum value.",
              },
              step: {
                type: "number",
                exclusiveMinimum: 0,
                description: "For number fields: granularity. Must be > 0.",
              },
              integer: {
                type: "boolean",
                description:
                  "For number fields: when true, only whole numbers are accepted.",
              },
            },
          },
          hints: {
            type: "object",
            description:
              "Optional rendering hints. Canonical keys: display (textarea|password|toggle|stepper), width (full|half|third), rows (integer), autocomplete (HTML token). Unknown hints pass through.",
            additionalProperties: true,
          },
          showIf: {
            description:
              "Visibility rule. Fields are hidden and omitted from submitted data when the rule evaluates false. Supports {field,equals}, {field,in}, {field,notEmpty:true}, {allOf}, {anyOf}, {not}.",
          },
        },
      },
    },
    sections: {
      type: "array",
      description:
        "Optional grouping of fields into visual sections. When present, every field id must appear in exactly one section.",
      items: {
        type: "object",
        required: ["id", "fieldIds"],
        properties: {
          id: { type: "string" },
          title: { type: "string" },
          description: { type: "string" },
          fieldIds: {
            type: "array",
            items: { type: "string" },
          },
        },
      },
    },
  },
} as const;

export const FORMLOOM_TOOL_NAME = "formloom_collect";

export const FORMLOOM_TOOL_DESCRIPTION =
  "Present a structured form to the user to collect information. Use this instead of asking questions in plain text when you need structured data. The tool returns clean, validated form data keyed by field id.";
