import { NextResponse } from "next/server";
import { getAuthContext, isManager } from "@/lib/auth";
import { runOperationsJson } from "@/lib/operations-ai";
import { campusAccountPositionerPrompt } from "@/prompts/campusAccountPositioner";

type PositioningResult = {
  accounts?: Array<{
    accountId: string;
    platform: string;
    accountName: string;
    owner: string;
    accountPersona: string;
    targetStudents: string;
    mainGoal: string;
    secondaryGoal: string;
    contentDirections: string[];
    recommendedFormats: string[];
    publishFrequency: string;
    publishTimeSlots: string[];
    trafficPath: string;
    differentiation: string;
    positioningReason: string;
  }>;
  matrixSummary?: string;
};

const accountSelect = `
  id,school_id,user_id,platform,account_name,account_id,account_link,account_positioning,
  daily_publish_target,status,positioning_profile,positioning_status,positioning_generated_at,
  positioning_confirmed_at,schools(*),profiles!user_id(full_name,email,role)
`;

export async function GET(request: Request) {
  const context = await getAuthContext();
  if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const schoolId = searchParams.get("schoolId");
  if (!schoolId) return NextResponse.json({ error: "Missing schoolId" }, { status: 400 });

  const { data, error } = await context.supabase
    .from("platform_accounts")
    .select(accountSelect)
    .eq("school_id", schoolId)
    .eq("status", "启用")
    .order("platform")
    .order("account_name");

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ accounts: data ?? [] });
}

export async function POST(request: Request) {
  const context = await getAuthContext();
  if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json()) as {
    schoolId: string;
    accountId?: string;
    mode?: "single" | "matrix";
  };

  if (!body.schoolId) return NextResponse.json({ error: "Missing schoolId" }, { status: 400 });

  let query = context.supabase
    .from("platform_accounts")
    .select(accountSelect)
    .eq("school_id", body.schoolId)
    .eq("status", "启用");

  if (body.accountId) query = query.eq("id", body.accountId);

  const { data: accounts, error } = await query.order("platform").order("account_name");
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (!accounts?.length) return NextResponse.json({ error: "该校区暂无启用账号。" }, { status: 400 });

  const school = Array.isArray(accounts[0].schools) ? accounts[0].schools[0] : accounts[0].schools;
  const prompt = campusAccountPositionerPrompt({
    school: school ?? {},
    accounts: accounts as any,
    mode: body.accountId ? "single" : body.mode ?? "matrix"
  });
  const result = await runOperationsJson<PositioningResult>(prompt, "账号定位");
  const generatedAt = new Date().toISOString();

  for (const item of result.accounts ?? []) {
    if (!item.accountId) continue;
    await context.supabase
      .from("platform_accounts")
      .update({
        positioning_profile: item,
        positioning_status: "已生成",
        positioning_generated_at: generatedAt,
        updated_at: generatedAt
      })
      .eq("id", item.accountId)
      .eq("school_id", body.schoolId);
  }

  await context.supabase.from("operations_workflow_results").insert({
    user_id: context.user.id,
    school_id: body.schoolId,
    step: "account_positioning",
    payload: result
  });

  return NextResponse.json({ positioning: result });
}

export async function PATCH(request: Request) {
  const context = await getAuthContext();
  if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isManager(context.profile)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = (await request.json()) as {
    schoolId: string;
    positions: Array<{ accountId: string; profile: Record<string, unknown> }>;
  };

  if (!body.schoolId || !body.positions?.length) {
    return NextResponse.json({ error: "定位数据为空。" }, { status: 400 });
  }

  const confirmedAt = new Date().toISOString();
  for (const item of body.positions) {
    await context.supabase
      .from("platform_accounts")
      .update({
        positioning_profile: item.profile,
        positioning_status: "已确认",
        positioning_confirmed_at: confirmedAt,
        updated_at: confirmedAt
      })
      .eq("id", item.accountId)
      .eq("school_id", body.schoolId);
  }

  await context.supabase.from("operations_workflow_results").insert({
    user_id: context.user.id,
    school_id: body.schoolId,
    step: "account_positioning",
    payload: { confirmedAt, positions: body.positions }
  });

  return NextResponse.json({ ok: true, confirmedAt });
}
