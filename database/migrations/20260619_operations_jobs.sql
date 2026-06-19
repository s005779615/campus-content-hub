create table if not exists public.operations_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  school_id uuid references public.schools(id),
  school_name text,
  status text not null default 'pending' check (status in ('pending','running','completed','failed','cancelled')),
  progress text default '排队中...',
  plan_data jsonb,
  error_message text,
  retries int not null default 0,
  max_retries int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.operations_jobs enable row level security;

create policy "jobs_select_own"
on public.operations_jobs for select to authenticated
using (user_id = auth.uid());

create policy "jobs_insert_own"
on public.operations_jobs for insert to authenticated
with check (user_id = auth.uid());

create policy "jobs_update_own"
on public.operations_jobs for update to authenticated
using (user_id = auth.uid());
