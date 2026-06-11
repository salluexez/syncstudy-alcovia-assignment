import { Router } from 'express';
import { healthController } from '../controllers/healthController.js';
import { readinessController } from '../controllers/readinessController.js';

export const healthRoutes = Router();

healthRoutes.get('/health', healthController);
healthRoutes.get('/ready', readinessController);
