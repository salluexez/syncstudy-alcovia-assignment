create extension if not exists pgcrypto;

create table if not exists students (
  id uuid primary key,
  name text not null,
  coins integer not null default 0 check (coins >= 0),
  current_streak integer not null default 0 check (current_streak >= 0),
  last_focus_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists devices (
  id uuid primary key,
  student_id uuid not null references students(id) on delete cascade,
  label text not null,
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  unique (student_id, id)
);

create table if not exists subjects (
  id uuid primary key,
  student_id uuid not null references students(id) on delete cascade,
  title text not null,
  lamport integer not null default 0 check (lamport >= 0),
  updated_by_device_id uuid references devices(id),
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists chapters (
  id uuid primary key,
  student_id uuid not null references students(id) on delete cascade,
  subject_id uuid not null references subjects(id) on delete cascade,
  title text not null,
  lamport integer not null default 0 check (lamport >= 0),
  updated_by_device_id uuid references devices(id),
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists tasks (
  id uuid primary key,
  student_id uuid not null references students(id) on delete cascade,
  chapter_id uuid not null references chapters(id) on delete cascade,
  title text not null,
  status text not null check (status in ('not_started', 'in_progress', 'done')),
  lamport integer not null default 0 check (lamport >= 0),
  updated_by_device_id uuid references devices(id),
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists focus_sessions (
  id uuid primary key,
  student_id uuid not null references students(id) on delete cascade,
  device_id uuid not null references devices(id),
  target_minutes integer not null check (target_minutes between 1 and 240),
  actual_minutes integer not null default 0 check (actual_minutes >= 0),
  status text not null check (status in ('started', 'succeeded', 'failed')),
  fail_reason text check (fail_reason in ('give_up', 'app_switch')),
  focus_date date not null,
  started_at_client text not null,
  completed_at_client text,
  lamport integer not null default 0 check (lamport >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint failed_sessions_need_reason check (
    (status = 'failed' and fail_reason is not null)
    or (status <> 'failed' and fail_reason is null)
  )
);

create table if not exists operations (
  id uuid primary key,
  student_id uuid not null references students(id) on delete cascade,
  device_id uuid not null references devices(id),
  lamport integer not null check (lamport >= 0),
  entity_type text not null,
  entity_id uuid not null,
  operation_type text not null,
  payload jsonb not null default '{}'::jsonb,
  client_created_at text not null,
  server_received_at timestamptz not null default now(),
  applied_at timestamptz,
  apply_status text not null default 'pending' check (
    apply_status in ('pending', 'applied', 'duplicate', 'ignored', 'failed')
  ),
  error text
);

create table if not exists processed_sessions (
  session_id uuid primary key references focus_sessions(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  processed_at timestamptz not null default now()
);

create table if not exists processed_events (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  event_type text not null,
  dedupe_key text not null unique,
  source_entity_type text not null,
  source_entity_id uuid not null,
  status text not null default 'pending' check (status in ('pending', 'processed', 'failed')),
  payload jsonb not null default '{}'::jsonb,
  processed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists daily_focus_totals (
  student_id uuid not null references students(id) on delete cascade,
  focus_date date not null,
  total_minutes integer not null default 0 check (total_minutes >= 0),
  successful_session_count integer not null default 0 check (successful_session_count >= 0),
  primary key (student_id, focus_date)
);

create table if not exists server_changes (
  server_sequence bigserial primary key,
  student_id uuid not null references students(id) on delete cascade,
  entity_type text not null,
  entity_id uuid not null,
  change_type text not null,
  data jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists devices_student_id_idx on devices(student_id);
create index if not exists subjects_student_id_idx on subjects(student_id);
create index if not exists chapters_student_id_idx on chapters(student_id);
create index if not exists chapters_subject_id_idx on chapters(subject_id);
create index if not exists tasks_student_id_idx on tasks(student_id);
create index if not exists tasks_chapter_id_idx on tasks(chapter_id);
create index if not exists focus_sessions_student_id_idx on focus_sessions(student_id);
create index if not exists operations_student_device_idx on operations(student_id, device_id);
create index if not exists operations_student_received_idx on operations(student_id, server_received_at);
create index if not exists processed_events_student_id_idx on processed_events(student_id);
create index if not exists server_changes_student_sequence_idx on server_changes(student_id, server_sequence);
