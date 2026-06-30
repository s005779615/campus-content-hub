alter table public.platform_accounts
  add column if not exists positioning_profile jsonb not null default '{}'::jsonb,
  add column if not exists positioning_status text not null default '未确认',
  add column if not exists positioning_generated_at timestamptz,
  add column if not exists positioning_confirmed_at timestamptz;

alter table public.platform_accounts
  drop constraint if exists platform_accounts_positioning_status_check;

alter table public.platform_accounts
  add constraint platform_accounts_positioning_status_check
  check (positioning_status in ('未确认', '已生成', '已确认'));

create table if not exists public.operations_workflow_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  school_id uuid references public.schools(id) on delete set null,
  step text not null check (step in ('account_positioning', 'diagnostic', 'strategy', 'content_tasks')),
  payload jsonb not null default '{}'::jsonb,
  cycle_start_date date,
  cycle_end_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_operations_workflow_results_user
on public.operations_workflow_results(user_id, created_at desc);

create index if not exists idx_operations_workflow_results_school_step
on public.operations_workflow_results(school_id, step, created_at desc);

alter table public.operations_workflow_results enable row level security;

drop policy if exists "operations_workflow_select_visible" on public.operations_workflow_results;
create policy "operations_workflow_select_visible"
on public.operations_workflow_results for select to authenticated
using (
  public.is_admin(auth.uid())
  or user_id = auth.uid()
  or exists (
    select 1
    from public.profiles p
    where p.id = operations_workflow_results.user_id
      and p.managed_by = auth.uid()
  )
);

drop policy if exists "operations_workflow_insert_self_or_manager" on public.operations_workflow_results;
create policy "operations_workflow_insert_self_or_manager"
on public.operations_workflow_results for insert to authenticated
with check (
  public.is_admin(auth.uid())
  or user_id = auth.uid()
  or exists (
    select 1
    from public.profiles p
    where p.id = operations_workflow_results.user_id
      and p.managed_by = auth.uid()
  )
);

drop policy if exists "operations_workflow_delete_manager" on public.operations_workflow_results;
create policy "operations_workflow_delete_manager"
on public.operations_workflow_results for delete to authenticated
using (
  public.is_admin(auth.uid())
  or user_id = auth.uid()
  or exists (
    select 1
    from public.profiles p
    where p.id = operations_workflow_results.user_id
      and p.managed_by = auth.uid()
  )
);
