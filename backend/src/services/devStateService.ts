import type { UUID } from '../types/domain.js';
import { BootstrapService } from './bootstrapService.js';
import { OperationService } from './operationService.js';

export class DevStateService {
  public constructor(
    private readonly bootstrap = new BootstrapService(),
    private readonly operations = new OperationService()
  ) {}

  public async getState(studentId: UUID) {
    const [bootstrap, operationState] = await Promise.all([
      this.bootstrap.getBootstrap({ studentId }),
      this.operations.listFoundationState(studentId)
    ]);

    return {
      ...bootstrap,
      operations: operationState.operations,
      processedEvents: operationState.processedEvents
    };
  }
}
