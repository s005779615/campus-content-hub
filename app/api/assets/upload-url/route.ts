import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const allowedMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "video/mp4",
  "video/quicktime"
]);
const maxFileSize = 200 * 1024 * 1024;

function extensionFor(fileName: string, mimeType: string) {
  const requested = fileName.split(".").pop()?.toLowerCase();
  const allowed = new Set(["jpg", "jpeg", "png", "webp", "mp4", "mov"]);

  if (requested && allowed.has(requested)) {
    return requested;
  }

  return mimeType === "video/quicktime"
    ? "mov"
    : mimeType === "video/mp4"
      ? "mp4"
      : mimeType === "image/png"
        ? "png"
        : mimeType === "image/webp"
          ? "webp"
          : "jpg";
}

export async function POST(request: Request) {
  try {
    const context = await getAuthContext();

    if (!context) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as {
      schoolId?: string;
      fileName?: string;
      mimeType?: string;
      fileSize?: number;
    };

    if (
      !body.schoolId ||
      !body.fileName ||
      !body.mimeType ||
      !allowedMimeTypes.has(body.mimeType) ||
      !Number.isFinite(body.fileSize) ||
      Number(body.fileSize) <= 0 ||
      Number(body.fileSize) > maxFileSize
    ) {
      return NextResponse.json(
        { error: "文件格式不支持，或文件超过 200MB。" },
        { status: 400 }
      );
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

    const extension = extensionFor(body.fileName, body.mimeType);
    const storagePath = `${context.user.id}/${body.schoolId}/${randomUUID()}.${extension}`;
    const admin = createSupabaseAdminClient();
    const { data, error } = await admin.storage
      .from("campus-assets")
      .createSignedUploadUrl(storagePath);

    if (error || !data) {
      return NextResponse.json(
        { error: error?.message ?? "无法创建上传地址。" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      path: data.path ?? storagePath,
      token: data.token
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

