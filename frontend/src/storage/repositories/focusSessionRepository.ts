import type { SQLiteDatabase } from 'expo-sqlite';
import type { FocusSession } from '../../types/domain';
import { mapFocusSession, type FocusSessionRow } from './rowMappers';

export class LocalFocusSessionRepository {
  public constructor(private readonly database: SQLiteDatabase) {}

  public async listByStudentId(studentId: string): Promise<FocusSession[]> {
    const rows = await this.database.getAllAsync<FocusSessionRow>(
      'select * from local_focus_sessions where student_id = ? order by started_at_client, id',
      studentId
    );

    return rows.map(mapFocusSession);
  }

  public async findById(id: string): Promise<FocusSession | null> {
    const row = await this.database.getFirstAsync<FocusSessionRow>(
      'select * from local_focus_sessions where id = ?',
      id
    );

    return row ? mapFocusSession(row) : null;
  }

  public async upsert(session: FocusSession, dirty = false): Promise<void> {
    await this.database.runAsync(
      `
        insert into local_focus_sessions (
          id,
          student_id,
          device_id,
          target_minutes,
          actual_minutes,
          status,
          fail_reason,
          focus_date,
          started_at_client,
          completed_at_client,
          lamport,
          updated_at,
          dirty
        )
        values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        on conflict (id) do update set
          actual_minutes = excluded.actual_minutes,
          status = excluded.status,
          fail_reason = excluded.fail_reason,
          completed_at_client = excluded.completed_at_client,
          lamport = excluded.lamport,
          updated_at = excluded.updated_at,
          dirty = excluded.dirty
      `,
      session.id,
      session.studentId,
      session.deviceId,
      session.targetMinutes,
      session.actualMinutes,
      session.status,
      session.failReason,
      session.focusDate,
      session.startedAtClient,
      session.completedAtClient,
      session.lamport,
      session.updatedAt,
      dirty ? 1 : 0
    );
  }
}
