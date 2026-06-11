import type { Database } from '../db.js';
import { db } from '../db.js';
import { mapTask, type TaskRow } from './rowMappers.js';
import type { StudyTask, UUID } from '../../types/domain.js';

export class TaskRepository {
  public constructor(private readonly database: Database = db) {}

  public async listByStudentId(studentId: UUID): Promise<StudyTask[]> {
    const result = await this.database.query<TaskRow>(
      'select * from tasks where student_id = $1 order by created_at, id',
      [studentId]
    );

    return result.rows.map(mapTask);
  }
}
