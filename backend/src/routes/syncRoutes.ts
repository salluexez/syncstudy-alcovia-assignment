import { Router } from 'express';
import { z } from 'zod';
import { syncController } from '../controllers/syncController.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { uuidSchema } from '../validation/commonSchemas.js';

export const syncRoutes = Router();

const syncBodySchema = z.object({
  studentId: uuidSchema,
  deviceId: uuidSchema,
  lastServerSequence: z.number().int().nonnegative(),
  operations: z.array(
    z.object({
      id: uuidSchema,
      studentId: uuidSchema,
      deviceId: uuidSchema,
      lamport: z.number().int().nonnegative(),
      entityType: z.string().trim().min(1),
      entityId: uuidSchema,
      operationType: z.string().trim().min(1),
      payload: z.record(z.any()),
      clientCreatedAt: z.string().trim().min(1)
    })
  )
});

syncRoutes.post(
  '/sync',
  validateRequest({ body: syncBodySchema }),
  syncController
);
