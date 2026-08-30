import { ZodError, ZodType } from 'zod';
import { ValidationError } from './errors.js';

export function validateCommandOptions<T>(schema: ZodType<T>, payload: unknown): T {
  try {
    return schema.parse(payload);
  } catch (error) {
    if (error instanceof ZodError) {
      const issues = error.errors.map((issue) => `${issue.path.join('.') || 'input'}: ${issue.message}`).join('; ');
      throw new ValidationError(`Invalid command input: ${issues}`);
    }
    throw error;
  }
}
