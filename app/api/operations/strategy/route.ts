import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { runOperationsJson } from "@/lib/operations-ai";
import { campusGrowthPlannerPrompt } from "@/prompts/campusGrowthPlanner";

export async function POST(request: Request) {
  const context = await getAuthContext();
  if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json()) as {
    schoolId: string;
    school: {
      name?: string;
      campusName?: string;
      totalStudents?: number;
      newStudents?: number;
      semesterStart?: string;
    };
    mode?: "generate" | "adjust" | "next";
    socialStats?: unknown[];
    historicalDirections?: string[];
    executedThemes?: string[];
    previousStrategy?: unknown;
    diagnosis?: unknown;
  };

  if (!body.schoolId) return NextResponse.json({ error: "Missing schoolId" }, { status: 400 });

  const { data: accounts, error } = await context.supabase
    .from("platform_accounts")
    .select("id,platform,account_name,user_id,account_positioning,daily_publish_target,positioning_profile,positioning_status,profiles!user_id(full_name,email)")
    .eq("school_id", body.schoolId)
    .is("deleted_at", null)
    .not("status", "in", "(暂停,异常)")
    .eq("positioning_status", "已确认")
    .order("platform")
    .order("account_name");

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (!accounts?.length) {
    return NextResponse.json({ error: "请先确认账号定位，策略必须读取已确认定位。" }, { status: 400 });
  }

  const { data: latestStrategy } = await context.supabase
    .from("operations_workflow_results")
    .select("payload,created_at")
    .eq("school_id", body.schoolId)
    .eq("step", "strategy")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const prompt = campusGrowthPlannerPrompt({
    school: body.school ?? {},
    currentDate: new Date().toISOString().slice(0, 10),
    confirmedPositionings: accounts,
    socialStats: body.socialStats as any[],
    historicalDirections: body.historicalDirections ?? [],
    executedThemes: body.executedThemes ?? [],
    previousStrategy: body.previousStrategy ?? latestStrategy?.payload ?? null,
    diagnosis: body.diagnosis ?? null,
    mode: body.mode ?? "generate"
  });
  const strategy = await runOperationsJson<any>(prompt, "7天运营策略");

  const { data: saved } = await context.supabase
    .from("operations_workflow_results")
    .insert({
      user_id: context.user.id,
      school_id: body.schoolId,
      step: "strategy",
      payload: strategy,
      cycle_start_date: strategy?.cycle?.startDate ?? null,
      cycle_end_date: strategy?.cycle?.endDate ?? null
    })
    .select("id,created_at")
    .single();

  return NextResponse.json({ strategy, resultId: saved?.id ?? null });
}
