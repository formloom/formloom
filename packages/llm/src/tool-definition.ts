/**
 * JSON Schema for the formloom_collect tool parameters.
 * Shared between OpenAI and Anthropic format adapters.
 */
const FORMLOOM_PARAMETERS = {
  type: "object" as const,
  required: ["version", "fields"],
  properties: {
    version: {
      type: "string",
      enum: ["1.0"],
      description: "Schema version. Always '1.0'.",
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
              "Unique field identifier (snake_case). Used as key in submitted data.",
          },
          type: {
            type: "string",
            enum: ["text", "boolean", "radio", "select", "date"],
            description: "Rendering primitive type.",
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
            description: "Placeholder text (for text, select, date).",
          },
          defaultValue: {
            description:
              "Pre-filled value. String for text/radio/date, boolean for boolean, string or string[] for select.",
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
            description: "For select fields: allow multiple selections.",
          },
          validation: {
            type: "object",
            properties: {
              required: { type: "boolean" },
              pattern: {
                type: "string",
                description: "Regex pattern (without delimiters).",
              },
              patternMessage: {
                type: "string",
                description: "Error message if pattern fails.",
              },
            },
          },
          hints: {
            type: "object",
            description:
              "Optional rendering hints. Renderers ignore unknown hints.",
            additionalProperties: true,
          },
        },
      },
    },
  },
} as const;

const TOOL_NAME = "formloom_collect";
const TOOL_DESCRIPTION =
  "Present a structured form to the user to collect information. Use this instead of asking questions in plain text when you need structured data.";

/**
 * Formloom tool definition for OpenAI function calling format.
 * Also compatible with other providers that follow the OpenAI tool schema.
 */
export const FORMLOOM_TOOL_OPENAI = {
  type: "function" as const,
  function: {
    name: TOOL_NAME,
    description: TOOL_DESCRIPTION,
    parameters: FORMLOOM_PARAMETERS,
  },
};

/**
 * Formloom tool definition for Anthropic Claude tool_use format.
 */
export const FORMLOOM_TOOL_ANTHROPIC = {
  name: TOOL_NAME,
  description: TOOL_DESCRIPTION,
  input_schema: FORMLOOM_PARAMETERS,
};
