import type { SQLiteDatabase } from 'expo-sqlite';
import type { PendingOperation, PendingOperationStatus } from '../../types/domain';
import { mapPendingOperation, type PendingOperationRow } from './rowMappers';

export type CreatePendingOperationInput = Omit<
  PendingOperation,
  'retryCount' | 'lastError' | 'syncStatus'
> & {
  readonly syncStatus?: PendingOperationStatus;
};

export class LocalOperationRepository {
  public constructor(private readonly database: SQLiteDatabase) {}

  public async add(operation: CreatePendingOperationInput): Promise<void> {
    await this.database.runAsync(
      `
        insert into pending_operations (
          id,
          student_id,
          device_id,
          lamport,
          entity_type,
          entity_id,
          operation_type,
          payload,
          client_created_at,
          sync_status,
          retry_count,
          last_error,
          created_at
        )
        values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, null, ?)
      `,
      operation.id,
      operation.studentId,
      operation.deviceId,
      operation.lamport,
      operation.entityType,
      operation.entityId,
      operation.operationType,
      JSON.stringify(operation.payload),
      operation.clientCreatedAt,
      operation.syncStatus ?? 'pending',
      operation.createdAt
    );
  }

  public async listPending(): Promise<PendingOperation[]> {
    const rows = await this.database.getAllAsync<PendingOperationRow>(
      `
        select *
        from pending_operations
        where sync_status in ('pending', 'failed')
        order by lamport, created_at, id
      `
    );

    return rows.map(mapPendingOperation);
  }

  public async listAll(): Promise<PendingOperation[]> {
    const rows = await this.database.getAllAsync<PendingOperationRow>(
      'select * from pending_operations order by created_at, id'
    );

    return rows.map(mapPendingOperation);
  }

  public async markSynced(operationIds: readonly string[]): Promise<void> {
    await this.database.withExclusiveTransactionAsync(async (transaction) => {
      for (const operationId of operationIds) {
        await transaction.runAsync(
          `
            update pending_operations
            set sync_status = 'synced', last_error = null
            where id = ?
          `,
          operationId
        );
      }
    });
  }

  public async markFailed(operationId: string, error: string): Promise<void> {
    await this.database.runAsync(
      `
        update pending_operations
        set sync_status = 'failed',
            retry_count = retry_count + 1,
            last_error = ?
        where id = ?
      `,
      error,
      operationId
    );
  }

  public async rememberAppliedRemoteOperation(operationId: string, appliedAt: string): Promise<void> {
    await this.database.runAsync(
      `
        insert into applied_remote_operations (operation_id, applied_at)
        values (?, ?)
        on conflict (operation_id) do nothing
      `,
      operationId,
      appliedAt
    );
  }
}
