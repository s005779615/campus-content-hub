begin;

create table if not exists public.campus_assets (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  uploader_id uuid not null references public.profiles(id) on delete cascade,
  file_url text not null,
  storage_path text not null unique,
  file_type text not null,
  mime_type text not null,
  file_name text not null,
  file_size bigint not null default 0,
  duration_seconds integer,
  category text not null default '其他',
  tags text[] not null default '{}',
  location text,
  usage_scene text[] not null default '{}',
  status text not null default '待审核',
  remark text,
  can_generate boolean not null default true,
  requires_review boolean not null default true,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.campus_assets drop constraint if exists campus_assets_file_type_check;
alter table public.campus_assets
  add constraint campus_assets_file_type_check check (file_type in ('图片', '视频'));
alter table public.campus_assets drop constraint if exists campus_assets_category_check;
alter table public.campus_assets
  add constraint campus_assets_category_check check (
    category in (
      '校门', '宿舍', '食堂', '教学楼', '操场', '校园风景', '周边商圈',
      '商家素材', '视频素材', '账号截图', '咨询截图', '成交截图', '其他'
    )
  );
alter table public.campus_assets drop constraint if exists campus_assets_status_check;
alter table public.campus_assets
  add constraint campus_assets_status_check
  check (status in ('待审核', '已通过', '已驳回', '已归档'));
alter table public.campus_assets drop constraint if exists campus_assets_file_size_check;
alter table public.campus_assets
  add constraint campus_assets_file_size_check check (file_size >= 0);
alter table public.campus_assets drop constraint if exists campus_assets_duration_check;
alter table public.campus_assets
  add constraint campus_assets_duration_check
  check (duration_seconds is null or duration_seconds >= 0);

create table if not exists public.content_asset_links (
  content_id uuid not null references public.content_records(id) on delete cascade,
  asset_id uuid not null references public.campus_assets(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (content_id, asset_id)
);

create index if not exists idx_campus_assets_school on public.campus_assets(school_id);
create index if not exists idx_campus_assets_uploader on public.campus_assets(uploader_id);
create index if not exists idx_campus_assets_status on public.campus_assets(status);
create index if not exists idx_campus_assets_category on public.campus_assets(category);
create index if not exists idx_campus_assets_created on public.campus_assets(created_at desc);
create index if not exists idx_campus_assets_tags on public.campus_assets using gin(tags);
create index if not exists idx_campus_assets_usage on public.campus_assets using gin(usage_scene);
create index if not exists idx_content_asset_links_asset on public.content_asset_links(asset_id);

alter table public.campus_assets enable row level security;
alter table public.content_asset_links enable row level security;

drop policy if exists "campus_assets_select_visible" on public.campus_assets;
create policy "campus_assets_select_visible"
on public.campus_assets for select to authenticated
using (
  public.is_admin()
  or exists (
    select 1 from public.school_assignments sa
    where sa.school_id = campus_assets.school_id
      and sa.user_id = auth.uid()
  )
);

drop policy if exists "campus_assets_insert_visible" on public.campus_assets;
create policy "campus_assets_insert_visible"
on public.campus_assets for insert to authenticated
with check (
  uploader_id = auth.uid()
  and (
    public.is_admin()
    or exists (
      select 1 from public.school_assignments sa
      where sa.school_id = campus_assets.school_id
        and sa.user_id = auth.uid()
    )
  )
);

drop policy if exists "campus_assets_update_admin" on public.campus_assets;
create policy "campus_assets_update_admin"
on public.campus_assets for update to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "campus_assets_delete_admin_or_owner" on public.campus_assets;
create policy "campus_assets_delete_admin_or_owner"
on public.campus_assets for delete to authenticated
using (public.is_admin() or uploader_id = auth.uid());

drop policy if exists "content_asset_links_select_visible" on public.content_asset_links;
create policy "content_asset_links_select_visible"
on public.content_asset_links for select to authenticated
using (
  exists (
    select 1 from public.content_records cr
    where cr.id = content_asset_links.content_id
      and public.can_view_user(cr.user_id)
  )
);

drop policy if exists "content_asset_links_insert_owner" on public.content_asset_links;
create policy "content_asset_links_insert_owner"
on public.content_asset_links for insert to authenticated
with check (
  exists (
    select 1 from public.content_records cr
    where cr.id = content_asset_links.content_id
      and (public.is_admin() or cr.user_id = auth.uid())
  )
  and exists (
    select 1 from public.campus_assets ca
    where ca.id = content_asset_links.asset_id
      and ca.status = '已通过'
      and ca.can_generate
  )
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'campus-assets',
  'campus-assets',
  false,
  209715200,
  array['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime']
)
on conflict (id) do update
set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

commit;
