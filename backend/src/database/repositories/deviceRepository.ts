import type { Database } from '../db.js';
import { db } from '../db.js';
import type { UUID } from '../../types/domain.js';

export type DeviceRecord = {
  readonly id: UUID;
  readonly studentId: UUID;
  readonly label: string;
  readonly lastSeenAt: Date | null;
  readonly createdAt: Date;
};

type DeviceRow = {
  id: string;
  student_id: string;
  label: string;
  last_seen_at: Date | null;
  created_at: Date;
};

const mapDevice = (row: DeviceRow): DeviceRecord => ({
  createdAt: row.created_at,
  id: row.id,
  label: row.label,
  lastSeenAt: row.last_seen_at,
  studentId: row.student_id
});

export class DeviceRepository {
  public constructor(private readonly database: Database = db) {}

  public async upsert(input: {
    readonly id: UUID;
    readonly studentId: UUID;
    readonly label: string;
  }): Promise<DeviceRecord> {
    const result = await this.database.query<DeviceRow>(
      `
        insert into devices (id, student_id, label, last_seen_at)
        values ($1, $2, $3, now())
        on conflict (id) do update set
          label = excluded.label,
          last_seen_at = now()
        returning *
      `,
      [input.id, input.studentId, input.label]
    );

    return mapDevice(result.rows[0]!);
  }
}
