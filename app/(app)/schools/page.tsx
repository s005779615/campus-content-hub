import { Building2 } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { requireAuth } from "@/lib/auth";
import type { SchoolRecord } from "@/lib/types";
import { SchoolManager } from "./school-manager";

export default async function SchoolsPage() {
  const { supabase, profile } = await requireAuth();
  const { data: schools } = await supabase
    .from("schools")
    .select("*")
    .order("created_at", { ascending: false })
    .returns<SchoolRecord[]>();

  return (
    <>
      <PageHeader
        title="学校管理"
        description={
          profile.role === "admin"
            ? "维护每所学校的真实资料，队员生成内容时会自动引用这些信息。"
            : "填写和维护自己负责校区的真实资料，保存后内容生成会自动引用最新信息。"
        }
      />

      {(schools ?? []).length || profile.role === "admin" ? (
        <SchoolManager schools={schools ?? []} role={profile.role} />
      ) : (
        <EmptyState
          icon={Building2}
          title="暂未分配学校"
          description="请联系管理员把你负责的学校分配到账号下。"
        />
      )}
    </>
  );
}
