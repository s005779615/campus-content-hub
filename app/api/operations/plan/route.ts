import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { campusGrowthPlannerPrompt } from "@/prompts/campusGrowthPlanner";

async function callAI(prompt: string, opts?: { temperature?: number }) {
  const apiKey = process.env.DOUBAO_API_KEY || process.env.ARK_API_KEY;
  if (!apiKey) throw new Error("AI Key 未配置");

  const rawBase = process.env.DOUBAO_BASE_URL || "";
  const endpoint = rawBase && /^https?:\/\//i.test(rawBase)
    ? `${rawBase.replace(/\/+$/, "")}/chat/completions`
    : "https://ark.cn-beijing.volces.com/api/v3/chat/completions";

  const model = process.env.DOUBAO_MODEL || "deepseek-v4-pro-260425";

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      temperature: opts?.temperature ?? 0.7,
      max_tokens: 4096,
    }),
    signal: AbortSignal.timeout(50000),
  });
  if (!res.ok) throw new Error(`AI 服务返回 ${res.status}`);
  const data = await res.json() as any;
  return { content: data?.choices?.[0]?.message?.content || "" };
}

export async function POST(request: Request) {
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json() as {
    school?: {
      name: string;
      campusName?: string;
      totalStudents: number;
      newStudents: number;
      maleRatio: number;
      dormCount: number;
      semesterStart: string;
      militaryStart?: string;
      registerStart?: string;
    };
    businesses?: {
      phoneCards: boolean;
      bedding: boolean;
      partTime: boolean;
      errands: boolean;
      secondHand: boolean;
      competitorCount: number;
      lastYearDeals: number;
      lastYearRate: string;
    };
    socialStats?: Array<{
      platform: string;
      accountCount: number;
      publishCount: number;
      exposure: number;
      likes: number;
      favorites: number;
      comments: number;
      privateMessages: number;
      groups: number;
      deals: number;
    }>;
    schoolId?: string;
  };

  if (!body.school || !body.businesses) {
    return NextResponse.json({ error: "缺少学校或业务数据" }, { status: 400 });
  }

  try {
    const prompt = campusGrowthPlannerPrompt({
      school: {
        name: body.school.name,
        campusName: body.school.campusName,
        totalStudents: body.school.totalStudents || 0,
        newStudents: body.school.newStudents || 0,
        maleRatio: body.school.maleRatio || 0.5,
        dormCount: body.school.dormCount || 0,
        semesterStart: body.school.semesterStart || "",
        militaryStart: body.school.militaryStart,
        registerStart: body.school.registerStart,
      },
      businesses: {
        phoneCards: body.businesses.phoneCards ?? false,
        bedding: body.businesses.bedding ?? false,
        partTime: body.businesses.partTime ?? false,
        errands: body.businesses.errands ?? false,
        secondHand: body.businesses.secondHand ?? false,
        competitorCount: body.businesses.competitorCount || 0,
        lastYearDeals: body.businesses.lastYearDeals || 0,
        lastYearRate: body.businesses.lastYearRate || "0%",
      },
      socialStats: body.socialStats || [],
    });

    const result = await callAI(prompt, { temperature: 0.7 });

    let parsed: any = {};
    const text = (result?.content || "").trim();
    // Strip markdown code fences
    const jsonStr = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      return NextResponse.json({
        error: "AI 返回格式异常，请重试",
        raw: text.slice(0, 400),
      }, { status: 422 });
    }

    // Save to history
    if (body.schoolId) {
      await ctx.supabase.from("operations_plans").insert({
        user_id: ctx.profile.id,
        school_id: body.schoolId,
        plan_data: parsed,
        school_level: parsed.schoolLevel || "",
        investment_level: parsed.investmentLevel || "",
      });
    }

    return NextResponse.json({ plan: parsed });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "AI 调用失败";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
