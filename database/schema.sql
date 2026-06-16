create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text,
  avatar_url text,
  role text not null default 'member' check (role in ('admin', 'member', 'agent')),
  managed_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.is_admin(uid uuid default auth.uid())
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = uid
      and role = 'admin'
  );
$$;

create or replace function public.can_manage_agent(target_uid uuid, viewer_uid uuid default auth.uid())
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles target
    join public.profiles viewer on viewer.id = viewer_uid
    where target.id = target_uid
      and target.role = 'agent'
      and viewer.role = 'member'
      and (
        target.managed_by = viewer_uid
        or exists (
          select 1
          from public.school_assignments agent_assignment
          where agent_assignment.user_id = target_uid
            and agent_assignment.assigned_by = viewer_uid
        )
        or exists (
          select 1
          from public.school_assignments agent_assignment
          join public.school_assignments viewer_assignment
            on viewer_assignment.school_id = agent_assignment.school_id
           and viewer_assignment.user_id = viewer_uid
          where agent_assignment.user_id = target_uid
        )
      )
  );
$$;

create or replace function public.can_view_user(target_uid uuid, viewer_uid uuid default auth.uid())
returns boolean
language sql
security definer
set search_path = public
as $$
  select
    target_uid = viewer_uid
    or public.is_admin(viewer_uid)
    or public.can_manage_agent(target_uid, viewer_uid);
$$;

create table if not exists public.platform_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  school_id uuid not null references public.schools(id) on delete cascade,
  platform text not null check (platform in ('抖音', '小红书')),
  account_name text not null,
  account_id text,
  account_password text,
  account_link text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, school_id, platform)
);

