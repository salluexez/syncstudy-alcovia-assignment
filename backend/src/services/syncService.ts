import { pool } from '../database/db.js';
import type { UUID } from '../types/domain.js';
import { n8nService } from './n8nService.js';

export type SyncOperation = {
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

export type SyncRequest = {
  readonly studentId: UUID;
  readonly deviceId: UUID;
  readonly lastServerSequence: number;
  readonly operations: readonly SyncOperation[];
};

export type SyncResponse = {
  readonly ackedOperationIds: readonly string[];
  readonly duplicateOperationIds: readonly string[];
  readonly failedOperations: readonly { id: string; error: string }[];
  readonly changes: readonly any[];
  readonly studentSummary: {
    readonly coins: number;
    readonly currentStreak: number;
    readonly todayFocusMinutes: number;
  };
  readonly serverSequence: number;
};

export class SyncService {
  public async sync(request: SyncRequest): Promise<SyncResponse> {
    const client = await pool.connect();
    
    const ackedOperationIds: string[] = [];
    const duplicateOperationIds: string[] = [];
    const failedOperations: { id: string; error: string }[] = [];
    const pendingWebhooks: string[] = [];

    try {
      await client.query('BEGIN');

      // Ensure the device is registered to avoid foreign key violations
      const deviceLabel = `Device ${request.deviceId.slice(0, 8)}`;
      await client.query(
        `
          insert into devices (id, student_id, label, last_seen_at)
          values ($1::uuid, $2::uuid, $3, now())
          on conflict (id) do update set
            last_seen_at = now()
        `,
        [request.deviceId, request.studentId, deviceLabel]
      );

      // 1. Process Operations one by one
      for (const op of request.operations) {
        try {
          // Check if operation already exists (Deduplication)
          const checkRes = await client.query(
            'select id from operations where id = $1',
            [op.id]
          );

          if (checkRes.rows.length > 0) {
            duplicateOperationIds.push(op.id);
            ackedOperationIds.push(op.id);
            continue;
          }

          // Insert operation record
          await client.query(
            `
              insert into operations (
                id, student_id, device_id, lamport, entity_type, entity_id, 
                operation_type, payload, client_created_at, apply_status
              )
              values ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, 'applied')
            `,
            [
              op.id,
              op.studentId,
              op.deviceId,
              op.lamport,
              op.entityType,
              op.entityId,
              op.operationType,
              JSON.stringify(op.payload),
              op.clientCreatedAt
            ]
          );

          // Apply state update
          const webhookEventId = await this.applyOperation(client, op);
          if (webhookEventId) {
            pendingWebhooks.push(webhookEventId);
          }
          ackedOperationIds.push(op.id);

        } catch (opError: any) {
          console.error(`Sync: Failed to apply operation ${op.id}:`, opError);
          failedOperations.push({
            id: op.id,
            error: opError instanceof Error ? opError.message : 'Unknown error during apply.'
          });
          // Rollback the entire sync transaction if a write fails, to preserve consistency
          throw opError;
        }
      }

      // 2. Fetch server changes since client cursor
      const changesRes = await client.query(
        `
          select server_sequence, entity_type, entity_id, change_type, data
          from server_changes
          where student_id = $1 and server_sequence > $2
          order by server_sequence
        `,
        [request.studentId, request.lastServerSequence]
      );

      const changes = changesRes.rows.map((row) => ({
        serverSequence: Number(row.server_sequence),
        entityType: row.entity_type,
        entityId: row.entity_id,
        changeType: row.change_type,
        data: row.data
      }));

      // 3. Get Student Stats
      const studentRes = await client.query(
        'select coins, current_streak, last_focus_date from students where id = $1',
        [request.studentId]
      );
      const student = studentRes.rows[0];

      // Calculate today's focus minutes
      const today = new Date().toISOString().slice(0, 10);
      const focusMinutesRes = await client.query(
        'select total_minutes from daily_focus_totals where student_id = $1 and focus_date = $2',
        [request.studentId, today]
      );
      const todayFocusMinutes = Number(focusMinutesRes.rows[0]?.total_minutes ?? 0);

      // Latest server sequence
      const seqRes = await client.query(
        'select max(server_sequence) as max_seq from server_changes where student_id = $1',
        [request.studentId]
      );
      const latestSequence = Number(seqRes.rows[0]?.max_seq ?? request.lastServerSequence);

      await client.query('COMMIT');

      // Asynchronously trigger webhooks after COMMIT
      for (const eventId of pendingWebhooks) {
        void n8nService.triggerFocusSuccess(eventId);
      }

      return {
        ackedOperationIds,
        changes,
        duplicateOperationIds,
        failedOperations,
        serverSequence: latestSequence,
        studentSummary: {
          coins: student ? Number(student.coins) : 0,
          currentStreak: student ? Number(student.current_streak) : 0,
          todayFocusMinutes
        }
      };

    } catch (txError) {
      await client.query('ROLLBACK');
      throw txError;
    } finally {
      client.release();
    }
  }

  private async applyOperation(client: any, op: SyncOperation): Promise<string | null> {
    const timestamp = new Date().toISOString();

    if (op.entityType === 'focus_session') {
      const p = op.payload as any;
      const targetMins = Number(p.targetMinutes);
      const actualMins = Number(p.actualMinutes ?? 0);
      let status = p.status as string;
      if (!status) {
        if (op.operationType === 'SESSION_STARTED') {
          status = 'started';
        } else if (op.operationType === 'SESSION_COMPLETED') {
          status = 'succeeded';
        } else if (op.operationType === 'SESSION_FAILED') {
          status = 'failed';
        }
      }
      const failReason = p.failReason as string | null;
      const startedAtClient = p.startedAtClient as string;
      const completedAtClient = p.completedAtClient as string | null;
      const focusDate = p.focusDate as string;

      // Conflict Check: First valid terminal status wins. Stale updates cannot overwrite terminal states.
      let shouldApplySession = false;
      const existingSessionRes = await client.query(
        'select status, lamport from focus_sessions where id = $1::uuid',
        [op.entityId]
      );
      const existingSession = existingSessionRes.rows[0];

      if (!existingSession) {
        shouldApplySession = true;
      } else {
        if (existingSession.status === 'succeeded' || existingSession.status === 'failed') {
          shouldApplySession = false; // Terminal state wins
        } else {
          shouldApplySession = true; // Transition from started to succeeded/failed
        }
      }

      if (shouldApplySession) {
        // 1. Upsert Focus Session
        await client.query(
          `
            insert into focus_sessions (
              id, student_id, device_id, target_minutes, actual_minutes, 
              status, fail_reason, focus_date, started_at_client, completed_at_client, lamport, created_at, updated_at
            )
            values ($1::uuid, $2::uuid, $3::uuid, $4::integer, $5::integer, $6::text, $7::text, $8::date, $9::timestamptz, $10::timestamptz, $11::integer, now(), now())
            on conflict (id) do update set
              actual_minutes = excluded.actual_minutes,
              status = excluded.status,
              fail_reason = excluded.fail_reason,
              completed_at_client = excluded.completed_at_client,
              lamport = excluded.lamport,
              updated_at = now()
          `,
          [
            op.entityId, op.studentId, op.deviceId, targetMins, actualMins,
            status, failReason, focusDate, startedAtClient, completedAtClient, op.lamport
          ]
        );

        // Record in Change Feed
        const focusChangeData = {
          id: op.entityId,
          student_id: op.studentId,
          device_id: op.deviceId,
          target_minutes: targetMins,
          actual_minutes: actualMins,
          status,
          fail_reason: failReason,
          focus_date: focusDate,
          started_at_client: startedAtClient,
          completed_at_client: completedAtClient,
          lamport: op.lamport,
          updated_at: timestamp
        };
        await client.query(
          `
            insert into server_changes (student_id, entity_type, entity_id, change_type, data)
            values ($1::uuid, 'focus_session', $2::uuid, 'upsert', $3::jsonb)
          `,
          [op.studentId, op.entityId, JSON.stringify(focusChangeData)]
        );

        // 2. Award rewards if Succeeded & not yet rewarded (Idempotency)
        if (status === 'succeeded') {
          const checkReward = await client.query(
            'select session_id from processed_sessions where session_id = $1::uuid',
            [op.entityId]
          );

          if (checkReward.rows.length === 0) {
            const coinsAwarded = 50;

            const studentRes = await client.query(
              'select coins, current_streak, last_focus_date from students where id = $1::uuid',
              [op.studentId]
            );
            const student = studentRes.rows[0];
            
            let newStreak = Number(student?.current_streak ?? 0);
            const lastFocusDateStr = student?.last_focus_date 
              ? new Date(student.last_focus_date).toISOString().slice(0, 10) 
              : null;

            if (!lastFocusDateStr) {
              newStreak = 1;
            } else if (lastFocusDateStr !== focusDate) {
              const lastDate = new Date(lastFocusDateStr);
              const currentDate = new Date(focusDate);
              const diffTime = Math.abs(currentDate.getTime() - lastDate.getTime());
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

              if (diffDays === 1) {
                newStreak += 1;
              } else if (diffDays > 1) {
                newStreak = 1;
              }
            }

            const rewardEventId = createUuid();

            await client.query(
              `
                insert into reward_events (id, student_id, session_id, focus_date, coins_awarded, minutes_awarded, streak_after, created_at)
                values ($1::uuid, $2::uuid, $3::uuid, $4::date, $5::integer, $6::integer, $7::integer, now())
              `,
              [rewardEventId, op.studentId, op.entityId, focusDate, coinsAwarded, actualMins, newStreak]
            );

            await client.query(
              'insert into processed_sessions (session_id, student_id, processed_at) values ($1::uuid, $2::uuid, now())',
              [op.entityId, op.studentId]
            );

            await client.query(
              `
                update students 
                set coins = coins + $2::integer, current_streak = $3::integer, last_focus_date = $4::date, updated_at = now() 
                where id = $1::uuid
              `,
              [op.studentId, coinsAwarded, newStreak, focusDate]
            );

            await client.query(
              `
                insert into daily_focus_totals (student_id, focus_date, total_minutes, successful_session_count)
                values ($1::uuid, $2::date, $3::integer, 1)
                on conflict (student_id, focus_date) do update set
                  total_minutes = daily_focus_totals.total_minutes + excluded.total_minutes,
                  successful_session_count = daily_focus_totals.successful_session_count + 1
              `,
              [op.studentId, focusDate, actualMins]
            );

            const updatedStudentRes = await client.query(
              'select * from students where id = $1::uuid',
              [op.studentId]
            );
            const updatedStudent = updatedStudentRes.rows[0];
            const studentChangeData = {
              id: op.studentId,
              name: updatedStudent.name,
              coins: updatedStudent.coins,
              current_streak: updatedStudent.current_streak,
              last_focus_date: updatedStudent.last_focus_date,
              updated_at: timestamp
            };
            await client.query(
              `
                insert into server_changes (student_id, entity_type, entity_id, change_type, data)
                values ($1::uuid, 'student', $1::uuid, 'upsert', $2::jsonb)
              `,
              [op.studentId, JSON.stringify(studentChangeData)]
            );

            const dedupeKey = `focus_session_success:${op.entityId}`;
            const message = `Streak now ${newStreak} days! +${coinsAwarded} coins awarded.`;
            const eventPayload = {
              eventId: dedupeKey,
              sessionId: op.entityId,
              studentId: op.studentId,
              streak: newStreak,
              coins: coinsAwarded,
              message
            };

            await client.query(
              `
                insert into processed_events (
                  student_id, event_type, dedupe_key, source_entity_type, source_entity_id, status, payload, created_at
                )
                values ($1::uuid, 'focus_session_success', $2::text, 'focus_session', $3::uuid, 'pending', $4::jsonb, now())
                on conflict (dedupe_key) do nothing
              `,
              [op.studentId, dedupeKey, op.entityId, JSON.stringify(eventPayload)]
            );

            return dedupeKey;
          }
        }
      } else {
        // Acknowledge operation but flag apply_status as ignored (lost conflict)
        await client.query(
          "update operations set apply_status = 'ignored' where id = $1::uuid",
          [op.id]
        );
      }

    } else if (op.entityType === 'task') {
      const p = op.payload as any;
      const title = p.title as string | undefined;
      const status = p.status as string | undefined;
      const chapterId = p.chapterId as string | undefined;

      // 1. Fetch current task state
      const existingTaskRes = await client.query(
        'select lamport, updated_by_device_id, deleted_at from tasks where id = $1::uuid',
        [op.entityId]
      );
      const existingTask = existingTaskRes.rows[0];

      let shouldApply = false;

      if (!existingTask) {
        shouldApply = true;
      } else {
        if (existingTask.deleted_at !== null) {
          shouldApply = false; // Tombstone wins over all updates!
        } else {
          // Compare clock values
          if (op.lamport > existingTask.lamport) {
            shouldApply = true;
          } else if (op.lamport === existingTask.lamport) {
            // Tie-breaker: deviceId lexicographically
            if (op.deviceId > existingTask.updated_by_device_id) {
              shouldApply = true;
            }
          }
        }
      }

      if (shouldApply) {
        if (op.operationType === 'TASK_CREATED') {
          await client.query(
            `
              insert into tasks (id, student_id, chapter_id, title, status, lamport, updated_by_device_id, deleted_at, created_at, updated_at)
              values ($1::uuid, $2::uuid, $3::uuid, $4::text, $5::text, $6::integer, $7::uuid, null, now(), now())
              on conflict (id) do update set
                title = excluded.title,
                status = excluded.status,
                lamport = excluded.lamport,
                updated_by_device_id = excluded.updated_by_device_id,
                updated_at = now()
            `,
            [op.entityId, op.studentId, chapterId, title, status, op.lamport, op.deviceId]
          );
        } else if (op.operationType === 'TASK_STATUS_CHANGED') {
          await client.query(
            `
              update tasks
              set status = $1::text, lamport = $2::integer, updated_by_device_id = $3::uuid, updated_at = now()
              where id = $4::uuid
            `,
            [status, op.lamport, op.deviceId, op.entityId]
          );
        } else if (op.operationType === 'TASK_UPDATED') {
          await client.query(
            `
              update tasks
              set title = $1::text, status = $2::text, lamport = $3::integer, updated_by_device_id = $4::uuid, updated_at = now()
              where id = $5::uuid
            `,
            [title, status, op.lamport, op.deviceId, op.entityId]
          );
        } else if (op.operationType === 'TASK_DELETED') {
          await client.query(
            `
              update tasks
              set deleted_at = now(), lamport = $1::integer, updated_by_device_id = $2::uuid, updated_at = now()
              where id = $3::uuid
            `,
            [op.lamport, op.deviceId, op.entityId]
          );
        }

        // Fetch task state to record in Change Feed
        const taskRes = await client.query('select * from tasks where id = $1::uuid', [op.entityId]);
        const task = taskRes.rows[0];
        if (task) {
          const taskChangeData = {
            id: op.entityId,
            student_id: op.studentId,
            chapter_id: task.chapter_id,
            title: task.title,
            status: task.status,
            lamport: task.lamport,
            updated_by_device_id: task.updated_by_device_id,
            deleted_at: task.deleted_at,
            updated_at: timestamp
          };
          await client.query(
            `
              insert into server_changes (student_id, entity_type, entity_id, change_type, data)
              values ($1::uuid, 'task', $2::uuid, 'upsert', $3::jsonb)
            `,
            [op.studentId, op.entityId, JSON.stringify(taskChangeData)]
          );
        }
      } else {
        // Acknowledge operation but flag apply_status as ignored (lost conflict)
        await client.query(
          "update operations set apply_status = 'ignored' where id = $1::uuid",
          [op.id]
        );
      }
    }
    return null;
  }
}

// Generate UUID for rewards
function createUuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
