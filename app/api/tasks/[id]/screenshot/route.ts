import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import type { TaskRecord } from "@/lib/types";

const maxFileSize = 5 * 1024 * 1024;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const context = await getAuthContext();
  const { id } = await params;

  if (!context) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await request.formData();
  const file = form.get("file");

  if (!(file instanceof File) || !file.type.startsWith("image/")) {
    return NextResponse.json({ error: "请选择图片格式的发布截图。" }, { status: 400 });
  }

  if (file.size > maxFileSize) {
    return NextResponse.json({ error: "截图不能超过 5MB。" }, { status: 400 });
  }

  const { data: task, error: taskError } = await context.supabase
    .from("publish_tasks")
    .select("*")
    .eq("id", id)
    .single<TaskRecord>();

  if (taskError || !task) {
    return NextResponse.json({ error: "任务不存在或无权访问。" }, { status: 404 });
  }

  const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${context.user.id}/${id}-${Date.now()}.${extension}`;
  const { error: uploadError } = await context.supabase.storage
    .from("task-screenshots")
    .upload(path, file, { contentType: file.type, upsert: false });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 400 });
  }

  const {
    data: { publicUrl }
  } = context.supabase.storage.from("task-screenshots").getPublicUrl(path);

  const { data: updated, error: updateError } = await context.supabase
    .from("publish_tasks")
    .update({
      publish_screenshot_url: publicUrl,
      status: "已发布",
      updated_at: new Date().toISOString()
    })
    .eq("id", id)
    .select(
      "*,schools(name,campus_name),profiles(full_name,email),platform_accounts(account_name,account_positioning,platform)"
    )
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 400 });
  }

  await context.supabase.from("task_events").insert({
    task_id: id,
    actor_id: context.user.id,
    from_status: task.status,
    to_status: "已发布",
    note: "已上传发布截图"
  });

  return NextResponse.json({ task: updated });
}
