import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { CampusAsset } from "@/lib/types";

const SIGNED_URL_TTL_SECONDS = 60 * 60;

export async function attachAssetSignedUrls<T extends CampusAsset>(assets: T[]) {
  if (!assets.length) {
    return assets;
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.storage
    .from("campus-assets")
    .createSignedUrls(
      assets.map((asset) => asset.storage_path),
      SIGNED_URL_TTL_SECONDS
    );

  if (error || !data) {
    return assets.map((asset) => ({ ...asset, signed_url: null }));
  }

  const signedByPath = new Map(
    data.map((item) => [item.path, item.signedUrl ?? null])
  );

  return assets.map((asset) => ({
    ...asset,
    signed_url: signedByPath.get(asset.storage_path) ?? null
  }));
}

export function formatAssetDuration(durationSeconds: number | null) {
  if (durationSeconds === null) {
    return "";
  }

  const minutes = Math.floor(durationSeconds / 60);
  const seconds = durationSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

