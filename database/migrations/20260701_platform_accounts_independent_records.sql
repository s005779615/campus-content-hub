begin;

alter table public.platform_accounts
  drop constraint if exists platform_accounts_user_id_school_id_platform_key;

drop index if exists platform_accounts_user_id_school_id_platform_key;

alter table public.platform_accounts
  add column if not exists deleted_at timestamptz,
  add column if not exists positioning_profile jsonb not null default '{}'::jsonb,
  add column if not exists positioning_status text not null default '未确认',
  add column if not exists positioning_generated_at timestamptz,
  add column if not exists positioning_confirmed_at timestamptz;

update public.platform_accounts
set account_password = null
where account_password is not null;

alter table public.platform_accounts
  drop constraint if exists platform_accounts_status_check;

update public.platform_accounts
set status = case
  when status = '启用' then '运营中'
  when status is null then '待定位'
  else status
end;

alter table public.platform_accounts
  alter column account_positioning set default '待AI定位',
  alter column status set default '待定位';

alter table public.platform_accounts
  drop constraint if exists platform_accounts_account_positioning_check;

alter table public.platform_accounts
  add constraint platform_accounts_account_positioning_check
  check (
    account_positioning in (
      '待AI定位',
      '新生攻略号',
      '校园生活号',
      '校园实拍号',
      '学长学姐号',
      '新生答疑号',
      '社群承接号',
      '转化承接号',
      '其他',
      '学长号',
      '校园墙'
    )
  );

alter table public.platform_accounts
  add constraint platform_accounts_status_check
  check (status in ('待定位', '待启动', '运营中', '暂停', '异常'));

alter table public.platform_accounts
  drop constraint if exists platform_accounts_positioning_status_check;

alter table public.platform_accounts
  add constraint platform_accounts_positioning_status_check
  check (positioning_status in ('未确认', '已生成', '已确认'));

do $$
begin
  if not exists (
    select 1
    from public.platform_accounts
    where account_id is not null
      and btrim(account_id) <> ''
      and deleted_at is null
    group by platform, account_id
    having count(*) > 1
  ) then
    create unique index if not exists idx_platform_accounts_platform_account_id_active
      on public.platform_accounts(platform, account_id)
      where account_id is not null
        and btrim(account_id) <> ''
        and deleted_at is null;
  else
    raise notice 'Skipped unique platform/account_id index because duplicates already exist.';
  end if;
end $$;

create index if not exists idx_platform_accounts_active_school_status
  on public.platform_accounts(school_id, status)
  where deleted_at is null;

create index if not exists idx_platform_accounts_active_user
  on public.platform_accounts(user_id)
  where deleted_at is null;

commit;
