import { SyncService } from '../services/syncService.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

const syncService = new SyncService();

export const syncController = asyncHandler(async (request, response) => {
  const { studentId, deviceId, lastServerSequence, operations } = request.body;

  const result = await syncService.sync({
    studentId,
    deviceId,
    lastServerSequence: Number(lastServerSequence),
    operations
  });

  response.status(200).json(result);
});
