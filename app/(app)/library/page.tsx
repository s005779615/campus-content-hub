import { FileText } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { requireAuth } from "@/lib/auth";
import type { ContentRecord } from "@/lib/types";
import { ContentLibrary } from "./content-library";

export default async function LibraryPage({
  searchParams
}: {
  searchParams: Promise<{ taskId?: string }>;
}) {
  const { supabase, profile } = await requireAuth();
  const { taskId } = await searchParams;
  let query = supabase
    .from("content_records")
    .select("*,schools(name,campus_name,city),profiles(full_name,email),publication_records(*)")
    .order("created_at", { ascending: false });

  if (taskId) {
    query = query.eq("task_id", taskId);
  }

  const { data: contents } = await query.returns<ContentRecord[]>();

  return (
    <>
      <PageHeader
        title="内容库"
        description={
          profile.role === "admin"
            ? "查看全部队员保存的内容，并检查发布回填情况。"
            : "管理自己保存的内容，复制发布后回填链接和数据。"
        }
      />

      {(contents ?? []).length ? (
        <ContentLibrary contents={contents ?? []} activeTaskId={taskId} />
      ) : (
        <EmptyState
          icon={FileText}
          title="暂无保存内容"
          description="先到内容生成页生成并保存一条内容。"
        />
      )}
    </>
  );
}
