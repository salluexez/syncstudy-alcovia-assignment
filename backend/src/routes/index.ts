import { Router } from 'express';
import { bootstrapRoutes } from './bootstrapRoutes.js';
import { devRoutes } from './devRoutes.js';

export const apiRoutes = Router();

apiRoutes.use(bootstrapRoutes);
apiRoutes.use(devRoutes);
