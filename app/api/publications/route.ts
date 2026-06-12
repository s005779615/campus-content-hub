import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { numberOrZero } from "@/lib/format";
import type { ContentRecord, Platform } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const context = await getAuthContext();

    if (!context) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.formData();
    const contentId = String(body.get("contentId") ?? "");
    const publishedAt = String(body.get("publishedAt") ?? "");
    const publishUrl = String(body.get("publishUrl") ?? "");
    const notes = String(body.get("notes") ?? "");
    const taskId = String(body.get("taskId") ?? "");

    const { data: content, error: contentError } = await context.supabase
      .from("content_records")
      .select("*")
      .eq("id", contentId)
      .single<ContentRecord>();

    if (contentError || !content) {
      return NextResponse.json({ error: "Content not found" }, { status: 404 });
    }

    const { data, error } = await context.supabase
      .from("publication_records")
      .insert({
        content_id: content.id,
        user_id: content.user_id,
        school_id: content.school_id,
        platform: content.platform as Platform,
        task_id: taskId || content.task_id || null,
        screenshot_url: content.task_id ? null : String(body.get("screenshotUrl") ?? "") || null,
        published_at: publishedAt ? new Date(publishedAt).toISOString() : null,
        publish_url: publishUrl || null,
        views: numberOrZero(body.get("views")),
        likes: numberOrZero(body.get("likes")),
        favorites: numberOrZero(body.get("favorites")),
        comments: numberOrZero(body.get("comments")),
        private_messages: numberOrZero(body.get("privateMessages")),
        wechat_adds: numberOrZero(body.get("wechatAdds")),
        valid_inquiries: numberOrZero(body.get("validInquiries")),
        conversions: numberOrZero(body.get("conversions")),
        revenue: numberOrZero(body.get("revenue")),
        notes: notes || null
      })
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const linkedTaskId = taskId || content.task_id;
    await context.supabase
      .from("content_records")
      .update({ status: "已回填" })
      .eq("id", content.id);

    if (linkedTaskId) {
      const { data: task } = await context.supabase
        .from("publish_tasks")
        .select("status,required_count")
        .eq("id", linkedTaskId)
        .single();

      await context.supabase
        .from("publish_tasks")
        .update({
          status: "已回填",
          completed_count: task?.required_count ?? 1,
          is_done: true,
          updated_at: new Date().toISOString()
        })
        .eq("id", linkedTaskId);

      await context.supabase.from("task_events").insert({
        task_id: linkedTaskId,
        actor_id: context.user.id,
        from_status: task?.status ?? "已发布",
        to_status: "已回填",
        note: "发布数据已回填"
      });
    }

    return NextResponse.json({ publication: data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
