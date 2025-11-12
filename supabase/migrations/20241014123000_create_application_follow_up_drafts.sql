create table if not exists public.application_follow_up_drafts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  job_application_id uuid not null references public.job_applications (id) on delete cascade,
  generated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists application_follow_up_drafts_user_job_unique
  on public.application_follow_up_drafts (user_id, job_application_id);

create index if not exists application_follow_up_drafts_job_application_idx
  on public.application_follow_up_drafts (job_application_id);
