import type { AppError, AppResult, ErrorCode } from "@/contracts";

export function createSuccessResult<T>(data: T): AppResult<T, never> {
  return { success: true, data };
}

export function createErrorResult<E extends AppError = AppError>(
  code: ErrorCode,
  message: string,
  retryable = false,
  details?: Record<string, unknown>,
): AppResult<never, E> {
  return {
    success: false,
    error: {
      code,
      message,
      retryable,
      ...(details ? details : {}),
    } as E,
  };
}

export function mapErrorToAppError(error: unknown): AppError {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    "message" in error
  ) {
    return error as AppError;
  }
  const message = error instanceof Error ? error.message : String(error);
  if (
    message.includes("aborted") ||
    message.includes("AbortError") ||
    (error instanceof Error && error.name === "AbortError")
  ) {
    return {
      code: "ABORTED",
      message: "The operation was aborted.",
      retryable: false,
    };
  }
  if (message.includes("API key") || message.includes("MISSING_API_KEY")) {
    return {
      code: "MISSING_API_KEY",
      message: "GOOGLE_GENERATIVE_AI_API_KEY is missing or unconfigured.",
      retryable: false,
    };
  }
  if (
    message.includes("401") ||
    message.includes("403") ||
    message.includes("MODEL_AUTH_FAILED")
  ) {
    return {
      code: "MODEL_AUTH_FAILED",
      message: "Authentication failed for Google AI Studio API key.",
      retryable: false,
    };
  }
  if (message.includes("429") || message.includes("MODEL_RATE_LIMITED")) {
    return {
      code: "MODEL_RATE_LIMITED",
      message: "Rate limit exceeded for Google AI Studio API.",
      retryable: true,
    };
  }
  if (
    message.includes("503") ||
    message.includes("MODEL_SERVICE_UNAVAILABLE")
  ) {
    return {
      code: "MODEL_SERVICE_UNAVAILABLE",
      message: "Google AI Studio service is currently unavailable.",
      retryable: true,
    };
  }
  return {
    code: "MODEL_REQUEST_FAILED",
    message: message || "Model request failed.",
    retryable: true,
  };
}
