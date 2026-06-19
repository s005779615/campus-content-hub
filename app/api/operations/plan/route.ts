import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { campusGrowthPlannerPrompt } from "@/prompts/campusGrowthPlanner";

export async function POST(request: Request) {
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json() as any;

  try {
    const apiKey = process.env.DOUBAO_API_KEY || process.env.ARK_API_KEY;
    if (!apiKey) throw new Error("AI 未配置");

    const rawBase = process.env.DOUBAO_BASE_URL || "";
    const endpoint = rawBase && /^https?:\/\//i.test(rawBase)
      ? `${rawBase.replace(/\/+$/, "")}/chat/completions`
      : "https://ark.cn-beijing.volces.com/api/v3/chat/completions";

    const model = process.env.DOUBAO_MODEL || "deepseek-v4-pro-260425";

    const prompt = campusGrowthPlannerPrompt({
      school: body.school || {},
      businesses: body.businesses || {},
      socialStats: body.socialStats || [],
    });

    // 单次非流式调用，跟 /api/generate 一样的方式
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
      body: JSON.stringify({ model, messages: [{ role: "user", content: prompt }], temperature: 0.7, max_tokens: 4096 }),
      signal: AbortSignal.timeout(50000),
    });

    if (!res.ok) throw new Error(`AI 返回 ${res.status}`);

    const data = await res.json();
    const text = (data?.choices?.[0]?.message?.content || "").trim();
    const jsonStr = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
    let plan: any;
    try {
      plan = JSON.parse(jsonStr);
    } catch {
      const m = jsonStr.match(/\{[\s\S]*\}/);
      if (!m) throw new Error("JSON 解析失败，请重试");
      plan = JSON.parse(m[0]);
    }

    // Save
    const admin = createSupabaseAdminClient();
    await admin.from("operations_plans").insert({
      user_id: ctx.user.id,
      school_id: body.schoolId || null,
      plan_data: plan,
      school_level: plan.schoolLevel || "",
      investment_level: plan.investmentLevel || "",
    });

    return NextResponse.json({ plan });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "超时" }, { status: 500 });
  }
}
