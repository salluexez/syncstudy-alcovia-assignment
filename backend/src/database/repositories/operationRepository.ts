import type { Database } from '../db.js';
import { db } from '../db.js';
import { mapOperation, type OperationRow } from './rowMappers.js';
import type { OperationRecord, UUID } from '../../types/domain.js';

export type CreateOperationRecordInput = {
  readonly id: UUID;
  readonly studentId: UUID;
  readonly deviceId: UUID;
  readonly lamport: number;
  readonly entityType: string;
  readonly entityId: UUID;
  readonly operationType: string;
  readonly payload: Record<string, unknown>;
  readonly clientCreatedAt: string;
};

export class OperationRepository {
  public constructor(private readonly database: Database = db) {}

  public async findById(id: UUID): Promise<OperationRecord | null> {
    const result = await this.database.query<OperationRow>(
      'select * from operations where id = $1',
      [id]
    );

    const row = result.rows[0];
    return row ? mapOperation(row) : null;
  }

  public async listByStudentId(studentId: UUID): Promise<OperationRecord[]> {
    const result = await this.database.query<OperationRow>(
      'select * from operations where student_id = $1 order by server_received_at, id',
      [studentId]
    );

    return result.rows.map(mapOperation);
  }

  public async insertPending(input: CreateOperationRecordInput): Promise<OperationRecord> {
    const result = await this.database.query<OperationRow>(
      `
        insert into operations (
          id,
          student_id,
          device_id,
          lamport,
          entity_type,
          entity_id,
          operation_type,
          payload,
          client_created_at
        )
        values ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9)
        returning *
      `,
      [
        input.id,
        input.studentId,
        input.deviceId,
        input.lamport,
        input.entityType,
        input.entityId,
        input.operationType,
        JSON.stringify(input.payload),
        input.clientCreatedAt
      ]
    );

    return mapOperation(result.rows[0]!);
  }
}
