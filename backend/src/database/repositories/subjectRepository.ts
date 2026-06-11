import type { Database } from '../db.js';
import { db } from '../db.js';
import { mapSubject, type SubjectRow } from './rowMappers.js';
import type { Subject, UUID } from '../../types/domain.js';

export class SubjectRepository {
  public constructor(private readonly database: Database = db) {}

  public async listByStudentId(studentId: UUID): Promise<Subject[]> {
    const result = await this.database.query<SubjectRow>(
      'select * from subjects where student_id = $1 order by created_at, id',
      [studentId]
    );

    return result.rows.map(mapSubject);
  }
}
