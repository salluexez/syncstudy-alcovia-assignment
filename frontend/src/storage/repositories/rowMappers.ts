import type {
  Chapter,
  FocusSession,
  LocalNotificationLog,
  PendingOperation,
  Student,
  StudyTask,
  Subject
} from '../../types/domain';

export type StudentRow = {
  id: string;
  name: string;
  coins: number;
  current_streak: number;
  last_focus_date: string | null;
  updated_at: string;
};

export const mapStudent = (row: StudentRow): Student => ({
  coins: row.coins,
  currentStreak: row.current_streak,
  id: row.id,
  lastFocusDate: row.last_focus_date,
  name: row.name,
  updatedAt: row.updated_at
});

export type SubjectRow = {
  id: string;
  student_id: string;
  title: string;
  lamport: number;
  updated_by_device_id: string | null;
  deleted_at: string | null;
  updated_at: string;
};

export const mapSubject = (row: SubjectRow): Subject => ({
  deletedAt: row.deleted_at,
  id: row.id,
  lamport: row.lamport,
  studentId: row.student_id,
  title: row.title,
  updatedAt: row.updated_at,
  updatedByDeviceId: row.updated_by_device_id
});

export type ChapterRow = SubjectRow & {
  subject_id: string;
};

export const mapChapter = (row: ChapterRow): Chapter => ({
  deletedAt: row.deleted_at,
  id: row.id,
  lamport: row.lamport,
  studentId: row.student_id,
  subjectId: row.subject_id,
  title: row.title,
  updatedAt: row.updated_at,
  updatedByDeviceId: row.updated_by_device_id
});

export type TaskRow = {
  id: string;
  student_id: string;
  chapter_id: string;
  title: string;
  status: 'not_started' | 'in_progress' | 'done';
  lamport: number;
  updated_by_device_id: string | null;
  deleted_at: string | null;
  updated_at: string;
};

export const mapTask = (row: TaskRow): StudyTask => ({
  chapterId: row.chapter_id,
  deletedAt: row.deleted_at,
  id: row.id,
  lamport: row.lamport,
  status: row.status,
  studentId: row.student_id,
  title: row.title,
  updatedAt: row.updated_at,
  updatedByDeviceId: row.updated_by_device_id
});

export type FocusSessionRow = {
  id: string;
  student_id: string;
  device_id: string;
  target_minutes: number;
  actual_minutes: number;
  status: 'started' | 'succeeded' | 'failed';
  fail_reason: 'give_up' | 'app_switch' | null;
  focus_date: string;
  started_at_client: string;
  completed_at_client: string | null;
  lamport: number;
  updated_at: string;
};

export const mapFocusSession = (row: FocusSessionRow): FocusSession => ({
  actualMinutes: row.actual_minutes,
  completedAtClient: row.completed_at_client,
  deviceId: row.device_id,
  failReason: row.fail_reason,
  focusDate: row.focus_date,
  id: row.id,
  lamport: row.lamport,
  startedAtClient: row.started_at_client,
  status: row.status,
  studentId: row.student_id,
  targetMinutes: row.target_minutes,
  updatedAt: row.updated_at
});

export type PendingOperationRow = {
  id: string;
  student_id: string;
  device_id: string;
  lamport: number;
  entity_type: string;
  entity_id: string;
  operation_type: string;
  payload: string;
  client_created_at: string;
  sync_status: 'pending' | 'syncing' | 'synced' | 'failed';
  retry_count: number;
  last_error: string | null;
  created_at: string;
};

export const mapPendingOperation = (row: PendingOperationRow): PendingOperation => ({
  clientCreatedAt: row.client_created_at,
  createdAt: row.created_at,
  deviceId: row.device_id,
  entityId: row.entity_id,
  entityType: row.entity_type,
  id: row.id,
  lamport: row.lamport,
  lastError: row.last_error,
  operationType: row.operation_type,
  payload: JSON.parse(row.payload) as Record<string, unknown>,
  retryCount: row.retry_count,
  studentId: row.student_id,
  syncStatus: row.sync_status
});

export type NotificationLogRow = {
  id: string;
  session_id: string;
  event_id: string;
  status: string;
  message: string;
  created_at: string;
};

export const mapNotificationLog = (row: NotificationLogRow): LocalNotificationLog => ({
  createdAt: row.created_at,
  eventId: row.event_id,
  id: row.id,
  message: row.message,
  sessionId: row.session_id,
  status: row.status
});
