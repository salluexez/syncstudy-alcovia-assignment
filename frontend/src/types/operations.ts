import type { FocusSessionFailReason, UUID } from './domain';

export type FocusOperationType = 'SESSION_STARTED' | 'SESSION_COMPLETED' | 'SESSION_FAILED';

export type SessionStartedPayload = {
  readonly sessionId: UUID;
  readonly targetMinutes: number;
  readonly startedAtClient: string;
  readonly focusDate: string;
};

export type SessionCompletedPayload = {
  readonly sessionId: UUID;
  readonly targetMinutes: number;
  readonly actualMinutes: number;
  readonly startedAtClient: string;
  readonly completedAtClient: string;
  readonly focusDate: string;
  readonly preparedEvents: readonly PreparedFocusEvent[];
};

export type SessionFailedPayload = {
  readonly sessionId: UUID;
  readonly targetMinutes: number;
  readonly actualMinutes: number;
  readonly startedAtClient: string;
  readonly completedAtClient: string;
  readonly focusDate: string;
  readonly failReason: FocusSessionFailReason;
};

export type PreparedFocusEvent =
  | {
      readonly type: 'reward_prepared';
      readonly sessionId: UUID;
      readonly reason: 'server_will_calculate';
    }
  | {
      readonly type: 'streak_update_prepared';
      readonly sessionId: UUID;
      readonly focusDate: string;
      readonly reason: 'server_will_calculate';
    }
  | {
      readonly type: 'focus_minutes_prepared';
      readonly sessionId: UUID;
      readonly minutes: number;
      readonly focusDate: string;
    };
