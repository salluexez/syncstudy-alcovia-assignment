export type UUID = string;

export type TaskStatus = 'not_started' | 'in_progress' | 'done';

export type FocusSessionStatus = 'started' | 'succeeded' | 'failed';

export type FocusSessionFailReason = 'give_up' | 'app_switch';

export type PendingOperationStatus = 'pending' | 'syncing' | 'synced' | 'failed';

export type NetworkMode = 'online' | 'offline';

export type FocusEffectType = 'reward_prepared' | 'streak_update_prepared' | 'focus_minutes_prepared';

export type Student = {
  readonly id: UUID;
  readonly name: string;
  readonly coins: number;
  readonly currentStreak: number;
  readonly lastFocusDate: string | null;
  readonly updatedAt: string;
};

export type Subject = {
  readonly id: UUID;
  readonly studentId: UUID;
  readonly title: string;
  readonly lamport: number;
  readonly updatedByDeviceId: UUID | null;
  readonly deletedAt: string | null;
  readonly updatedAt: string;
};

export type Chapter = {
  readonly id: UUID;
  readonly studentId: UUID;
  readonly subjectId: UUID;
  readonly title: string;
  readonly lamport: number;
  readonly updatedByDeviceId: UUID | null;
  readonly deletedAt: string | null;
  readonly updatedAt: string;
};

export type StudyTask = {
  readonly id: UUID;
  readonly studentId: UUID;
  readonly chapterId: UUID;
  readonly title: string;
  readonly status: TaskStatus;
  readonly lamport: number;
  readonly updatedByDeviceId: UUID | null;
  readonly deletedAt: string | null;
  readonly updatedAt: string;
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
  readonly updatedAt: string;
};

export type PendingOperation = {
  readonly id: UUID;
  readonly studentId: UUID;
  readonly deviceId: UUID;
  readonly lamport: number;
  readonly entityType: string;
  readonly entityId: UUID;
  readonly operationType: string;
  readonly payload: Record<string, unknown>;
  readonly clientCreatedAt: string;
  readonly syncStatus: PendingOperationStatus;
  readonly retryCount: number;
  readonly lastError: string | null;
  readonly createdAt: string;
};

export type LocalNotificationLog = {
  readonly id: UUID;
  readonly sessionId: UUID;
  readonly eventId: string;
  readonly status: string;
  readonly message: string;
  readonly createdAt: string;
};

export type LocalFocusEffect = {
  readonly id: UUID;
  readonly sessionId: UUID;
  readonly studentId: UUID;
  readonly effectType: FocusEffectType;
  readonly payload: Record<string, unknown>;
  readonly createdAt: string;
};
