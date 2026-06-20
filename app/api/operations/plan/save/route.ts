import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { plan, schoolId } = await request.json() as { plan: any; schoolId?: string };

  if (!plan) return NextResponse.json({ error: "缺少 plan" }, { status: 400 });

  const admin = createSupabaseAdminClient();
  await admin.from("operations_plans").insert({
    user_id: ctx.user.id,
    school_id: schoolId || null,
    plan_data: plan,
    school_level: plan.schoolLevel || "",
    investment_level: plan.investmentLevel || "",
  });

  return NextResponse.json({ ok: true });
}
