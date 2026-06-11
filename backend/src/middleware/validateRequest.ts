import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { ZodTypeAny } from 'zod';

export type RequestSchemas = {
  readonly body?: ZodTypeAny;
  readonly query?: ZodTypeAny;
  readonly params?: ZodTypeAny;
};

export const validateRequest = (schemas: RequestSchemas): RequestHandler => {
  return (request: Request, _response: Response, next: NextFunction): void => {
    if (schemas.body) {
      request.body = schemas.body.parse(request.body);
    }

    if (schemas.query) {
      request.query = schemas.query.parse(request.query);
    }

    if (schemas.params) {
      request.params = schemas.params.parse(request.params);
    }

    next();
  };
};
