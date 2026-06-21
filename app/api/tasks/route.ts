import { NextResponse } from "next/server";
import { getAuthContext, isManager } from "@/lib/auth";
import { contentTypes, platforms } from "@/lib/constants";

export async function GET(request: Request) {
  try {
    const context = await getAuthContext();

    if (!context) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");
    let query = context.supabase
      .from("publish_tasks")
      .select(
        "*,schools(name,campus_name),profiles!user_id(full_name,email),platform_accounts(account_name,account_positioning,platform)"
      )
      .order("task_date", { ascending: false });

    if (date) {
      query = query.eq("task_date", date);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ tasks: data });
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

    if (!isManager(context.profile)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = (await request.json()) as {
      platformAccountId: string;
      taskDate: string;
      contentType: string;
      note?: string;
    };

    if (
      !body.platformAccountId ||
      !body.taskDate ||
      !(contentTypes as readonly string[]).includes(body.contentType)
    ) {
      return NextResponse.json({ error: "任务信息不完整。" }, { status: 400 });
    }

    const { data: account, error: accountError } = await context.supabase
      .from("platform_accounts")
      .select("id,user_id,school_id,platform")
      .eq("id", body.platformAccountId)
      .eq("status", "启用")
      .single();

    if (accountError || !account || !(platforms as readonly string[]).includes(account.platform)) {
      return NextResponse.json({ error: "账号不存在或当前不可用。" }, { status: 400 });
    }

    const { data, error } = await context.supabase
      .from("publish_tasks")
      .insert({
        user_id: account.user_id,
        school_id: account.school_id,
        task_date: body.taskDate,
        required_count: 1,
        platform: account.platform,
        content_type: body.contentType,
        platform_account_id: account.id,
        status: "未开始",
        note: body.note || null,
        created_by: context.user.id
      })
      .select(
        "*,schools(name,campus_name),profiles!user_id(full_name,email),platform_accounts(account_name,account_positioning,platform)"
      )
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ task: data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const { error } = await ctx.supabase.from("publish_tasks").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}
