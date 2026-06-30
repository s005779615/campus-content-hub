import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";

export async function POST(request: Request) {
  const context = await getAuthContext();
  if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json()) as {
    schoolId: string;
    strategy: any;
  };

  if (!body.schoolId || !body.strategy) {
    return NextResponse.json({ error: "缺少策略数据。" }, { status: 400 });
  }

  const { data, error } = await context.supabase
    .from("operations_workflow_results")
    .insert({
      user_id: context.user.id,
      school_id: body.schoolId,
      step: "strategy",
      payload: body.strategy,
      cycle_start_date: body.strategy?.cycle?.startDate ?? null,
      cycle_end_date: body.strategy?.cycle?.endDate ?? null
    })
    .select("id,created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, resultId: data.id });
}
