export class TokenError extends Error {
  constructor(
    message: string,
    public code: string,
    public cause?: Error
  ) {
    super(message);
    this.name = "TokenError";

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, TokenError);
    }
  }
}

export class TokenFileReadError extends TokenError {
  constructor(path: string, cause: Error) {
    super(`Failed to read token file: ${path}`, "TOKEN_FILE_READ_ERROR", cause);
    this.name = "TokenFileReadError";
  }
}

export class TokenFileWriteError extends TokenError {
  constructor(path: string, cause: Error) {
    super(
      `Failed to write token file: ${path}`,
      "TOKEN_FILE_WRITE_ERROR",
      cause
    );
    this.name = "TokenFileWriteError";
  }
}

export class TokenParseError extends TokenError {
  constructor(path: string, cause: Error) {
    super(
      `Failed to parse token file: ${path}. File may be corrupted or contain invalid JSON.`,
      "TOKEN_PARSE_ERROR",
      cause
    );
    this.name = "TokenParseError";
  }
}

export class TokenValidationError extends TokenError {
  constructor(
    message: string,
    public details?: any
  ) {
    super(message, "TOKEN_VALIDATION_ERROR");
    this.name = "TokenValidationError";
  }
}
