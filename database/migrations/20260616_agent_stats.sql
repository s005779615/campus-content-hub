-- 代理层级统计表
create table if not exists public.user_activity_stats (
  user_id uuid references public.profiles(id) on delete cascade,
  stat_date date not null default current_date,
  publish_count int not null default 0,
  ai_generate_count int not null default 0,
  asset_use_count int not null default 0,
  last_active_at timestamptz,
  primary key (user_id, stat_date)
);

alter table public.user_activity_stats enable row level security;

create policy "stats_view_own_or_manager"
on public.user_activity_stats for select to authenticated
using (public.can_view_user(user_id));

-- profiles 新增字段
alter table public.profiles
  add column if not exists is_active boolean not null default true;
alter table public.profiles
  add column if not exists last_login_at timestamptz;

-- 同步 role 约束（确保 agent 可用）
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check check (role in ('admin', 'member', 'agent'));

-- 统计更新函数：记录活跃操作
create or replace function public.track_user_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_activity_stats (user_id, stat_date, last_active_at)
  values (coalesce(new.user_id, auth.uid()), current_date, now())
  on conflict (user_id, stat_date)
  do update set last_active_at = now();
  return new;
end;
$$;