create table if not exists public.schools (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  campus_name text,
  city text not null default '乌鲁木齐',
  dormitory_info text,
  cafeteria_info text,
  nearby_food text,
  nearby_fun text,
  registration_notes text,
  essentials text,
  campus_card_notes text,
  bedding_scenarios text,
  freshman_faq text,
  banned_phrases text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.school_assignments (
  user_id uuid not null references public.profiles(id) on delete cascade,
  school_id uuid not null references public.schools(id) on delete cascade,
  assigned_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (user_id, school_id)
);

create table if not exists public.content_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  school_id uuid not null references public.schools(id) on delete cascade,
  platform text not null check (platform in ('小红书', '抖音', '视频号')),
  content_type text not null,
  content_goal text not null,
  tone text not null,
  output jsonb not null default '{}'::jsonb,
  risk_hits jsonb not null default '[]'::jsonb,
  status text not null default 'saved' check (status in ('draft', 'saved')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.publication_records (
  id uuid primary key default gen_random_uuid(),
  content_id uuid not null references public.content_records(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  school_id uuid not null references public.schools(id) on delete cascade,
  platform text not null check (platform in ('小红书', '抖音', '视频号')),
  published_at timestamptz,
  publish_url text,
  views integer not null default 0 check (views >= 0),
  likes integer not null default 0 check (likes >= 0),
  favorites integer not null default 0 check (favorites >= 0),
  comments integer not null default 0 check (comments >= 0),
  private_messages integer not null default 0 check (private_messages >= 0),
  wechat_adds integer not null default 0 check (wechat_adds >= 0),
  conversions integer not null default 0 check (conversions >= 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.publish_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  school_id uuid references public.schools(id) on delete set null,
  task_date date not null,
  required_count integer not null default 1 check (required_count > 0),
  completed_count integer not null default 0 check (completed_count >= 0),
  is_done boolean not null default false,
  note text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_school_assignments_user on public.school_assignments(user_id);
create index if not exists idx_content_records_user on public.content_records(user_id);
create index if not exists idx_content_records_school on public.content_records(school_id);
create index if not exists idx_publication_records_user on public.publication_records(user_id);
create index if not exists idx_publication_records_school on public.publication_records(school_id);
create index if not exists idx_publish_tasks_user_date on public.publish_tasks(user_id, task_date);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role, managed_by)
  values (
    new.id,
    new.email,
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(nullif(new.raw_user_meta_data ->> 'role', ''), 'member'),
    nullif(new.raw_user_meta_data ->> 'managed_by', '')::uuid
  )
  on conflict (id) do update
  set
    email = excluded.email,
    full_name = coalesce(excluded.full_name, public.profiles.full_name),
    managed_by = coalesce(excluded.managed_by, public.profiles.managed_by),
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.schools enable row level security;
alter table public.school_assignments enable row level security;
alter table public.content_records enable row level security;
alter table public.publication_records enable row level security;
alter table public.publish_tasks enable row level security;

drop policy if exists "profiles_select_own_or_admin" on public.profiles;
drop policy if exists "profiles_select_visible" on public.profiles;
create policy "profiles_select_visible"
on public.profiles
for select
to authenticated
using (public.can_view_user(id));

drop policy if exists "profiles_update_admin" on public.profiles;
create policy "profiles_update_admin"
on public.profiles
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "schools_select_assigned_or_admin" on public.schools;
drop policy if exists "schools_select_visible" on public.schools;
create policy "schools_select_visible"
on public.schools
for select
to authenticated
using (
  public.is_admin()
  or exists (
    select 1
    from public.school_assignments sa
    where sa.school_id = schools.id
      and public.can_view_user(sa.user_id)
  )
);

drop policy if exists "schools_insert_admin" on public.schools;
create policy "schools_insert_admin"
on public.schools
for insert
to authenticated
with check (public.is_admin());

drop policy if exists "schools_update_admin" on public.schools;
drop policy if exists "schools_update_admin_or_assigned" on public.schools;
create policy "schools_update_admin_or_assigned"
on public.schools
for update
to authenticated
using (
  public.is_admin()
  or (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'member'
    )
    and exists (
      select 1
      from public.school_assignments sa
      where sa.school_id = schools.id
        and sa.user_id = auth.uid()
    )
  )
)
with check (
  public.is_admin()
  or (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'member'
    )
    and exists (
      select 1
      from public.school_assignments sa
      where sa.school_id = schools.id
        and sa.user_id = auth.uid()
    )
  )
);

drop policy if exists "schools_delete_admin" on public.schools;
create policy "schools_delete_admin"
on public.schools
for delete
to authenticated
using (public.is_admin());

drop policy if exists "assignments_select_self_or_admin" on public.school_assignments;
drop policy if exists "assignments_select_visible" on public.school_assignments;
create policy "assignments_select_visible"
on public.school_assignments
for select
to authenticated
using (public.can_view_user(user_id));

drop policy if exists "assignments_insert_admin" on public.school_assignments;
create policy "assignments_insert_admin"
on public.school_assignments
for insert
to authenticated
with check (public.is_admin());

drop policy if exists "assignments_delete_admin" on public.school_assignments;
create policy "assignments_delete_admin"
on public.school_assignments
for delete
to authenticated
using (public.is_admin());

drop policy if exists "content_select_self_or_admin" on public.content_records;
drop policy if exists "content_select_visible" on public.content_records;
create policy "content_select_visible"
on public.content_records
for select
to authenticated
using (public.can_view_user(user_id));

drop policy if exists "content_insert_self_assigned" on public.content_records;
create policy "content_insert_self_assigned"
on public.content_records
for insert
to authenticated
with check (
  user_id = auth.uid()
  and (
    public.is_admin()
    or exists (
      select 1
      from public.school_assignments sa
      where sa.school_id = content_records.school_id
        and sa.user_id = auth.uid()
    )
  )
);

drop policy if exists "content_update_self_or_admin" on public.content_records;
create policy "content_update_self_or_admin"
on public.content_records
for update
to authenticated
using (public.is_admin() or user_id = auth.uid())
with check (
  public.is_admin()
  or (
    user_id = auth.uid()
    and exists (
      select 1
      from public.school_assignments sa
      where sa.school_id = content_records.school_id
        and sa.user_id = auth.uid()
    )
  )
);

drop policy if exists "publication_select_self_or_admin" on public.publication_records;
drop policy if exists "publication_select_visible" on public.publication_records;
create policy "publication_select_visible"
on public.publication_records
for select
to authenticated
using (public.can_view_user(user_id));

drop policy if exists "publication_insert_self_or_admin" on public.publication_records;
create policy "publication_insert_self_or_admin"
on public.publication_records
for insert
to authenticated
with check (
  public.is_admin()
  or (
    user_id = auth.uid()
    and exists (
      select 1
      from public.content_records cr
      where cr.id = publication_records.content_id
        and cr.user_id = auth.uid()
        and cr.school_id = publication_records.school_id
        and cr.platform = publication_records.platform
    )
  )
);

drop policy if exists "publication_update_self_or_admin" on public.publication_records;
create policy "publication_update_self_or_admin"
on public.publication_records
for update
to authenticated
using (public.is_admin() or user_id = auth.uid())
with check (
  public.is_admin()
  or (
    user_id = auth.uid()
    and exists (
      select 1
      from public.content_records cr
      where cr.id = publication_records.content_id
        and cr.user_id = auth.uid()
        and cr.school_id = publication_records.school_id
        and cr.platform = publication_records.platform
    )
  )
);

drop policy if exists "tasks_select_self_or_admin" on public.publish_tasks;
drop policy if exists "tasks_select_visible" on public.publish_tasks;
create policy "tasks_select_visible"
on public.publish_tasks
for select
to authenticated
using (public.can_view_user(user_id));

drop policy if exists "tasks_insert_admin" on public.publish_tasks;
create policy "tasks_insert_admin"
on public.publish_tasks
for insert
to authenticated
with check (public.is_admin());

drop policy if exists "tasks_update_self_or_admin" on public.publish_tasks;
create policy "tasks_update_self_or_admin"
on public.publish_tasks
for update
to authenticated
using (public.is_admin() or user_id = auth.uid())
with check (public.is_admin() or user_id = auth.uid());

alter table public.platform_accounts enable row level security;

drop policy if exists "accounts_select_own_or_admin" on public.platform_accounts;
drop policy if exists "accounts_select_visible" on public.platform_accounts;
create policy "accounts_select_visible"
on public.platform_accounts
for select
to authenticated
using (public.can_view_user(user_id));

create policy "accounts_insert_own"
on public.platform_accounts
for insert
to authenticated
with check (user_id = auth.uid());

create policy "accounts_update_own"
on public.platform_accounts
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "accounts_delete_own"
on public.platform_accounts
for delete
to authenticated
using (user_id = auth.uid());

-- After creating the first admin account in Supabase Auth, run:
-- update public.profiles set role = 'admin' where email = 'your-admin-email@example.com';
