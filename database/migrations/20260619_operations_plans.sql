create table if not exists public.operations_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  school_id uuid references public.schools(id) on delete set null,
  plan_data jsonb not null default '{}',
  school_level text,
  investment_level text,
  plan_version text default '1.0',
  created_at timestamptz not null default now()
);

alter table public.operations_plans enable row level security;

create policy "plans_select_visible"
on public.operations_plans for select to authenticated
using (public.can_view_user(user_id));

create policy "plans_insert_own"
on public.operations_plans for insert to authenticated
with check (user_id = auth.uid());

create policy "plans_delete_own"
on public.operations_plans for delete to authenticated
using (user_id = auth.uid());
