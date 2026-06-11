create table if not exists reward_events (
  id uuid primary key,
  student_id uuid not null references students(id) on delete cascade,
  session_id uuid not null references focus_sessions(id) on delete cascade,
  focus_date date not null,
  coins_awarded integer not null check (coins_awarded >= 0),
  minutes_awarded integer not null check (minutes_awarded >= 0),
  streak_after integer not null check (streak_after >= 0),
  created_at timestamptz not null default now()
);

create index if not exists reward_events_student_id_idx on reward_events(student_id);
create index if not exists reward_events_session_id_idx on reward_events(session_id);
