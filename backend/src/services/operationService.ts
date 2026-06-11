import { OperationRepository } from '../database/repositories/operationRepository.js';
import { ProcessedEventRepository } from '../database/repositories/processedEventRepository.js';
import { ProcessedSessionRepository } from '../database/repositories/processedSessionRepository.js';
import type { OperationRecord, ProcessedEvent, UUID } from '../types/domain.js';

export type OperationFoundationSnapshot = {
  readonly operations: readonly OperationRecord[];
  readonly processedEvents: readonly ProcessedEvent[];
};

export class OperationService {
  public constructor(
    private readonly operations = new OperationRepository(),
    private readonly processedSessions = new ProcessedSessionRepository(),
    private readonly processedEvents = new ProcessedEventRepository()
  ) {}

  public async listFoundationState(studentId: UUID): Promise<OperationFoundationSnapshot> {
    const [operations, processedEvents] = await Promise.all([
      this.operations.listByStudentId(studentId),
      this.processedEvents.listByStudentId(studentId)
    ]);

    return {
      operations,
      processedEvents
    };
  }

  public async hasProcessedSession(sessionId: UUID): Promise<boolean> {
    return (await this.processedSessions.findBySessionId(sessionId)) !== null;
  }
}
