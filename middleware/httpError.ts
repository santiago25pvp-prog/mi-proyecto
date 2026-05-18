export class HttpError extends Error {
  statusCode: number;
  details?: string[];
  translationKey?: string;

  constructor(message: string, statusCode = 500, details?: string[], translationKey?: string) {
    super(message);
    this.name = 'HttpError';
    this.statusCode = statusCode;
    this.details = details;
    this.translationKey = translationKey;
  }
}

export function isHttpError(error: unknown): error is HttpError {
  return error instanceof HttpError;
}
