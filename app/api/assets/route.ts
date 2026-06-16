import { NextResponse } from "next/server";
import { assetCategories, contentTypes } from "@/lib/constants";
import { getAuthContext } from "@/lib/auth";
import type { AssetCategory } from "@/lib/types";

const allowedMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "video/mp4",
  "video/quicktime"
]);

function cleanList(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean)
    )
  );
}

export async function POST(request: Request) {
  try {
    const context = await getAuthContext();

    if (!context) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as {
      schoolId?: string;
      storagePath?: string;
      mimeType?: string;
      fileName?: string;
      fileSize?: number;
      durationSeconds?: number | null;
      category?: AssetCategory;
      tags?: string[];
      location?: string;
      usageScene?: string[];
      remark?: string;
      canGenerate?: boolean;
      requiresReview?: boolean;
    };
    const validCategories = assetCategories as readonly string[];
    const validUsageScenes = contentTypes as readonly string[];
    const tags = cleanList(body.tags).slice(0, 20);
    const usageScene = cleanList(body.usageScene).filter((item) =>
      validUsageScenes.includes(item)
    );
    const expectedPrefix = `${context.user.id}/${body.schoolId}/`;

    if (
      !body.schoolId ||
      !body.storagePath?.startsWith(expectedPrefix) ||
      !body.mimeType ||
      !allowedMimeTypes.has(body.mimeType) ||
      !body.fileName?.trim() ||
      !body.category ||
      !validCategories.includes(body.category) ||
      !Number.isFinite(body.fileSize) ||
      Number(body.fileSize) <= 0
    ) {
      return NextResponse.json({ error: "素材信息不完整或不合法。" }, { status: 400 });
    }

    const { data: school } = await context.supabase
      .from("schools")
      .select("id")
      .eq("id", body.schoolId)
      .single();

    if (!school) {
      return NextResponse.json(
        { error: "学校不存在或你没有访问权限。" },
        { status: 403 }
      );
    }

    const isAdmin = context.profile.role === "admin";
    const requiresReview = isAdmin ? body.requiresReview !== false : true;
    const status = requiresReview ? "待审核" : "已通过";
    const fileType = body.mimeType.startsWith("video/") ? "视频" : "图片";
    const { data, error } = await context.supabase
      .from("campus_assets")
      .insert({
        school_id: body.schoolId,
        uploader_id: context.user.id,
        file_url: body.storagePath,
        storage_path: body.storagePath,
        file_type: fileType,
        mime_type: body.mimeType,
        file_name: body.fileName.trim(),
        file_size: Number(body.fileSize),
        duration_seconds:
          fileType === "视频" && Number.isFinite(body.durationSeconds)
            ? Math.max(0, Math.round(Number(body.durationSeconds)))
            : null,
        category: body.category,
        tags,
        location: body.location?.trim() || null,
        usage_scene: usageScene,
        status,
        remark: body.remark?.trim() || null,
        can_generate: body.canGenerate !== false,
        requires_review: requiresReview,
        reviewed_by: status === "已通过" ? context.user.id : null,
        reviewed_at: status === "已通过" ? new Date().toISOString() : null
      })
      .select("*,schools(name,campus_name,city),profiles!uploader_id(full_name,email)")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ asset: data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

