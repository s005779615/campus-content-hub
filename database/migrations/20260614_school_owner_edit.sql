begin;

drop policy if exists "schools_update_admin" on public.schools;
drop policy if exists "schools_update_admin_or_assigned" on public.schools;
create policy "schools_update_admin_or_assigned"
on public.schools
for update
to authenticated
using (
  public.is_admin()
  or exists (
    select 1
    from public.school_assignments sa
    where sa.school_id = schools.id
      and sa.user_id = auth.uid()
  )
)
with check (
  public.is_admin()
  or exists (
    select 1
    from public.school_assignments sa
    where sa.school_id = schools.id
      and sa.user_id = auth.uid()
  )
);

commit;
