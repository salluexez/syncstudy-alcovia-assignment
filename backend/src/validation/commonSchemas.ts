import { z } from 'zod';

export const uuidSchema = z.string().uuid();

export const studentIdQuerySchema = z.object({
  studentId: uuidSchema
});

export const bootstrapQuerySchema = z.object({
  deviceId: uuidSchema.optional(),
  deviceLabel: z.string().trim().min(1).max(80).optional(),
  studentId: uuidSchema
});
