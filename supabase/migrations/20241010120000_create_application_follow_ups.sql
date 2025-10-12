create table if not exists public.application_follow_ups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  job_application_id uuid not null references public.job_applications (id) on delete cascade,
  enabled boolean not null default false,
  interval_days integer not null default 7 check (interval_days > 0 and interval_days <= 60),
  next_follow_up_date timestamptz,
  last_notified_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists application_follow_ups_user_app_unique
  on public.application_follow_ups (user_id, job_application_id);
