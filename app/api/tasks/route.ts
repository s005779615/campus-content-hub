import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";

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
      .select("*,schools(name,campus_name),profiles(full_name,email)")
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

    if (context.profile.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = (await request.json()) as {
      userId: string;
      schoolId?: string;
      taskDate: string;
      requiredCount: number;
      note?: string;
    };

    const { data, error } = await context.supabase
      .from("publish_tasks")
      .insert({
        user_id: body.userId,
        school_id: body.schoolId || null,
        task_date: body.taskDate,
        required_count: Number(body.requiredCount || 1),
        note: body.note || null,
        created_by: context.user.id
      })
      .select("*")
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
