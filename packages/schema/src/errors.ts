import type { ValidationError } from "./validate";

export class FormloomValidationError extends Error {
  public errors: ValidationError[];

  constructor(errors: ValidationError[]) {
    const summary = errors.map((e) => `  ${e.path}: ${e.message}`).join("\n");
    super(`Invalid Formloom schema:\n${summary}`);
    this.name = "FormloomValidationError";
    this.errors = errors;
  }
}
