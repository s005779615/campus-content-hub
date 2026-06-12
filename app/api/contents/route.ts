import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import type { GeneratedOutput, Platform, RiskHit, TaskRecord } from "@/lib/types";

export async function GET() {
  try {
    const context = await getAuthContext();

    if (!context) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await context.supabase
      .from("content_records")
      .select(
        "*,schools(name,campus_name,city),profiles(full_name,email),publication_records(*)"
      )
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ contents: data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const context = await getAuthContext();

    if (!context) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as {
      schoolId: string;
      platform: Platform;
      contentType: string;
      contentGoal: string;
      tone: string;
      output: GeneratedOutput;
      riskHits: RiskHit[];
      taskId?: string;
    };

    let task: TaskRecord | null = null;
    if (body.taskId) {
      const { data, error } = await context.supabase
        .from("publish_tasks")
        .select("*")
        .eq("id", body.taskId)
        .single();

      if (error || !data) {
        return NextResponse.json({ error: "任务不存在或无权访问。" }, { status: 404 });
      }
      task = data;
    }

    const { data, error } = await context.supabase
      .from("content_records")
      .insert({
        user_id: task?.user_id ?? context.user.id,
        school_id: task?.school_id ?? body.schoolId,
        platform: task?.platform ?? body.platform,
        content_type: task?.content_type ?? body.contentType,
        content_goal: body.contentGoal,
        tone: body.tone,
        output: body.output,
        risk_hits: body.riskHits ?? [],
        status: task ? "待发布" : "saved",
        task_id: task?.id ?? null
      })
      .select("*,schools(name,campus_name,city),profiles(full_name,email)")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (task) {
      const { error: taskError } = await context.supabase
        .from("publish_tasks")
        .update({
          content_id: data.id,
          status: "已生成",
          updated_at: new Date().toISOString()
        })
        .eq("id", task.id);

      if (taskError) {
        return NextResponse.json({ error: taskError.message }, { status: 400 });
      }

      await context.supabase.from("task_events").insert({
        task_id: task.id,
        actor_id: context.user.id,
        from_status: task.status,
        to_status: "已生成",
        note: "内容已生成并保存"
      });
    }

    return NextResponse.json({ content: data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
