import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import type {
  CampusAsset,
  GeneratedOutput,
  Platform,
  RiskHit,
  TaskRecord
} from "@/lib/types";

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
      assetIds?: string[];
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
      if (context.profile.role !== "admin" && data.user_id !== context.user.id) {
        return NextResponse.json({ error: "只能为自己的任务保存内容。" }, { status: 403 });
      }
      task = data;
    }

    const targetSchoolId = task?.school_id ?? body.schoolId;
    const assetIds = Array.from(new Set(body.assetIds ?? [])).slice(0, 8);
    if (assetIds.length) {
      const { data: assets, error: assetError } = await context.supabase
        .from("campus_assets")
        .select("*")
        .in("id", assetIds)
        .eq("school_id", targetSchoolId)
        .eq("status", "已通过")
        .eq("can_generate", true)
        .returns<CampusAsset[]>();

      if (assetError || (assets ?? []).length !== assetIds.length) {
        return NextResponse.json(
          { error: "部分素材不可用、未通过审核或不属于当前学校。" },
          { status: 400 }
        );
      }
    }

    const { data, error } = await context.supabase
      .from("content_records")
      .insert({
        user_id: task?.user_id ?? context.user.id,
        school_id: targetSchoolId,
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

    if (assetIds.length) {
      const { error: linkError } = await context.supabase
        .from("content_asset_links")
        .insert(
          assetIds.map((assetId) => ({
            content_id: data.id,
            asset_id: assetId
          }))
        );

      if (linkError) {
        return NextResponse.json({ error: linkError.message }, { status: 400 });
      }
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
