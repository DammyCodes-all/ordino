import { z } from "zod";

export const errorCodeSchema = z.enum([
  "NODE_NOT_FOUND",
  "NODE_TYPE_MISMATCH",
  "INVALID_POSITION",
  "INVALID_NODE",
  "INVALID_TABLE",
  "EMPTY_PATCH",
  "DOCUMENT_EMPTY",
  "STALE_RENDER",
  "RENDER_FAILED",
  "RASTERIZATION_FAILED",
  "MISSING_API_KEY",
  "MODEL_AUTH_FAILED",
  "MODEL_RATE_LIMITED",
  "MODEL_SERVICE_UNAVAILABLE",
  "MODEL_UNAVAILABLE",
  "VISION_UNAVAILABLE",
  "INTERNET_REQUIRED",
  "INVALID_MODEL_OUTPUT",
  "MODEL_REQUEST_FAILED",
  "ABORTED",
  "PERSISTENCE_FAILED",
  "INVALID_PDF",
  "ENCRYPTED_PDF",
  "EXTRACTION_FAILED",
  "PAGE_RENDER_FAILED",
  "UNSUPPORTED_LANGUAGE",
  "EXPORT_FAILED",
  "NARRATION_UNAVAILABLE",
  "UNKNOWN",
]);

export const appErrorSchema = z
  .object({
    code: errorCodeSchema,
    message: z.string().min(1),
    retryable: z.boolean(),
    details: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

export type ErrorCode = z.infer<typeof errorCodeSchema>;
export type AppError = z.infer<typeof appErrorSchema>;

export type AppResult<T, E extends AppError = AppError> =
  | { success: true; data: T }
  | { success: false; error: E };
