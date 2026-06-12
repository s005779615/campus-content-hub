begin;

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check check (role in ('admin', 'member'));

create or replace function public.can_view_user(target_uid uuid, viewer_uid uuid default auth.uid())
returns boolean
language sql
security definer
set search_path = public
as $$
  select
    target_uid = viewer_uid
    or public.is_admin(viewer_uid);
$$;

alter table public.platform_accounts
  add column if not exists account_positioning text not null default '校园生活号',
  add column if not exists daily_publish_target integer not null default 1,
  add column if not exists status text not null default '启用',
  add column if not exists assigned_by uuid references public.profiles(id) on delete set null;

alter table public.platform_accounts drop constraint if exists platform_accounts_platform_check;
alter table public.platform_accounts
  add constraint platform_accounts_platform_check check (platform in ('抖音', '小红书', '视频号'));
alter table public.platform_accounts
  drop constraint if exists platform_accounts_account_positioning_check;
alter table public.platform_accounts
  add constraint platform_accounts_account_positioning_check
  check (account_positioning in ('学长号', '校园墙', '校园生活号', '新生攻略号'));
alter table public.platform_accounts
  drop constraint if exists platform_accounts_status_check;
alter table public.platform_accounts
  add constraint platform_accounts_status_check check (status in ('启用', '暂停', '异常'));
alter table public.platform_accounts
  drop constraint if exists platform_accounts_daily_publish_target_check;
alter table public.platform_accounts
  add constraint platform_accounts_daily_publish_target_check check (daily_publish_target > 0);

alter table public.publish_tasks
  add column if not exists platform text,
  add column if not exists content_type text,
  add column if not exists platform_account_id uuid references public.platform_accounts(id) on delete set null,
  add column if not exists content_id uuid references public.content_records(id) on delete set null,
  add column if not exists status text not null default '未开始',
  add column if not exists publish_screenshot_url text,
  add column if not exists review_notes text,
  add column if not exists reviewed_at timestamptz;

alter table public.publish_tasks
  drop constraint if exists publish_tasks_platform_check;
alter table public.publish_tasks
  add constraint publish_tasks_platform_check
  check (platform is null or platform in ('抖音', '小红书', '视频号'));
alter table public.publish_tasks
  drop constraint if exists publish_tasks_status_check;
alter table public.publish_tasks
  add constraint publish_tasks_status_check
  check (status in ('未开始', '已生成', '待发布', '已发布', '已回填', '已复盘', '异常'));

update public.publish_tasks
set status = case when is_done then '已回填' else '未开始' end
where status = '未开始';

alter table public.content_records
  add column if not exists task_id uuid references public.publish_tasks(id) on delete set null;

alter table public.content_records drop constraint if exists content_records_status_check;
alter table public.content_records
  add constraint content_records_status_check
  check (status in ('draft', 'saved', '待发布', '已发布', '已回填', '已复盘', '异常'));

alter table public.publication_records
  add column if not exists task_id uuid references public.publish_tasks(id) on delete set null,
  add column if not exists screenshot_url text,
  add column if not exists valid_inquiries integer not null default 0,
  add column if not exists revenue numeric(12,2) not null default 0;

alter table public.publication_records
  drop constraint if exists publication_records_valid_inquiries_check;
alter table public.publication_records
  add constraint publication_records_valid_inquiries_check check (valid_inquiries >= 0);
alter table public.publication_records
  drop constraint if exists publication_records_revenue_check;
alter table public.publication_records
  add constraint publication_records_revenue_check check (revenue >= 0);

