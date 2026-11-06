import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AppError, isAppError } from "@/lib/errors";

export type ApiSuccess<T> = {
  success: true;
  data: T;
};

export type ApiFailure = {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data } satisfies ApiSuccess<T>, {
    status,
  });
}

export function created<T>(data: T) {
  return ok(data, 201);
}

export function fail(
  code: string,
  message: string,
  status: number,
  details?: unknown,
) {
  const body: ApiFailure = {
    success: false,
    error: details === undefined ? { code, message } : { code, message, details },
  };
  return NextResponse.json(body, { status });
}

/** Parse JSON body; throws AppError on invalid JSON. */
export async function readJson<T = unknown>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    throw AppError.badRequest("Request body must be valid JSON");
  }
}

/** Map thrown errors to a consistent JSON response. */
export function handleRouteError(error: unknown) {
  if (isAppError(error)) {
    return fail(error.code, error.message, error.status, error.details);
  }

  if (error instanceof ZodError) {
    return fail(
      "VALIDATION_ERROR",
      "Request validation failed",
      400,
      error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    );
  }

  console.error("[api]", error);
  return fail("INTERNAL_ERROR", "An unexpected error occurred", 500);
}
