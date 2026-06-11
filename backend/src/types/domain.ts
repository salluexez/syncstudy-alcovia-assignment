export type UUID = string;

export type TaskStatus = 'not_started' | 'in_progress' | 'done';

export type FocusSessionStatus = 'started' | 'succeeded' | 'failed';

export type FocusSessionFailReason = 'give_up' | 'app_switch';

export type OperationApplyStatus = 'pending' | 'applied' | 'duplicate' | 'ignored' | 'failed';

export type ProcessedEventStatus = 'pending' | 'processed' | 'failed';

export type Student = {
  readonly id: UUID;
  readonly name: string;
  readonly coins: number;
  readonly currentStreak: number;
  readonly lastFocusDate: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export type FocusSession = {
  readonly id: UUID;
  readonly studentId: UUID;
  readonly deviceId: UUID;
  readonly targetMinutes: number;
  readonly actualMinutes: number;
  readonly status: FocusSessionStatus;
  readonly failReason: FocusSessionFailReason | null;
  readonly focusDate: string;
  readonly startedAtClient: string;
  readonly completedAtClient: string | null;
  readonly lamport: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export type Subject = {
  readonly id: UUID;
  readonly studentId: UUID;
  readonly title: string;
  readonly lamport: number;
  readonly updatedByDeviceId: UUID | null;
  readonly deletedAt: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export type Chapter = {
  readonly id: UUID;
  readonly studentId: UUID;
  readonly subjectId: UUID;
  readonly title: string;
  readonly lamport: number;
  readonly updatedByDeviceId: UUID | null;
  readonly deletedAt: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export type StudyTask = {
  readonly id: UUID;
  readonly studentId: UUID;
  readonly chapterId: UUID;
  readonly title: string;
  readonly status: TaskStatus;
  readonly lamport: number;
  readonly updatedByDeviceId: UUID | null;
  readonly deletedAt: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export type OperationRecord = {
  readonly id: UUID;
  readonly studentId: UUID;
  readonly deviceId: UUID;
  readonly lamport: number;
  readonly entityType: string;
  readonly entityId: UUID;
  readonly operationType: string;
  readonly payload: Record<string, unknown>;
  readonly clientCreatedAt: string;
  readonly serverReceivedAt: Date;
  readonly appliedAt: Date | null;
  readonly applyStatus: OperationApplyStatus;
  readonly error: string | null;
};

export type ProcessedSession = {
  readonly sessionId: UUID;
  readonly studentId: UUID;
  readonly processedAt: Date;
};

export type ProcessedEvent = {
  readonly id: UUID;
  readonly studentId: UUID;
  readonly eventType: string;
  readonly dedupeKey: string;
  readonly sourceEntityType: string;
  readonly sourceEntityId: UUID;
  readonly status: ProcessedEventStatus;
  readonly payload: Record<string, unknown>;
  readonly processedAt: Date | null;
  readonly createdAt: Date;
};

export type ServerChange = {
  readonly serverSequence: number;
  readonly studentId: UUID;
  readonly entityType: string;
  readonly entityId: UUID;
  readonly changeType: string;
  readonly data: Record<string, unknown>;
  readonly createdAt: Date;
};
