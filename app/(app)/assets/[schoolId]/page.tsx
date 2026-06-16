import { notFound } from "next/navigation";
import { attachAssetSignedUrls } from "@/lib/assets";
import { requireAuth } from "@/lib/auth";
import type { CampusAsset, SchoolRecord } from "@/lib/types";
import { SchoolAssetsClient } from "./school-assets-client";

export default async function SchoolAssetsPage({
  params
}: {
  params: Promise<{ schoolId: string }>;
}) {
  const { schoolId } = await params;
  const { supabase, profile, user } = await requireAuth();
  const [{ data: school }, { data: assets }] = await Promise.all([
    supabase
      .from("schools")
      .select("*")
      .eq("id", schoolId)
      .single<SchoolRecord>(),
    supabase
      .from("campus_assets")
      .select("*,schools(name,campus_name,city),profiles!uploader_id(full_name,email)")
      .eq("school_id", schoolId)
      .order("created_at", { ascending: false })
      .limit(500)
      .returns<CampusAsset[]>()
  ]);

  if (!school) {
    notFound();
  }

  const signedAssets = await attachAssetSignedUrls(assets ?? []);

  return (
    <SchoolAssetsClient
      assets={signedAssets}
      currentUserId={user.id}
      role={profile.role}
      school={school}
    />
  );
}

