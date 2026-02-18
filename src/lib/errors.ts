export class AppError extends Error {
  status: number;
  code: string;

  constructor(code: string, message: string, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export const assert = (condition: unknown, code: string, message: string, status = 400): void => {
  if (!condition) {
    throw new AppError(code, message, status);
  }
};

export const toJsonError = (error: unknown): { status: number; body: { error: string; message: string } } => {
  if (error instanceof AppError) {
    return {
      status: error.status,
      body: {
        error: error.code,
        message: error.message,
      },
    };
  }

  console.error(error);
  return {
    status: 500,
    body: {
      error: "INTERNAL_ERROR",
      message: "Something went wrong",
    },
  };
};
