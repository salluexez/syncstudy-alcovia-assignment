import type { Database } from '../db.js';
import { db } from '../db.js';
import { mapStudent, type StudentRow } from './rowMappers.js';
import type { Student, UUID } from '../../types/domain.js';

export type CreateStudentInput = {
  readonly id: UUID;
  readonly name: string;
};

export class StudentRepository {
  public constructor(private readonly database: Database = db) {}

  public async findById(id: UUID): Promise<Student | null> {
    const result = await this.database.query<StudentRow>(
      'select * from students where id = $1',
      [id]
    );

    const row = result.rows[0];
    return row ? mapStudent(row) : null;
  }

  public async upsert(input: CreateStudentInput): Promise<Student> {
    const result = await this.database.query<StudentRow>(
      `
        insert into students (id, name)
        values ($1, $2)
        on conflict (id) do update set
          name = excluded.name,
          updated_at = now()
        returning *
      `,
      [input.id, input.name]
    );

    return mapStudent(result.rows[0]!);
  }
}
