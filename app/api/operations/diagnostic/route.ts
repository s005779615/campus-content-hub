import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { runOperationsJson } from "@/lib/operations-ai";
import { campusGrowthDiagnosticPrompt } from "@/prompts/campusGrowthDiagnostic";

export async function POST(request: Request) {
  const context = await getAuthContext();
  if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json()) as {
    schoolId: string;
    school: { name?: string; campusName?: string; semesterStart?: string };
    socialStats: unknown[];
  };

  if (!body.schoolId) return NextResponse.json({ error: "Missing schoolId" }, { status: 400 });

  const { data: accounts, error } = await context.supabase
    .from("platform_accounts")
    .select("id,platform,account_name,user_id,positioning_profile,positioning_status,positioning_confirmed_at,profiles!user_id(full_name,email)")
    .eq("school_id", body.schoolId)
    .eq("status", "启用")
    .eq("positioning_status", "已确认");

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (!accounts?.length) {
    return NextResponse.json({ error: "请先在第一步确认并保存账号定位。" }, { status: 400 });
  }

  const prompt = campusGrowthDiagnosticPrompt({
    school: body.school ?? {},
    confirmedPositionings: accounts,
    socialStats: body.socialStats as any[]
  });
  const diagnostic = await runOperationsJson(prompt, "账号诊断");

  const { data: saved } = await context.supabase
    .from("operations_workflow_results")
    .insert({
      user_id: context.user.id,
      school_id: body.schoolId,
      step: "diagnostic",
      payload: diagnostic
    })
    .select("id,created_at")
    .single();

  return NextResponse.json({ diagnostic, resultId: saved?.id ?? null });
}
