import type { SQLiteDatabase } from 'expo-sqlite';
import type { LocalFocusEffect } from '../../types/domain';
import { mapFocusEffect, type FocusEffectRow } from './rowMappers';

export class LocalFocusEffectRepository {
  public constructor(private readonly database: SQLiteDatabase) {}

  public async add(effect: LocalFocusEffect): Promise<void> {
    await this.database.runAsync(
      `
        insert into local_focus_effects (
          id,
          session_id,
          student_id,
          effect_type,
          payload,
          created_at
        )
        values (?, ?, ?, ?, ?, ?)
        on conflict (session_id, effect_type) do nothing
      `,
      effect.id,
      effect.sessionId,
      effect.studentId,
      effect.effectType,
      JSON.stringify(effect.payload),
      effect.createdAt
    );
  }

  public async listBySessionId(sessionId: string): Promise<LocalFocusEffect[]> {
    const rows = await this.database.getAllAsync<FocusEffectRow>(
      'select * from local_focus_effects where session_id = ? order by created_at, id',
      sessionId
    );

    return rows.map(mapFocusEffect);
  }

  public async listByStudentId(studentId: string): Promise<LocalFocusEffect[]> {
    const rows = await this.database.getAllAsync<FocusEffectRow>(
      'select * from local_focus_effects where student_id = ? order by created_at, id',
      studentId
    );

    return rows.map(mapFocusEffect);
  }
}
