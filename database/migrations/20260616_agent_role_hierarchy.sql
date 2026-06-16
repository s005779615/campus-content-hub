begin;

alter table public.profiles
  add column if not exists managed_by uuid references public.profiles(id) on delete set null;

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check check (role in ('admin', 'member', 'agent'));

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

drop policy if exists "accounts_select_own_or_admin" on public.platform_accounts;
drop policy if exists "accounts_select_visible" on public.platform_accounts;
create policy "accounts_select_visible"
on public.platform_accounts for select to authenticated
using (public.can_view_user(user_id));

drop policy if exists "task_events_select_visible" on public.task_events;
create policy "task_events_select_visible"
on public.task_events for select to authenticated
using (
  exists (
    select 1 from public.publish_tasks t
    where t.id = task_events.task_id and public.can_view_user(t.user_id)
  )
);

commit;
