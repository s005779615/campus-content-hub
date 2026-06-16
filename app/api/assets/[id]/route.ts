import { NextResponse } from "next/server";
import { assetCategories, assetStatuses, contentTypes } from "@/lib/constants";
import { getAuthContext } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { AssetCategory, AssetStatus, CampusAsset } from "@/lib/types";

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

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await getAuthContext();

    if (!context) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (context.profile.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = (await request.json()) as {
      category?: AssetCategory;
      tags?: string[];
      location?: string;
      usageScene?: string[];
      status?: AssetStatus;
      remark?: string;
      canGenerate?: boolean;
      rejectionReason?: string;
    };
    const validCategories = assetCategories as readonly string[];
    const validStatuses = assetStatuses as readonly string[];
    const validUsageScenes = contentTypes as readonly string[];

    if (
      (body.category && !validCategories.includes(body.category)) ||
      (body.status && !validStatuses.includes(body.status))
    ) {
      return NextResponse.json({ error: "分类或状态不合法。" }, { status: 400 });
    }

    const update: Record<string, unknown> = {
      updated_at: new Date().toISOString()
    };

    if (body.category) update.category = body.category;
    if (body.tags) update.tags = cleanList(body.tags).slice(0, 20);
    if (body.usageScene) {
      update.usage_scene = cleanList(body.usageScene).filter((item) =>
        validUsageScenes.includes(item)
      );
    }
    if (typeof body.location === "string") update.location = body.location.trim() || null;
    if (typeof body.remark === "string") update.remark = body.remark.trim() || null;
    if (typeof body.canGenerate === "boolean") update.can_generate = body.canGenerate;
    if (typeof body.rejectionReason === "string") {
      update.rejection_reason = body.rejectionReason.trim() || null;
    }
    if (body.status) {
      update.status = body.status;
      update.reviewed_by = context.user.id;
      update.reviewed_at = new Date().toISOString();
      if (body.status !== "已驳回") {
        update.rejection_reason = null;
      }
    }

    const { data, error } = await context.supabase
      .from("campus_assets")
      .update(update)
      .eq("id", id)
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

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await getAuthContext();

    if (!context) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { data: asset, error: assetError } = await context.supabase
      .from("campus_assets")
      .select("*")
      .eq("id", id)
      .single<CampusAsset>();

    if (assetError || !asset) {
      return NextResponse.json({ error: "素材不存在或无权访问。" }, { status: 404 });
    }

    if (context.profile.role !== "admin" && asset.uploader_id !== context.user.id) {
      return NextResponse.json({ error: "不能删除别人上传的素材。" }, { status: 403 });
    }

    const admin = createSupabaseAdminClient();
    const { count: linkCount, error: linkError } = await admin
      .from("content_asset_links")
      .select("*", { count: "exact", head: true })
      .eq("asset_id", asset.id);

    if (linkError) {
      return NextResponse.json({ error: linkError.message }, { status: 400 });
    }

    if ((linkCount ?? 0) > 0) {
      return NextResponse.json(
        { error: "该素材已被内容使用，不能删除。管理员可将其设为“已归档”。" },
        { status: 409 }
      );
    }

    const { error: storageError } = await admin.storage
      .from("campus-assets")
      .remove([asset.storage_path]);

    if (storageError) {
      return NextResponse.json({ error: storageError.message }, { status: 400 });
    }

    const { error: deleteError } = await context.supabase
      .from("campus_assets")
      .delete()
      .eq("id", id);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
