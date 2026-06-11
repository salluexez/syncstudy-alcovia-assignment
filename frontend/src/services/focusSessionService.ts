import type { SQLiteDatabase } from 'expo-sqlite';
import { createUuid } from '../sync/uuid';
import type {
  FocusSession,
  FocusSessionFailReason,
  LocalFocusEffect,
  PendingOperation
} from '../types/domain';
import type {
  FocusOperationType,
  PreparedFocusEvent,
  SessionCompletedPayload,
  SessionFailedPayload,
  SessionStartedPayload
} from '../types/operations';
import { METADATA_KEYS, MetadataRepository } from '../storage/repositories/metadataRepository';
import { LocalFocusSessionRepository } from '../storage/repositories/focusSessionRepository';

export const APP_SWITCH_GRACE_PERIOD_MS = 5_000;

export type FocusSessionRuntime = {
  readonly session: FocusSession;
  readonly elapsedMs: number;
  readonly remainingMs: number;
  readonly isExpired: boolean;
};

export type StartFocusSessionInput = {
  readonly studentId: string;
  readonly deviceId: string;
  readonly targetMinutes: number;
};

type OperationDraft = Omit<PendingOperation, 'retryCount' | 'lastError' | 'syncStatus'>;

const nowIso = (): string => new Date().toISOString();

const toFocusDate = (isoTimestamp: string): string => isoTimestamp.slice(0, 10);

const clampElapsedMinutes = (startedAtClient: string, completedAtClient: string): number => {
  const elapsedMs = Math.max(0, Date.parse(completedAtClient) - Date.parse(startedAtClient));
  return Math.floor(elapsedMs / 60_000);
};

const toRuntime = (session: FocusSession, nowMs: number): FocusSessionRuntime => {
  const elapsedMs = Math.max(0, nowMs - Date.parse(session.startedAtClient));
  const targetMs = session.targetMinutes * 60_000;
  const remainingMs = Math.max(0, targetMs - elapsedMs);

  return {
    elapsedMs,
    isExpired: remainingMs === 0,
    remainingMs,
    session
  };
};

export class FocusSessionService {
  private readonly metadata: MetadataRepository;
  private readonly sessions: LocalFocusSessionRepository;

  public constructor(private readonly database: SQLiteDatabase) {
    this.metadata = new MetadataRepository(database);
    this.sessions = new LocalFocusSessionRepository(database);
  }

  public async startSession(input: StartFocusSessionInput): Promise<FocusSession> {
    if (!Number.isInteger(input.targetMinutes) || input.targetMinutes < 1 || input.targetMinutes > 240) {
      throw new Error('Target duration must be between 1 and 240 minutes.');
    }

    const activeSession = await this.getActiveSession(input.studentId);

    if (activeSession) {
      throw new Error('A focus session is already running.');
    }

    const timestamp = nowIso();
    const lamport = await this.metadata.incrementLamport();
    const session: FocusSession = {
      actualMinutes: 0,
      completedAtClient: null,
      deviceId: input.deviceId,
      failReason: null,
      focusDate: toFocusDate(timestamp),
      id: createUuid(),
      lamport,
      startedAtClient: timestamp,
      status: 'started',
      studentId: input.studentId,
      targetMinutes: input.targetMinutes,
      updatedAt: timestamp
    };

    const operation = this.createOperation({
      deviceId: input.deviceId,
      entityId: session.id,
      lamport,
      operationType: 'SESSION_STARTED',
      payload: {
        focusDate: session.focusDate,
        sessionId: session.id,
        startedAtClient: session.startedAtClient,
        targetMinutes: session.targetMinutes
      } satisfies SessionStartedPayload,
      studentId: input.studentId,
      timestamp
    });

    await this.database.withExclusiveTransactionAsync(async (transaction) => {
      await new LocalFocusSessionRepository(transaction).upsert(session, true);
      await this.insertOperation(transaction, operation);
    });

    return session;
  }

  public async completeSession(sessionId: string): Promise<FocusSession> {
    const existingSession = await this.sessions.findById(sessionId);

    if (!existingSession) {
      throw new Error('Focus session was not found.');
    }

    if (existingSession.status !== 'started') {
      return existingSession;
    }

    const timestamp = nowIso();
    const lamport = await this.metadata.incrementLamport();
    const actualMinutes = Math.max(
      existingSession.targetMinutes,
      clampElapsedMinutes(existingSession.startedAtClient, timestamp)
    );
    const completedSession: FocusSession = {
      ...existingSession,
      actualMinutes,
      completedAtClient: timestamp,
      failReason: null,
      lamport,
      status: 'succeeded',
      updatedAt: timestamp
    };
    const preparedEvents = this.createPreparedFocusEvents(completedSession);

    const operation = this.createOperation({
      deviceId: completedSession.deviceId,
      entityId: completedSession.id,
      lamport,
      operationType: 'SESSION_COMPLETED',
      payload: {
        actualMinutes: completedSession.actualMinutes,
        completedAtClient: timestamp,
        focusDate: completedSession.focusDate,
        preparedEvents,
        sessionId: completedSession.id,
        startedAtClient: completedSession.startedAtClient,
        targetMinutes: completedSession.targetMinutes
      } satisfies SessionCompletedPayload,
      studentId: completedSession.studentId,
      timestamp
    });

    await this.database.withExclusiveTransactionAsync(async (transaction) => {
      await new LocalFocusSessionRepository(transaction).upsert(completedSession, true);
      await this.insertOperation(transaction, operation);

      for (const effect of this.createLocalFocusEffects(completedSession, preparedEvents, timestamp)) {
        await this.insertFocusEffect(transaction, effect);
      }
    });

    return completedSession;
  }

