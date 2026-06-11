import type { SQLiteDatabase } from 'expo-sqlite';
import type { Student } from '../../types/domain';
import { mapStudent, type StudentRow } from './rowMappers';

export type UpsertLocalStudentInput = Student;

export class LocalStudentRepository {
  public constructor(private readonly database: SQLiteDatabase) {}

  public async findById(id: string): Promise<Student | null> {
    const row = await this.database.getFirstAsync<StudentRow>(
      'select * from local_students where id = ?',
      id
    );

    return row ? mapStudent(row) : null;
  }

  public async upsert(student: UpsertLocalStudentInput): Promise<void> {
    await this.database.runAsync(
      `
        insert into local_students (
          id,
          name,
          coins,
          current_streak,
          last_focus_date,
          updated_at
        )
        values (?, ?, ?, ?, ?, ?)
        on conflict (id) do update set
          name = excluded.name,
          coins = excluded.coins,
          current_streak = excluded.current_streak,
          last_focus_date = excluded.last_focus_date,
          updated_at = excluded.updated_at
      `,
      student.id,
      student.name,
      student.coins,
      student.currentStreak,
      student.lastFocusDate,
      student.updatedAt
    );
  }
}