create table if not exists public.task_events (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.publish_tasks(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  from_status text,
  to_status text not null,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists idx_platform_accounts_user_school on public.platform_accounts(user_id, school_id);
create index if not exists idx_publish_tasks_status_date on public.publish_tasks(status, task_date);
create index if not exists idx_publish_tasks_account on public.publish_tasks(platform_account_id);
create index if not exists idx_task_events_task on public.task_events(task_id, created_at);
create index if not exists idx_publications_task on public.publication_records(task_id);

alter table public.task_events enable row level security;

drop policy if exists "profiles_select_own_or_admin" on public.profiles;
drop policy if exists "profiles_select_visible" on public.profiles;
create policy "profiles_select_visible"
on public.profiles for select to authenticated
using (public.can_view_user(id));

drop policy if exists "schools_select_assigned_or_admin" on public.schools;
drop policy if exists "schools_select_visible" on public.schools;
create policy "schools_select_visible"
on public.schools for select to authenticated
using (
  public.is_admin()
  or exists (
    select 1 from public.school_assignments sa
    where sa.school_id = schools.id
      and public.can_view_user(sa.user_id)
  )
);

drop policy if exists "assignments_select_self_or_admin" on public.school_assignments;
drop policy if exists "assignments_select_visible" on public.school_assignments;
create policy "assignments_select_visible"
on public.school_assignments for select to authenticated
using (public.can_view_user(user_id));

drop policy if exists "content_select_self_or_admin" on public.content_records;
drop policy if exists "content_select_visible" on public.content_records;
create policy "content_select_visible"
on public.content_records for select to authenticated
using (public.can_view_user(user_id));

drop policy if exists "content_insert_self_assigned" on public.content_records;
create policy "content_insert_self_assigned"
on public.content_records for insert to authenticated
with check (
  public.is_admin()
  or (
    user_id = auth.uid()
    and exists (
      select 1 from public.school_assignments sa
      where sa.school_id = content_records.school_id
        and sa.user_id = auth.uid()
    )
  )
);

drop policy if exists "publication_select_self_or_admin" on public.publication_records;
drop policy if exists "publication_select_visible" on public.publication_records;
create policy "publication_select_visible"
on public.publication_records for select to authenticated
using (public.can_view_user(user_id));

drop policy if exists "tasks_select_self_or_admin" on public.publish_tasks;
drop policy if exists "tasks_select_visible" on public.publish_tasks;
create policy "tasks_select_visible"
on public.publish_tasks for select to authenticated
using (public.can_view_user(user_id));

drop policy if exists "tasks_insert_admin" on public.publish_tasks;
drop policy if exists "tasks_insert_manager" on public.publish_tasks;
create policy "tasks_insert_manager"
on public.publish_tasks for insert to authenticated
with check (
  public.is_admin()
);

drop policy if exists "accounts_select_own_or_admin" on public.platform_accounts;
drop policy if exists "accounts_select_visible" on public.platform_accounts;
create policy "accounts_select_visible"
on public.platform_accounts for select to authenticated
using (public.can_view_user(user_id));

drop policy if exists "accounts_insert_own" on public.platform_accounts;
drop policy if exists "accounts_insert_manager" on public.platform_accounts;
create policy "accounts_insert_manager"
on public.platform_accounts for insert to authenticated
with check (
  public.is_admin()
);

drop policy if exists "accounts_update_own" on public.platform_accounts;
drop policy if exists "accounts_update_manager" on public.platform_accounts;
create policy "accounts_update_manager"
on public.platform_accounts for update to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "accounts_delete_own" on public.platform_accounts;
drop policy if exists "accounts_delete_manager" on public.platform_accounts;
create policy "accounts_delete_manager"
on public.platform_accounts for delete to authenticated
using (public.is_admin());

drop policy if exists "task_events_select_visible" on public.task_events;
create policy "task_events_select_visible"
on public.task_events for select to authenticated
using (
  exists (
    select 1 from public.publish_tasks t
    where t.id = task_events.task_id and public.can_view_user(t.user_id)
  )
);

drop policy if exists "task_events_insert_visible" on public.task_events;
create policy "task_events_insert_visible"
on public.task_events for insert to authenticated
with check (
  actor_id = auth.uid()
  and exists (
    select 1 from public.publish_tasks t
    where t.id = task_events.task_id and public.can_view_user(t.user_id)
  )
);

insert into storage.buckets (id, name, public)
values ('task-screenshots', 'task-screenshots', true)
on conflict (id) do update set public = true;

drop policy if exists "task_screenshots_select" on storage.objects;
create policy "task_screenshots_select"
on storage.objects for select to authenticated
using (bucket_id = 'task-screenshots');

drop policy if exists "task_screenshots_insert" on storage.objects;
create policy "task_screenshots_insert"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'task-screenshots'
  and (storage.foldername(name))[1] = auth.uid()::text
);

commit;
