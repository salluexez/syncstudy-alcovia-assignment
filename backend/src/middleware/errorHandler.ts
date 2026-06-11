import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../errors.js';
import { config } from '../config.js';

export const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  if (error instanceof ZodError) {
    response.status(400).json({
      code: 'validation_error',
      issues: error.issues,
      message: 'Request validation failed'
    });
    return;
  }

  if (error instanceof AppError) {
    response.status(error.statusCode).json({
      code: error.code,
      message: error.message
    });
    return;
  }

  response.status(500).json({
    code: 'internal_error',
    message: 'Unexpected server error',
    ...(config.nodeEnv === 'development' ? { detail: String(error) } : {})
  });
};
