import { PageHeader } from "@/components/page-header";
import { requireAuth } from "@/lib/auth";
import { OperationsClient } from "@/components/operations-client";
import type { PlatformAccount } from "@/lib/types";

export default async function OperationsPage() {
  const { supabase, profile } = await requireAuth();

  const [{ data: schools }, { data: plans }, { data: accounts }] = await Promise.all([
    supabase.from("schools").select("*").order("name"),
    supabase
      .from("operations_plans")
      .select("id, school_id, school_level, investment_level, created_at, schools(name, campus_name)")
      .order("created_at", { ascending: false })
      .limit(30),
    supabase
      .from("platform_accounts")
      .select(
        "id, school_id, user_id, platform, account_name, account_id, account_link, account_positioning, daily_publish_target, status, positioning_profile, positioning_status, positioning_generated_at, positioning_confirmed_at, schools(name,campus_name,city), profiles!user_id(full_name,email,role)"
      )
      .is("deleted_at", null)
      .not("status", "in", "(暂停,异常)")
      .order("account_name")
      .returns<PlatformAccount[]>(),
  ]);

  return (
    <>
      <PageHeader
        title="账号运营"
        description="账号定位 → 数据诊断 → 7天运营策略 → 内容与任务"
      />
      <OperationsClient
        profile={profile}
        schools={schools ?? []}
        initialPlans={(plans ?? []) as any[]}
        platformAccounts={accounts ?? []}
      />
    </>
  );
}
