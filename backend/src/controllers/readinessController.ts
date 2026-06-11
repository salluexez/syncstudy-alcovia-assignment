import { ReadinessService } from '../services/readinessService.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

const readinessService = new ReadinessService();

export const readinessController = asyncHandler(async (_request, response) => {
  const status = await readinessService.check();
  response.status(status.ok ? 200 : 503).json(status);
});
