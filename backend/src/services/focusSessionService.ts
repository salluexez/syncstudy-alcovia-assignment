import { FocusSessionRepository } from '../database/repositories/focusSessionRepository.js';
import type { FocusSession, UUID } from '../types/domain.js';

export class FocusSessionService {
  public constructor(private readonly focusSessions = new FocusSessionRepository()) {}

  public async listByStudentId(studentId: UUID): Promise<FocusSession[]> {
    return this.focusSessions.listByStudentId(studentId);
  }
}
