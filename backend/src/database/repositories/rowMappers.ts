import type {
  Chapter,
  FocusSession,
  OperationRecord,
  ProcessedEvent,
  ProcessedSession,
  ServerChange,
  Student,
  StudyTask,
  Subject
} from '../../types/domain.js';

export type StudentRow = {
  id: string;
  name: string;
  coins: number;
  current_streak: number;
  last_focus_date: string | null;
  created_at: Date;
  updated_at: Date;
};

export const mapStudent = (row: StudentRow): Student => ({
  coins: row.coins,
  createdAt: row.created_at,
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
  deleted_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

export const mapSubject = (row: SubjectRow): Subject => ({
  createdAt: row.created_at,
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
  createdAt: row.created_at,
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
  deleted_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

export const mapTask = (row: TaskRow): StudyTask => ({
  chapterId: row.chapter_id,
  createdAt: row.created_at,
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
  created_at: Date;
  updated_at: Date;
};

export const mapFocusSession = (row: FocusSessionRow): FocusSession => ({
  actualMinutes: row.actual_minutes,
  completedAtClient: row.completed_at_client,
  createdAt: row.created_at,
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

export type OperationRow = {
  id: string;
  student_id: string;
  device_id: string;
  lamport: number;
  entity_type: string;
  entity_id: string;
  operation_type: string;
  payload: Record<string, unknown>;
  client_created_at: string;
  server_received_at: Date;
  applied_at: Date | null;
  apply_status: 'pending' | 'applied' | 'duplicate' | 'ignored' | 'failed';
  error: string | null;
};

export const mapOperation = (row: OperationRow): OperationRecord => ({
  appliedAt: row.applied_at,
  applyStatus: row.apply_status,
  clientCreatedAt: row.client_created_at,
  deviceId: row.device_id,
  entityId: row.entity_id,
  entityType: row.entity_type,
  error: row.error,
  id: row.id,
  lamport: row.lamport,
  operationType: row.operation_type,
  payload: row.payload,
  serverReceivedAt: row.server_received_at,
  studentId: row.student_id
});

export type ProcessedSessionRow = {
  session_id: string;
  student_id: string;
  processed_at: Date;
};

export const mapProcessedSession = (row: ProcessedSessionRow): ProcessedSession => ({
  processedAt: row.processed_at,
  sessionId: row.session_id,
  studentId: row.student_id
});

export type ProcessedEventRow = {
  id: string;
  student_id: string;
  event_type: string;
  dedupe_key: string;
  source_entity_type: string;
  source_entity_id: string;
  status: 'pending' | 'processed' | 'failed';
  payload: Record<string, unknown>;
  processed_at: Date | null;
  created_at: Date;
};

export const mapProcessedEvent = (row: ProcessedEventRow): ProcessedEvent => ({
  createdAt: row.created_at,
  dedupeKey: row.dedupe_key,
  eventType: row.event_type,
  id: row.id,
  payload: row.payload,
  processedAt: row.processed_at,
  sourceEntityId: row.source_entity_id,
  sourceEntityType: row.source_entity_type,
  status: row.status,
  studentId: row.student_id
});

export type ServerChangeRow = {
  server_sequence: string;
  student_id: string;
  entity_type: string;
  entity_id: string;
  change_type: string;
  data: Record<string, unknown>;
  created_at: Date;
};

export const mapServerChange = (row: ServerChangeRow): ServerChange => ({
  changeType: row.change_type,
  createdAt: row.created_at,
  data: row.data,
  entityId: row.entity_id,
  entityType: row.entity_type,
  serverSequence: Number(row.server_sequence),
  studentId: row.student_id
});
