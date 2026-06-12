import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { taskStatuses } from "@/lib/constants";
import type { TaskRecord, TaskStatus } from "@/lib/types";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await getAuthContext();
    const { id } = await params;

    if (!context) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as {
      completedCount?: number;
      isDone?: boolean;
      status?: TaskStatus;
      reviewNotes?: string;
    };

    const { data: currentTask, error: currentError } = await context.supabase
      .from("publish_tasks")
      .select("*")
      .eq("id", id)
      .single<TaskRecord>();

    if (currentError || !currentTask) {
      return NextResponse.json({ error: "任务不存在或无权访问。" }, { status: 404 });
    }

    if (body.status && !(taskStatuses as readonly string[]).includes(body.status)) {
      return NextResponse.json({ error: "无效的任务状态。" }, { status: 400 });
    }

    if (
      context.profile.role !== "admin" &&
      (body.status === "已复盘" || body.reviewNotes !== undefined)
    ) {
      return NextResponse.json({ error: "仅管理员可以完成复盘。" }, { status: 403 });
    }

    const status = body.status ?? currentTask.status;
    const completed =
      status === "已回填" || status === "已复盘"
        ? currentTask.required_count
        : body.completedCount ?? currentTask.completed_count;

    const { data, error } = await context.supabase
      .from("publish_tasks")
      .update({
        completed_count: completed,
        is_done: status === "已回填" || status === "已复盘",
        status,
        review_notes:
          body.reviewNotes === undefined ? currentTask.review_notes : body.reviewNotes || null,
        reviewed_at: status === "已复盘" ? new Date().toISOString() : currentTask.reviewed_at,
        updated_at: new Date().toISOString()
      })
      .eq("id", id)
      .select(
        "*,schools(name,campus_name),profiles(full_name,email),platform_accounts(account_name,account_positioning,platform)"
      )
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (status !== currentTask.status) {
      await context.supabase.from("task_events").insert({
        task_id: id,
        actor_id: context.user.id,
        from_status: currentTask.status,
        to_status: status,
        note: body.reviewNotes || null
      });
    }

    return NextResponse.json({ task: data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
