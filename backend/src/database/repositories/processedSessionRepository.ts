import type { Database } from '../db.js';
import { db } from '../db.js';
import { mapProcessedSession, type ProcessedSessionRow } from './rowMappers.js';
import type { ProcessedSession, UUID } from '../../types/domain.js';

export class ProcessedSessionRepository {
  public constructor(private readonly database: Database = db) {}

  public async findBySessionId(sessionId: UUID): Promise<ProcessedSession | null> {
    const result = await this.database.query<ProcessedSessionRow>(
      'select * from processed_sessions where session_id = $1',
      [sessionId]
    );

    const row = result.rows[0];
    return row ? mapProcessedSession(row) : null;
  }
}
