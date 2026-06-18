create table if not exists public.publish_metrics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  school_id uuid references public.schools(id) on delete set null,
  platform text not null check (platform in ('小红书', '抖音')),
  post_url text not null,
  post_title text,
  views int not null default 0,
  likes int not null default 0,
  favorites int not null default 0,
  comments int not null default 0,
  shares int not null default 0,
  collected_at date not null default current_date,
  created_at timestamptz not null default now()
);

alter table public.publish_metrics enable row level security;

create policy "metrics_view_own_or_manager"
on public.publish_metrics for select to authenticated
using (public.can_view_user(user_id));

create policy "metrics_insert_own"
on public.publish_metrics for insert to authenticated
with check (user_id = auth.uid());

create policy "metrics_update_own"
on public.publish_metrics for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "metrics_delete_own"
on public.publish_metrics for delete to authenticated
using (user_id = auth.uid());
