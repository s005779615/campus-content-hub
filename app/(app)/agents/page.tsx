import { PageHeader } from "@/components/page-header";
import { requireAuth } from "@/lib/auth";
import { AgentsClient } from "./agents-client";

export default async function AgentsPage() {
  const { profile } = await requireAuth();
  const canManage = profile.role === "admin" || profile.role === "member";

  return (
    <>
      <PageHeader
        title="代理管理"
        description={
          canManage
            ? "创建和管理校区代理账号，查看代理发布数据统计。"
            : "查看你的代理信息。"
        }
      />
      <AgentsClient role={profile.role} userId={profile.id} />
    </>
  );
}
