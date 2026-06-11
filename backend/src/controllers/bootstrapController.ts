import { BootstrapService } from '../services/bootstrapService.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

const bootstrapService = new BootstrapService();

export const bootstrapController = asyncHandler(async (request, response) => {
  const query = request.query as {
    studentId: string;
    deviceId?: string;
    deviceLabel?: string;
  };

  const payload = await bootstrapService.getBootstrap({
    ...(query.deviceId ? { deviceId: query.deviceId } : {}),
    ...(query.deviceLabel ? { deviceLabel: query.deviceLabel } : {}),
    studentId: query.studentId
  });

  response.status(200).json(payload);
});