  public async failSession(
    sessionId: string,
    failReason: FocusSessionFailReason
  ): Promise<FocusSession> {
    const existingSession = await this.sessions.findById(sessionId);

    if (!existingSession) {
      throw new Error('Focus session was not found.');
    }

    if (existingSession.status !== 'started') {
      return existingSession;
    }

    const timestamp = nowIso();
    const lamport = await this.metadata.incrementLamport();
    const failedSession: FocusSession = {
      ...existingSession,
      actualMinutes: clampElapsedMinutes(existingSession.startedAtClient, timestamp),
      completedAtClient: timestamp,
      failReason,
      lamport,
      status: 'failed',
      updatedAt: timestamp
    };

    const operation = this.createOperation({
      deviceId: failedSession.deviceId,
      entityId: failedSession.id,
      lamport,
      operationType: 'SESSION_FAILED',
      payload: {
        actualMinutes: failedSession.actualMinutes,
        completedAtClient: timestamp,
        failReason,
        focusDate: failedSession.focusDate,
        sessionId: failedSession.id,
        startedAtClient: failedSession.startedAtClient,
        targetMinutes: failedSession.targetMinutes
      } satisfies SessionFailedPayload,
      studentId: failedSession.studentId,
      timestamp
    });

    await this.database.withExclusiveTransactionAsync(async (transaction) => {
      await new LocalFocusSessionRepository(transaction).upsert(failedSession, true);
      await this.insertOperation(transaction, operation);
    });

    return failedSession;
  }

  public async getActiveSession(studentId: string): Promise<FocusSession | null> {
    const row = await this.database.getFirstAsync<{
      id: string;
    }>(
      `
        select id
        from local_focus_sessions
        where student_id = ? and status = 'started'
        order by started_at_client desc
        limit 1
      `,
      studentId
    );

    return row ? this.sessions.findById(row.id) : null;
  }

  public async restoreActiveSession(studentId: string): Promise<FocusSessionRuntime | null> {
    const activeSession = await this.getActiveSession(studentId);
    return activeSession ? toRuntime(activeSession, Date.now()) : null;
  }

  public getRuntime(session: FocusSession): FocusSessionRuntime {
    return toRuntime(session, Date.now());
  }

  private createOperation(input: {
    readonly studentId: string;
    readonly deviceId: string;
    readonly entityId: string;
    readonly operationType: FocusOperationType;
    readonly lamport: number;
    readonly timestamp: string;
    readonly payload: Record<string, unknown>;
  }): OperationDraft {
    return {
      clientCreatedAt: input.timestamp,
      createdAt: input.timestamp,
      deviceId: input.deviceId,
      entityId: input.entityId,
      entityType: 'focus_session',
      id: createUuid(),
      lamport: input.lamport,
      operationType: input.operationType,
      payload: {
        ...input.payload,
        deviceId: input.deviceId,
        lamportClock: input.lamport,
        operationId: undefined,
        timestamp: input.timestamp
      },
      studentId: input.studentId
    };
  }

  private async insertOperation(
    database: SQLiteDatabase,
    operation: OperationDraft
  ): Promise<void> {
    await database.runAsync(
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
        values (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 0, null, ?)
      `,
      operation.id,
      operation.studentId,
      operation.deviceId,
      operation.lamport,
      operation.entityType,
      operation.entityId,
      operation.operationType,
      JSON.stringify({
        ...operation.payload,
        operationId: operation.id
      }),
      operation.clientCreatedAt,
      operation.createdAt
    );
  }

  private createPreparedFocusEvents(session: FocusSession): PreparedFocusEvent[] {
    return [
      {
        reason: 'server_will_calculate',
        sessionId: session.id,
        type: 'reward_prepared'
      },
      {
        focusDate: session.focusDate,
        reason: 'server_will_calculate',
        sessionId: session.id,
        type: 'streak_update_prepared'
      },
      {
        focusDate: session.focusDate,
        minutes: session.actualMinutes,
        sessionId: session.id,
        type: 'focus_minutes_prepared'
      }
    ];
  }

  private createLocalFocusEffects(
    session: FocusSession,
    preparedEvents: readonly PreparedFocusEvent[],
    timestamp: string
  ): LocalFocusEffect[] {
    return preparedEvents.map((event) => ({
      createdAt: timestamp,
      effectType: event.type,
      id: createUuid(),
      payload: event,
      sessionId: session.id,
      studentId: session.studentId
    }));
  }

  private async insertFocusEffect(
    database: SQLiteDatabase,
    effect: LocalFocusEffect
  ): Promise<void> {
    await database.runAsync(
      `
        insert into local_focus_effects (
          id,
          session_id,
          student_id,
          effect_type,
          payload,
          created_at
        )
        values (?, ?, ?, ?, ?, ?)
        on conflict (session_id, effect_type) do nothing
      `,
      effect.id,
      effect.sessionId,
      effect.studentId,
      effect.effectType,
      JSON.stringify(effect.payload),
      effect.createdAt
    );
  }
}
