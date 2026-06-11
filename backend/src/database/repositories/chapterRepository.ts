import type { Database } from '../db.js';
import { db } from '../db.js';
import { mapChapter, type ChapterRow } from './rowMappers.js';
import type { Chapter, UUID } from '../../types/domain.js';

export class ChapterRepository {
  public constructor(private readonly database: Database = db) {}

  public async listByStudentId(studentId: UUID): Promise<Chapter[]> {
    const result = await this.database.query<ChapterRow>(
      'select * from chapters where student_id = $1 order by created_at, id',
      [studentId]
    );

    return result.rows.map(mapChapter);
  }
}
