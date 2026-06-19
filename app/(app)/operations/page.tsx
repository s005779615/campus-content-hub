import { PageHeader } from "@/components/page-header";
import { requireAuth } from "@/lib/auth";
import { OperationsClient } from "@/components/operations-client";

export default async function OperationsPage() {
  const { supabase, profile } = await requireAuth();

  const [{ data: schools }, { data: plans }] = await Promise.all([
    supabase.from("schools").select("*").order("name"),
    supabase
      .from("operations_plans")
      .select("id, school_id, school_level, investment_level, created_at, schools(name, campus_name)")
      .order("created_at", { ascending: false })
      .limit(30),
  ]);

  return (
    <>
      <PageHeader
        title="账号运营"
        description="校区数据录入 → AI 诊断评级 → 15 天运营计划 → 团队任务分配"
      />
      <OperationsClient
        profile={profile}
        schools={schools ?? []}
        initialPlans={(plans ?? []) as any[]}
      />
    </>
  );
}
