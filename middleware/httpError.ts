export class HttpError extends Error {
  statusCode: number;
  details?: string[];

  constructor(message: string, statusCode = 500, details?: string[]) {
    super(message);
    this.name = 'HttpError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

export function isHttpError(error: unknown): error is HttpError {
  return error instanceof HttpError;
}
