import { Router } from 'express';
import { devStateController } from '../controllers/devController.js';
import { ensureDefaultStudentController } from '../controllers/studentController.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { studentIdQuerySchema } from '../validation/commonSchemas.js';

export const devRoutes = Router();

devRoutes.post('/dev/seed-default-student', ensureDefaultStudentController);
devRoutes.get(
  '/dev/state',
  validateRequest({ query: studentIdQuerySchema }),
  devStateController
);
