import type { FormloomSchema } from "@formloom/schema";

export const contactSchema: FormloomSchema = {
  version: "1.0",
  title: "Contact Information",
  description: "Please provide your contact details so we can reach you.",
  fields: [
    {
      id: "full_name",
      type: "text",
      label: "Full Name",
      placeholder: "Jane Doe",
      validation: { required: true },
    },
    {
      id: "email",
      type: "text",
      label: "Email Address",
      placeholder: "jane@example.com",
      validation: {
        required: true,
        pattern: "^[^@]+@[^@]+\\.[^@]+$",
        patternMessage: "Please enter a valid email address",
      },
    },
    {
      id: "preferred_contact",
      type: "radio",
      label: "Preferred Contact Method",
      options: [
        { value: "email", label: "Email" },
        { value: "phone", label: "Phone" },
        { value: "text", label: "Text Message" },
      ],
      defaultValue: "email",
    },
    {
      id: "newsletter",
      type: "boolean",
      label: "Subscribe to newsletter",
      description: "We send updates about once a month.",
      defaultValue: false,
    },
  ],
  submitLabel: "Save Contact Info",
};

export const feedbackSchema: FormloomSchema = {
  version: "1.0",
  title: "Product Feedback",
  description: "Help us improve by sharing your experience.",
  fields: [
    {
      id: "rating",
      type: "radio",
      label: "Overall Satisfaction",
      options: [
        { value: "1", label: "Very Dissatisfied" },
        { value: "2", label: "Dissatisfied" },
        { value: "3", label: "Neutral" },
        { value: "4", label: "Satisfied" },
        { value: "5", label: "Very Satisfied" },
      ],
      validation: { required: true },
    },
    {
      id: "features",
      type: "select",
      label: "Which features do you use most?",
      options: [
        { value: "dashboard", label: "Dashboard" },
        { value: "reports", label: "Reports" },
        { value: "integrations", label: "Integrations" },
        { value: "api", label: "API" },
        { value: "mobile", label: "Mobile App" },
      ],
      multiple: true,
      placeholder: "Select features...",
    },
    {
      id: "improvement",
      type: "text",
      label: "What could we improve?",
      placeholder: "Tell us what you think...",
    },
    {
      id: "recommend",
      type: "boolean",
      label: "Would you recommend us to a friend?",
    },
  ],
  submitLabel: "Submit Feedback",
};

export const bookingSchema: FormloomSchema = {
  version: "1.0",
  title: "Appointment Booking",
  description: "Schedule your appointment with us.",
  fields: [
    {
      id: "service",
      type: "select",
      label: "Service",
      options: [
        { value: "consultation", label: "Initial Consultation (30 min)" },
        { value: "followup", label: "Follow-up (15 min)" },
        { value: "extended", label: "Extended Session (60 min)" },
      ],
      placeholder: "Choose a service...",
      validation: { required: true },
    },
    {
      id: "preferred_date",
      type: "date",
      label: "Preferred Date",
      placeholder: "YYYY-MM-DD",
      validation: { required: true },
    },
    {
      id: "patient_name",
      type: "text",
      label: "Patient Name",
      validation: { required: true },
    },
    {
      id: "notes",
      type: "text",
      label: "Additional Notes",
      placeholder: "Any special requirements or concerns...",
    },
  ],
  submitLabel: "Book Appointment",
};

