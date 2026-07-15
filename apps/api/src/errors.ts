import type { ErrorCode } from '@healthy-companion/types';

/** Application error that maps to the uniform API error envelope (see docs/04). */
export class AppError extends Error {
  readonly code: ErrorCode;
  readonly statusCode: number;
  readonly details?: Record<string, unknown>;

  constructor(
    code: ErrorCode,
    statusCode: number,
    message: string,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }

  static unauthenticated(message = 'Authentication required'): AppError {
    return new AppError('unauthenticated', 401, message);
  }
  static forbidden(message = 'Not allowed'): AppError {
    return new AppError('forbidden', 403, message);
  }
  static notFound(message = 'Not found'): AppError {
    return new AppError('not_found', 404, message);
  }
  static validation(message = 'Validation failed', details?: Record<string, unknown>): AppError {
    return new AppError('validation', 422, message, details);
  }
  static rateLimited(message = 'Too many requests'): AppError {
    return new AppError('rate_limited', 429, message);
  }
  static internal(message = 'Something went wrong'): AppError {
    return new AppError('internal', 500, message);
  }
}
