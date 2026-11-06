/**
 * Consistent API error types for KINTA backend handlers.
 */

export type ErrorCode =
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "CONFLICT"
  | "BAD_REQUEST"
  | "INTERNAL_ERROR";

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly details?: unknown;

  constructor(
    code: ErrorCode,
    message: string,
    status: number,
    details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = status;
    this.details = details;
  }

  static validation(message: string, details?: unknown) {
    return new AppError("VALIDATION_ERROR", message, 400, details);
  }

  static notFound(entity: string, id?: string) {
    const msg = id ? `${entity} not found: ${id}` : `${entity} not found`;
    return new AppError("NOT_FOUND", msg, 404);
  }

  static conflict(message: string, details?: unknown) {
    return new AppError("CONFLICT", message, 409, details);
  }

  static badRequest(message: string, details?: unknown) {
    return new AppError("BAD_REQUEST", message, 400, details);
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
