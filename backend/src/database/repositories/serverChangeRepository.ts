import type { Database } from '../db.js';
import { db } from '../db.js';
import { mapServerChange, type ServerChangeRow } from './rowMappers.js';
import type { ServerChange, UUID } from '../../types/domain.js';

export class ServerChangeRepository {
  public constructor(private readonly database: Database = db) {}

  public async listSince(studentId: UUID, serverSequence: number): Promise<ServerChange[]> {
    const result = await this.database.query<ServerChangeRow>(
      `
        select *
        from server_changes
        where student_id = $1 and server_sequence > $2
        order by server_sequence
      `,
      [studentId, serverSequence]
    );

    return result.rows.map(mapServerChange);
  }

  public async getLatestSequence(studentId: UUID): Promise<number> {
    const result = await this.database.query<{ latest_sequence: string | null }>(
      'select max(server_sequence) as latest_sequence from server_changes where student_id = $1',
      [studentId]
    );

    return Number(result.rows[0]?.latest_sequence ?? 0);
  }
}
