import { Router } from 'express';
import { bootstrapRoutes } from './bootstrapRoutes.js';
import { devRoutes } from './devRoutes.js';
import { syncRoutes } from './syncRoutes.js';
import { notificationRoutes } from './notificationRoutes.js';

export const apiRoutes = Router();

apiRoutes.use(bootstrapRoutes);
apiRoutes.use(devRoutes);
apiRoutes.use(syncRoutes);
apiRoutes.use(notificationRoutes);
