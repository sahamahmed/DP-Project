/**
 * Safely extracts a string message from an unknown caught value.
 * TypeScript catch clauses type `error` as `unknown` — this util
 * centralises the narrowing so every catch block stays one-liner.
 */
export function toErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return String(error);
}

/**
 * Safely extracts a stack trace string from an unknown caught value.
 * Returns undefined (not a string) when no stack is available so
 * NestJS Logger.error(msg, undefined) works correctly.
 */
export function toErrorStack(error: unknown): string | undefined {
  if (error instanceof Error) return error.stack;
  return undefined;
}
