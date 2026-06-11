import type { RequestHandler } from 'express';

export const notFoundHandler: RequestHandler = (request, response) => {
  response.status(404).json({
    code: 'route_not_found',
    message: `Route not found: ${request.method} ${request.path}`
  });
};
