import { NextResponse } from "next/server";
import { campusGrowthPlannerPrompt } from "@/prompts/campusGrowthPlanner";

export async function POST(request: Request) {
  const body = await request.json() as {
    jobId: string;
    school: { name: string; campusName?: string; totalStudents: number; newStudents: number; maleRatio: number; dormCount: number; semesterStart: string; militaryStart?: string; registerStart?: string };
    businesses: { phoneCards: boolean; bedding: boolean; partTime: boolean; errands: boolean; secondHand: boolean; competitorCount: number; lastYearDeals: number; lastYearRate: string };
    socialStats: Array<{ platform: string; accountCount: number; publishCount: number; exposure: number; likes: number; favorites: number; comments: number; privateMessages: number; groups: number; deals: number }>;
    schoolId?: string;
  };

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const { createSupabaseAdminClient } = await import("@/lib/supabase/admin");
  const admin = createSupabaseAdminClient();

  // Update job → running
  await admin.from("operations_jobs").update({ status: "running", progress: "AI 正在分析校区数据...", updated_at: new Date().toISOString() }).eq("id", body.jobId);

  try {
    const apiKey = process.env.DOUBAO_API_KEY || process.env.ARK_API_KEY;
    if (!apiKey) throw new Error("AI Key 未配置");

    const rawBase = process.env.DOUBAO_BASE_URL || "";
    const endpoint = rawBase && /^https?:\/\//i.test(rawBase)
      ? `${rawBase.replace(/\/+$/, "")}/chat/completions`
      : "https://ark.cn-beijing.volces.com/api/v3/chat/completions";

    const model = process.env.DOUBAO_MODEL || "deepseek-v4-pro-260425";

    const prompt = campusGrowthPlannerPrompt({
      school: body.school,
      businesses: body.businesses,
      socialStats: body.socialStats,
    });

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 4096,
        stream: true,
      }),
      signal: AbortSignal.timeout(55000),
    });

    if (!res.ok) throw new Error(`AI 服务返回 ${res.status}`);

    // Stream read
    await admin.from("operations_jobs").update({ progress: "AI 正在生成方案...", updated_at: new Date().toISOString() }).eq("id", body.jobId);

    let content = "";
    const decoder = new TextDecoder();
    const reader = res.body?.getReader();
    if (!reader) throw new Error("流式读取不支持");

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      for (const line of chunk.split("\n")) {
        if (line.startsWith("data: ")) {
          const d = line.slice(6).trim();
          if (d === "[DONE]") continue;
          try {
            content += JSON.parse(d).choices?.[0]?.delta?.content || "";
          } catch { /* skip */ }
        }
      }
      // Progress heartbeat every few chunks
      if (content.length > 0 && content.length % 500 < 20) {
        await admin.from("operations_jobs").update({ progress: `已生成 ${content.length} 字符...`, updated_at: new Date().toISOString() }).eq("id", body.jobId);
      }
    }

    if (!content) throw new Error("AI 返回为空");

    // Parse JSON from content
    const jsonStr = content.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
    let parsed: any;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      // Try to extract JSON object
      const m = jsonStr.match(/\{[\s\S]*\}/);
      if (m) parsed = JSON.parse(m[0]);
      else throw new Error("JSON 解析失败");
    }

    // Save to jobs + plans
    await admin.from("operations_jobs").update({ status: "completed", plan_data: parsed, progress: "完成", updated_at: new Date().toISOString() }).eq("id", body.jobId);

    await admin.from("operations_plans").insert({
      user_id: (await admin.from("operations_jobs").select("user_id").eq("id", body.jobId).single()).data?.user_id,
      school_id: body.schoolId || null,
      plan_data: parsed,
      school_level: parsed.schoolLevel || "",
      investment_level: parsed.investmentLevel || "",
    });

    return NextResponse.json({ ok: true, plan: parsed });
  } catch (e: any) {
    const msg = e?.message || "未知错误";
    await admin.from("operations_jobs").update({ status: "failed", error_message: msg, progress: "失败", updated_at: new Date().toISOString() }).eq("id", body.jobId);

    // Retry once
    const job = (await admin.from("operations_jobs").select("retries,max_retries").eq("id", body.jobId).single()).data;
    if (job && job.retries < job.max_retries) {
      await admin.from("operations_jobs").update({ status: "pending", retries: job.retries + 1, progress: `重试 ${job.retries + 1}/${job.max_retries}...`, updated_at: new Date().toISOString() }).eq("id", body.jobId);
      // Fire retry — call self
      fetch(`${supabaseUrl.replace(/\/$/, "")}/api/operations/plan/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }).catch(() => {});
    }

    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
