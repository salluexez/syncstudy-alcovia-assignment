import { Router } from 'express';
import { bootstrapController } from '../controllers/bootstrapController.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { bootstrapQuerySchema } from '../validation/commonSchemas.js';

export const bootstrapRoutes = Router();

bootstrapRoutes.get(
  '/bootstrap',
  validateRequest({ query: bootstrapQuerySchema }),
  bootstrapController
);
