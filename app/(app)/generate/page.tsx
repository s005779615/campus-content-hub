import { WandSparkles } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { attachAssetSignedUrls } from "@/lib/assets";
import { requireAuth } from "@/lib/auth";
import { getAiProviderStatus } from "@/lib/content-generator";
import type { CampusAsset, SchoolRecord, TaskRecord } from "@/lib/types";
import { GenerateClient } from "./generate-client";

export default async function GeneratePage({
  searchParams
}: {
  searchParams: Promise<{ taskId?: string }>;
}) {
  const { supabase } = await requireAuth();
  const { taskId } = await searchParams;
  const aiStatus = getAiProviderStatus();
  const [{ data: schools }, { data: task }, { data: assets }] = await Promise.all([
    supabase
      .from("schools")
      .select("*")
      .order("created_at", { ascending: false })
      .returns<SchoolRecord[]>(),
    taskId
      ? supabase
          .from("publish_tasks")
          .select("*")
          .eq("id", taskId)
          .single<TaskRecord>()
      : Promise.resolve({ data: null as TaskRecord | null }),
    supabase
      .from("campus_assets")
      .select("*,schools(name,campus_name,city),profiles!user_id(full_name,email)")
      .eq("status", "已通过")
      .eq("can_generate", true)
      .order("created_at", { ascending: false })
      .limit(300)
      .returns<CampusAsset[]>()
  ]);
  const signedAssets = await attachAssetSignedUrls(assets ?? []);

  return (
    <>
      <PageHeader
        title="内容生成"
        description="选择学校资料和平台，一键生成适合发布的校园生活攻略内容。生成后会自动做风险词检查。"
      />

      {(schools ?? []).length ? (
        <GenerateClient
          aiStatus={aiStatus}
          assets={signedAssets}
          schools={schools ?? []}
          initialTask={task ?? null}
        />
      ) : (
        <EmptyState
          icon={WandSparkles}
          title="暂无可用学校"
          description="管理员需要先创建学校并分配给成员，才能生成内容。"
        />
      )}
    </>
  );
}