export const jobApplicationSchema: FormloomSchema = {
  version: "1.1",
  title: "Job Application",
  description:
    "Demonstrates v1.1: number and file fields, conditional visibility, sections, and hints.",
  fields: [
    {
      id: "full_name",
      type: "text",
      label: "Full Name",
      validation: { required: true },
    },
    {
      id: "email",
      type: "text",
      label: "Email",
      validation: {
        required: true,
        pattern: "^[^@]+@[^@]+\\.[^@]+$",
        patternMessage: "Please enter a valid email address",
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
        { value: "full_time", label: "Full-time" },
        { value: "contract", label: "Contract" },
      ],
      validation: { required: true },
    },
    {
      id: "contract_rate",
      type: "number",
      label: "Contract day rate (USD)",
      showIf: { field: "employment_type", equals: "contract" },
      validation: { min: 1, step: 1 },
    },
    {
      id: "cover_letter",
      type: "text",
      label: "Cover letter",
      hints: { display: "textarea", rows: 6 },
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
    {
      id: "about_you",
      title: "About you",
      fieldIds: ["full_name", "email", "years_experience"],
    },
    {
      id: "role",
      title: "The role",
      fieldIds: ["employment_type", "contract_rate"],
    },
    {
      id: "documents",
      title: "Documents",
      fieldIds: ["cover_letter", "resume"],
    },
  ],
  submitLabel: "Submit application",
};

export const onboardingWizardSchema: FormloomSchema = {
  version: "1.2",
  title: "Team onboarding",
  description:
    "Demonstrates v1.2: option descriptions, allowCustom, hints.variant, readOnly, and the wizard stepper.",
  fields: [
    {
      id: "account_id",
      type: "text",
      label: "Account ID",
      defaultValue: "acct_1234",
      readOnly: true,
      description: "Tied to your workspace — can't be changed here.",
    },
    {
      id: "reporting",
      type: "radio",
      label: "Reporting cadence",
      options: [
        {
          value: "hourly",
          label: "Hourly",
          description: "Brief status updates every hour during work hours",
        },
        {
          value: "eod",
          label: "End-of-day summary",
          description: "One consolidated report at 5 PM",
        },
        {
          value: "incident_only",
          label: "Incident only",
          description: "Only notify when something breaks",
        },
      ],
      defaultValue: "eod",
      validation: { required: true },
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
      id: "tools",
      type: "select",
      label: "Tools to enable",
      multiple: true,
      options: [
        { value: "jira", label: "Jira" },
        { value: "linear", label: "Linear" },
        { value: "notion", label: "Notion" },
      ],
      allowCustom: true,
      customLabel: "Other tool",
      hints: { variant: "tool-select" },
    },
  ],
  sections: [
    { id: "account", title: "Account", fieldIds: ["account_id"] },
    { id: "cadence", title: "Cadence", fieldIds: ["reporting"] },
    { id: "stack", title: "Stack", fieldIds: ["crm", "tools"] },
  ],
  submitLabel: "Finish onboarding",
};

export const hintsShowcaseSchema: FormloomSchema = {
  version: "1.2",
  title: "Rendering hints tour",
  description:
    "Every canonical hint in one form: textarea, password, toggle, stepper, width, autocomplete.",
  fields: [
    {
      id: "account_email",
      type: "text",
      label: "Email",
      placeholder: "you@example.com",
      hints: { autocomplete: "email", width: "half" },
      validation: {
        required: true,
        pattern: "^[^@]+@[^@]+\\.[^@]+$",
        patternMessage: "Enter a valid email",
      },
    },
    {
      id: "account_password",
      type: "text",
      label: "Password",
      hints: { display: "password", width: "half", autocomplete: "new-password" },
      validation: { required: true },
    },
    {
      id: "street",
      type: "text",
      label: "Street address",
      hints: { autocomplete: "street-address" },
    },
    {
      id: "marketing_opt_in",
      type: "boolean",
      label: "Send me product updates",
      hints: { display: "toggle" },
      defaultValue: false,
    },
    {
      id: "seats",
      type: "number",
      label: "Seats",
      hints: { display: "stepper" },
      validation: { min: 1, max: 20, integer: true, required: true },
      defaultValue: 3,
    },
    {
      id: "notes",
      type: "text",
      label: "Notes",
      placeholder: "Anything else we should know?",
      hints: { display: "textarea", rows: 4 },
    },
  ],
  submitLabel: "Save preferences",
};

export const asyncValidationSchema: FormloomSchema = {
  version: "1.2",
  title: "Pick a username",
  description:
    "Demonstrates async validators — the username check runs against a mock registry (try 'alice' or 'bob').",
  fields: [
    {
      id: "username",
      type: "text",
      label: "Username",
      placeholder: "Your chosen handle",
      validation: {
        required: true,
        pattern: "^[a-z0-9_]{3,20}$",
        patternMessage: "3-20 chars, lowercase letters / numbers / underscore",
      },
    },
    {
      id: "display_name",
      type: "text",
      label: "Display name",
    },
  ],
  submitLabel: "Claim username",
};

export const reviewModeSchema: FormloomSchema = {
  version: "1.2",
  title: "Order summary",
  description:
    "Read-only + disabled state demo. The billing address is locked (disabled); the account id is a display-only summary (readOnly).",
  fields: [
    {
      id: "account_id",
      type: "text",
      label: "Account ID",
      defaultValue: "acct_9f4ce2",
      readOnly: true,
      description: "Tied to your workspace — can't be edited here.",
    },
    {
      id: "plan",
      type: "radio",
      label: "Plan",
      options: [
        { value: "starter", label: "Starter", description: "Up to 5 seats" },
        { value: "pro", label: "Pro", description: "Up to 25 seats" },
      ],
      defaultValue: "pro",
    },
    {
      id: "billing_address",
      type: "text",
      label: "Billing address",
      defaultValue: "500 Market St, San Francisco",
      disabled: true,
      description: "Edit from the billing portal (disabled here).",
    },
  ],
  submitLabel: "Confirm order",
};

export const schemas = {
  contact: contactSchema,
  feedback: feedbackSchema,
  booking: bookingSchema,
  jobApplication: jobApplicationSchema,
  onboardingWizard: onboardingWizardSchema,
  hintsShowcase: hintsShowcaseSchema,
  asyncValidation: asyncValidationSchema,
  reviewMode: reviewModeSchema,
} as const;
