import type { Database } from '../db.js';
import { db } from '../db.js';
import { mapFocusSession, type FocusSessionRow } from './rowMappers.js';
import type { FocusSession, UUID } from '../../types/domain.js';

export class FocusSessionRepository {
  public constructor(private readonly database: Database = db) {}

  public async listByStudentId(studentId: UUID): Promise<FocusSession[]> {
    const result = await this.database.query<FocusSessionRow>(
      'select * from focus_sessions where student_id = $1 order by created_at, id',
      [studentId]
    );

    return result.rows.map(mapFocusSession);
  }

  public async findById(id: UUID): Promise<FocusSession | null> {
    const result = await this.database.query<FocusSessionRow>(
      'select * from focus_sessions where id = $1',
      [id]
    );

    const row = result.rows[0];
    return row ? mapFocusSession(row) : null;
  }
}
