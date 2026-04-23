import type { FormloomSchema } from "@formloom/schema";

/**
 * A hand-rolled library of schemas that simulate LLM output. The demo picks
 * from this list and pretends it came from OpenAI / Anthropic / a text model.
 * Covers every schema feature end-to-end across the three LLM integration
 * paths — schema validator + parser see the same shapes a real model emits.
 */
export const schemaLibrary: Record<string, FormloomSchema> = {
  jobApplication: {
    version: "1.2",
    title: "Job application",
    description:
      "Covers number + file fields, showIf, sections, hints, and v1.2 option descriptions.",
    fields: [
      { id: "full_name", type: "text", label: "Full name", validation: { required: true } },
      {
        id: "email",
        type: "text",
        label: "Email",
        validation: {
          required: true,
          pattern: "^[^@]+@[^@]+\\.[^@]+$",
          patternMessage: "Enter a valid email",
        },
      },
      {
        id: "years_experience",
        type: "number",
        label: "Years of experience",
        validation: { min: 0, max: 60, integer: true, required: true },
      },
      {
        id: "employment_type",
        type: "radio",
        label: "Employment type",
        options: [
          {
            value: "full_time",
            label: "Full-time",
            description: "Salary plus benefits",
          },
          {
            value: "contract",
            label: "Contract",
            description: "Invoiced by the day — answer the rate question below",
          },
        ],
        validation: { required: true },
      },
      {
        id: "day_rate",
        type: "number",
        label: "Day rate (USD)",
        showIf: { field: "employment_type", equals: "contract" },
        validation: { min: 1, integer: true },
      },
      {
        id: "bio",
        type: "text",
        label: "Short bio",
        hints: { display: "textarea", rows: 5 },
      },
      {
        id: "resume",
        type: "file",
        label: "Resume",
        accept: "application/pdf,.pdf",
        maxSizeBytes: 2_000_000,
        validation: { required: true },
      },
    ],
    sections: [
      { id: "you", title: "About you", fieldIds: ["full_name", "email", "years_experience"] },
      { id: "role", title: "The role", fieldIds: ["employment_type", "day_rate"] },
      { id: "docs", title: "Documents", fieldIds: ["bio", "resume"] },
    ],
    submitLabel: "Submit application",
  },

  crmOnboarding: {
    version: "1.2",
    title: "CRM onboarding",
    description:
      "v1.2 features end-to-end: allowCustom on radio + multi-select, hints.variant, readOnly.",
    fields: [
      {
        id: "account_id",
        type: "text",
        label: "Account ID",
        defaultValue: "acct_8a4d2e",
        readOnly: true,
        description: "Assigned by the workspace.",
      },
      {
        id: "crm",
        type: "radio",
        label: "Which CRM do you use?",
        options: [
          { value: "salesforce", label: "Salesforce" },
          { value: "hubspot", label: "HubSpot" },
          { value: "pipedrive", label: "Pipedrive" },
        ],
        allowCustom: true,
        customLabel: "Other CRM",
        customPlaceholder: "e.g. Zoho",
      },
      {
        id: "integrations",
        type: "select",
        label: "Which tools should we connect?",
        multiple: true,
        options: [
          { value: "slack", label: "Slack" },
          { value: "notion", label: "Notion" },
          { value: "linear", label: "Linear" },
        ],
        allowCustom: true,
        hints: { variant: "tool-select" },
      },
    ],
    submitLabel: "Finish setup",
  },

  appointmentBooking: {
    version: "1.2",
    title: "Appointment booking",
    fields: [
      {
        id: "service",
        type: "select",
        label: "Service",
        options: [
          { value: "consultation", label: "Initial consultation" },
          { value: "followup", label: "Follow-up" },
        ],
        validation: { required: true },
      },
      { id: "date", type: "date", label: "Preferred date", validation: { required: true } },
      { id: "patient_name", type: "text", label: "Patient name", validation: { required: true } },
      {
        id: "insurance",
        type: "boolean",
        label: "Will you be using insurance?",
        defaultValue: false,
      },
      {
        id: "insurance_provider",
        type: "text",
        label: "Insurance provider",
        showIf: { field: "insurance", equals: true },
        validation: { required: true },
      },
    ],
  },

  contactPreferences: {
    version: "1.2",
    title: "Contact preferences",
    fields: [
      { id: "name", type: "text", label: "Name", validation: { required: true } },
      {
        id: "channels",
        type: "select",
        label: "Preferred channels",
        multiple: true,
        options: [
          { value: "email", label: "Email" },
          { value: "sms", label: "SMS" },
          { value: "phone", label: "Phone" },
        ],
        validation: { required: true },
      },
      {
        id: "phone",
        type: "text",
        label: "Phone number",
        showIf: {
          anyOf: [
            { field: "channels", notEmpty: true },
          ],
        },
        validation: {
          pattern: "^\\+?[0-9 ()-]{7,}$",
          patternMessage: "Enter a valid phone number",
        },
      },
    ],
  },
};
