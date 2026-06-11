import type { SQLiteDatabase } from 'expo-sqlite';
import { LocalCurriculumRepository } from '../storage/repositories/curriculumRepository';
import { LocalFocusSessionRepository } from '../storage/repositories/focusSessionRepository';
import { LocalOperationRepository } from '../storage/repositories/operationRepository';
import { LocalStudentRepository } from '../storage/repositories/studentRepository';
import { MetadataRepository, METADATA_KEYS } from '../storage/repositories/metadataRepository';
import type { StudyTask, FocusSession, Student } from '../types/domain';

const DEFAULT_API_BASE = 'http://localhost:4000/api';

export class SyncClient {
  private readonly curriculumRepo: LocalCurriculumRepository;
  private readonly focusRepo: LocalFocusSessionRepository;
  private readonly opRepo: LocalOperationRepository;
  private readonly studentRepo: LocalStudentRepository;
  private readonly metadata: MetadataRepository;

  public constructor(private readonly database: SQLiteDatabase) {
    this.curriculumRepo = new LocalCurriculumRepository(database);
    this.focusRepo = new LocalFocusSessionRepository(database);
    this.opRepo = new LocalOperationRepository(database);
    this.studentRepo = new LocalStudentRepository(database);
    this.metadata = new MetadataRepository(database);
  }

  public async sync(): Promise<void> {
    // 1. Connectivity Check
    const networkMode = await this.metadata.getNetworkMode();
    if (networkMode === 'offline') {
      throw new Error('Sync failed: Network is set to offline.');
    }

    const studentId = await this.metadata.get(METADATA_KEYS.studentId);
    const deviceId = await this.metadata.get(METADATA_KEYS.deviceId);
    const lastServerSeq = await this.metadata.getNumber(METADATA_KEYS.lastServerSequence, 0);

    if (!studentId || !deviceId) {
      throw new Error('Sync failed: Missing studentId or deviceId metadata.');
    }

    // 2. Fetch pending operations
    const pendingOps = await this.opRepo.listPending();

    // Map to API format
    const operationsPayload = pendingOps.map((op) => ({
      id: op.id,
      studentId: op.studentId,
      deviceId: op.deviceId,
      lamport: op.lamport,
      entityType: op.entityType,
      entityId: op.entityId,
      operationType: op.operationType,
      payload: op.payload,
      clientCreatedAt: op.clientCreatedAt
    }));

    // Mark operations as syncing in SQLite
    if (pendingOps.length > 0) {
      await this.database.withExclusiveTransactionAsync(async (transaction) => {
        for (const op of pendingOps) {
          await transaction.runAsync(
            "update pending_operations set sync_status = 'syncing' where id = ?",
            op.id
          );
        }
      });
    }

    let responseData;
    try {
      // 3. POST to /api/sync
      const response = await fetch(`${DEFAULT_API_BASE}/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          studentId,
          deviceId,
          lastServerSequence: lastServerSeq,
          operations: operationsPayload
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server returned error status ${response.status}: ${errorText}`);
      }

      responseData = await response.json();
    } catch (networkError) {
      // Reset statuses of syncing operations to failed and record error
      const errorMsg = networkError instanceof Error ? networkError.message : 'Network error';
      if (pendingOps.length > 0) {
        await this.database.withExclusiveTransactionAsync(async (transaction) => {
          for (const op of pendingOps) {
            await transaction.runAsync(
              `
                update pending_operations
                set sync_status = 'failed',
                    retry_count = retry_count + 1,
                    last_error = ?
                where id = ?
              `,
              errorMsg,
              op.id
            );
          }
        });
      }
      throw networkError;
    }

    // 4. Parse sync response and apply updates transactionally
    const { ackedOperationIds, changes, serverSequence, studentSummary } = responseData;

    await this.database.withExclusiveTransactionAsync(async (transaction) => {
      const txCurriculum = new LocalCurriculumRepository(transaction);
      const txFocus = new LocalFocusSessionRepository(transaction);
      const txStudent = new LocalStudentRepository(transaction);
      const txMetadata = new MetadataRepository(transaction);

      // A. Mark acked operations as synced
      if (ackedOperationIds && ackedOperationIds.length > 0) {
        for (const opId of ackedOperationIds) {
          await transaction.runAsync(
            `
              update pending_operations
              set sync_status = 'synced', last_error = null
              where id = ?
            `,
            opId
          );
        }
      }

      // B. Apply Server Changes
      let maxServerLamport = 0;
      if (changes && changes.length > 0) {
        for (const change of changes) {
          const data = change.data;
          
          if (change.entityType === 'task') {
            const task: StudyTask = {
              id: data.id,
              studentId: data.student_id,
              chapterId: data.chapter_id,
              title: data.title,
              status: data.status,
              lamport: data.lamport,
              updatedByDeviceId: data.updated_by_device_id,
              deletedAt: data.deleted_at,
              updatedAt: data.updated_at
            };
            if (task.lamport > maxServerLamport) {
              maxServerLamport = task.lamport;
            }
            await txCurriculum.upsertTask(task, false);

          } else if (change.entityType === 'focus_session') {
            const session: FocusSession = {
              id: data.id,
              studentId: data.student_id,
              deviceId: data.device_id,
              targetMinutes: data.target_minutes,
              actualMinutes: data.actual_minutes,
              status: data.status,
              failReason: data.fail_reason,
              focusDate: data.focus_date,
              startedAtClient: data.started_at_client,
              completedAtClient: data.completed_at_client,
              lamport: data.lamport,
              updatedAt: data.updated_at
            };
            if (session.lamport > maxServerLamport) {
              maxServerLamport = session.lamport;
            }
            await txFocus.upsert(session, false);

          } else if (change.entityType === 'student') {
            const student: Student = {
              id: data.id,
              name: data.name,
              coins: data.coins,
              currentStreak: data.current_streak,
              lastFocusDate: data.last_focus_date,
              updatedAt: data.updated_at
            };
            await txStudent.upsert(student);
          }
        }
      }

      // Apply overall studentSummary as a secondary fallback to ensure stats match
      if (studentSummary) {
        const existingStudent = await txStudent.findById(studentId);
        if (existingStudent) {
          await txStudent.upsert({
            ...existingStudent,
            coins: studentSummary.coins,
            currentStreak: studentSummary.currentStreak,
            updatedAt: new Date().toISOString()
          });
        }
      }

      // C. Update Last Server Sequence
      await txMetadata.setNumber(METADATA_KEYS.lastServerSequence, serverSequence);

      // D. Sync Lamport Clocks: Set local lamport clock to max(local, server)
      const currentLamport = await txMetadata.getNumber(METADATA_KEYS.lamportCounter, 0);
      if (maxServerLamport > currentLamport) {
        await txMetadata.setNumber(METADATA_KEYS.lamportCounter, maxServerLamport);
      }
    });
  }
}
