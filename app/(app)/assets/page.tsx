import { Images } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { attachAssetSignedUrls } from "@/lib/assets";
import { requireAuth } from "@/lib/auth";
import type { CampusAsset, SchoolRecord } from "@/lib/types";
import { AssetsOverview } from "./assets-overview";

type Assignment = {
  school_id: string;
  profiles: {
    full_name: string | null;
    email: string;
  } | null;
};

export default async function AssetsPage() {
  const { supabase, profile } = await requireAuth();
  const [{ data: schools }, { data: assets }, { data: assignments }] = await Promise.all([
    supabase
      .from("schools")
      .select("*")
      .order("created_at", { ascending: false })
      .returns<SchoolRecord[]>(),
    supabase
      .from("campus_assets")
      .select("*,schools(name,campus_name,city),profiles!uploader_id(full_name,email)")
      .order("created_at", { ascending: false })
      .limit(1000)
      .returns<CampusAsset[]>(),
    supabase
      .from("school_assignments")
      .select("school_id,profiles!user_id(full_name,email)")
      .returns<Assignment[]>()
  ]);

  const latestBySchool = new Map<string, CampusAsset>();
  for (const asset of assets ?? []) {
    if (!latestBySchool.has(asset.school_id)) {
      latestBySchool.set(asset.school_id, asset);
    }
  }
  const previews = await attachAssetSignedUrls(Array.from(latestBySchool.values()));
  const previewBySchool = new Map(
    previews.map((asset) => [asset.school_id, asset.signed_url ?? null])
  );
  const ownerBySchool = new Map(
    (assignments ?? []).map((assignment) => [
      assignment.school_id,
      assignment.profiles?.full_name || assignment.profiles?.email || "未分配"
    ])
  );

  const summaries = (schools ?? []).map((school) => {
    const schoolAssets = (assets ?? []).filter((asset) => asset.school_id === school.id);
    return {
      school,
      total: schoolAssets.length,
      images: schoolAssets.filter((asset) => asset.file_type === "图片").length,
      videos: schoolAssets.filter((asset) => asset.file_type === "视频").length,
      latestAt: schoolAssets[0]?.created_at ?? null,
      owner: ownerBySchool.get(school.id) ?? "未分配",
      previewUrl: previewBySchool.get(school.id) ?? null,
      previewType: schoolAssets[0]?.file_type ?? null
    };
  });

  return (
    <>
      <PageHeader
        title="校园素材资源库"
        description={
          profile.role === "admin"
            ? "查看全部学校素材，完成审核、分类和内容调用管理。"
            : "管理自己负责学校的照片、视频、截图和商家素材。"
        }
      />

      {(schools ?? []).length ? (
        <AssetsOverview
          role={profile.role}
          schools={schools ?? []}
          summaries={summaries}
        />
      ) : (
        <EmptyState
          icon={Images}
          title="暂无可用学校"
          description="管理员需要先创建学校并分配负责人，才能上传和管理素材。"
        />
      )}
    </>
  );
}

