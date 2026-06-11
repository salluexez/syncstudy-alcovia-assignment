import type { Database } from '../db.js';
import { db } from '../db.js';
import { mapProcessedEvent, type ProcessedEventRow } from './rowMappers.js';
import type { ProcessedEvent, UUID } from '../../types/domain.js';

export class ProcessedEventRepository {
  public constructor(private readonly database: Database = db) {}

  public async findByDedupeKey(dedupeKey: string): Promise<ProcessedEvent | null> {
    const result = await this.database.query<ProcessedEventRow>(
      'select * from processed_events where dedupe_key = $1',
      [dedupeKey]
    );

    const row = result.rows[0];
    return row ? mapProcessedEvent(row) : null;
  }

  public async listByStudentId(studentId: UUID): Promise<ProcessedEvent[]> {
    const result = await this.database.query<ProcessedEventRow>(
      'select * from processed_events where student_id = $1 order by created_at, id',
      [studentId]
    );

    return result.rows.map(mapProcessedEvent);
  }
}
