import { DevStateService } from '../services/devStateService.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

const devStateService = new DevStateService();

export const devStateController = asyncHandler(async (request, response) => {
  const query = request.query as { studentId: string };
  const payload = await devStateService.getState(query.studentId);
  response.status(200).json(payload);
});
