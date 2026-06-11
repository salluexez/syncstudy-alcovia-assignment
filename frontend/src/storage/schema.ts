export const LOCAL_DATABASE_NAME = 'syncstudy.db';
export const LOCAL_SCHEMA_VERSION = 2;

export const localSchemaSql = `
pragma foreign_keys = on;

create table if not exists local_metadata (
  key text primary key,
  value text not null
);

create table if not exists local_students (
  id text primary key,
  name text not null,
  coins integer not null default 0 check (coins >= 0),
  current_streak integer not null default 0 check (current_streak >= 0),
  last_focus_date text,
  updated_at text not null
);

create table if not exists local_subjects (
  id text primary key,
  student_id text not null,
  title text not null,
  lamport integer not null default 0 check (lamport >= 0),
  updated_by_device_id text,
  deleted_at text,
  updated_at text not null,
  dirty integer not null default 0 check (dirty in (0, 1))
);

create table if not exists local_chapters (
  id text primary key,
  student_id text not null,
  subject_id text not null,
  title text not null,
  lamport integer not null default 0 check (lamport >= 0),
  updated_by_device_id text,
  deleted_at text,
  updated_at text not null,
  dirty integer not null default 0 check (dirty in (0, 1))
);

create table if not exists local_tasks (
  id text primary key,
  student_id text not null,
  chapter_id text not null,
  title text not null,
  status text not null check (status in ('not_started', 'in_progress', 'done')),
  lamport integer not null default 0 check (lamport >= 0),
  updated_by_device_id text,
  deleted_at text,
  updated_at text not null,
  dirty integer not null default 0 check (dirty in (0, 1))
);

create table if not exists local_focus_sessions (
  id text primary key,
  student_id text not null,
  device_id text not null,
  target_minutes integer not null check (target_minutes between 1 and 240),
  actual_minutes integer not null default 0 check (actual_minutes >= 0),
  status text not null check (status in ('started', 'succeeded', 'failed')),
  fail_reason text check (fail_reason in ('give_up', 'app_switch')),
  focus_date text not null,
  started_at_client text not null,
  completed_at_client text,
  lamport integer not null default 0 check (lamport >= 0),
  updated_at text not null,
  dirty integer not null default 0 check (dirty in (0, 1)),
  constraint local_failed_sessions_need_reason check (
    (status = 'failed' and fail_reason is not null)
    or (status <> 'failed' and fail_reason is null)
  )
);

create table if not exists pending_operations (
  id text primary key,
  student_id text not null,
  device_id text not null,
  lamport integer not null check (lamport >= 0),
  entity_type text not null,
  entity_id text not null,
  operation_type text not null,
  payload text not null,
  client_created_at text not null,
  sync_status text not null default 'pending' check (sync_status in ('pending', 'syncing', 'synced', 'failed')),
  retry_count integer not null default 0 check (retry_count >= 0),
  last_error text,
  created_at text not null
);

create table if not exists applied_remote_operations (
  operation_id text primary key,
  applied_at text not null
);

create table if not exists local_notification_logs (
  id text primary key,
  session_id text not null,
  event_id text not null,
  status text not null,
  message text not null,
  created_at text not null
);

create table if not exists local_focus_effects (
  id text primary key,
  session_id text not null,
  student_id text not null,
  effect_type text not null check (
    effect_type in ('reward_prepared', 'streak_update_prepared', 'focus_minutes_prepared')
  ),
  payload text not null,
  created_at text not null,
  unique (session_id, effect_type)
);

create table if not exists sync_state (
  key text primary key,
  value text not null
);

create index if not exists local_subjects_student_idx on local_subjects(student_id);
create index if not exists local_chapters_student_idx on local_chapters(student_id);
create index if not exists local_chapters_subject_idx on local_chapters(subject_id);
create index if not exists local_tasks_student_idx on local_tasks(student_id);
create index if not exists local_tasks_chapter_idx on local_tasks(chapter_id);
create index if not exists local_focus_sessions_student_idx on local_focus_sessions(student_id);
create index if not exists pending_operations_status_idx on pending_operations(sync_status, created_at);
create index if not exists pending_operations_student_device_idx on pending_operations(student_id, device_id);
create index if not exists local_notification_logs_event_idx on local_notification_logs(event_id);
create index if not exists local_focus_effects_session_idx on local_focus_effects(session_id);
`;
