import { getAuthContext } from "@/lib/auth";
import { campusGrowthPlannerPrompt } from "@/prompts/campusGrowthPlanner";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const ctx = await getAuthContext();
  if (!ctx) return new Response("Unauthorized", { status: 401 });

  const body = await request.json() as {
    school?: { name: string; campusName?: string; totalStudents: number; newStudents: number; maleRatio: number; dormCount: number; semesterStart: string; militaryStart?: string; registerStart?: string };
    businesses?: { phoneCards: boolean; bedding: boolean; partTime: boolean; errands: boolean; secondHand: boolean; competitorCount: number; lastYearDeals: number; lastYearRate: string };
    socialStats?: Array<{ platform: string; accountCount: number; publishCount: number; exposure: number; likes: number; favorites: number; comments: number; privateMessages: number; groups: number; deals: number }>;
    schoolId?: string;
  };

  if (!body.school || !body.businesses) {
    return new Response(JSON.stringify({ error: "缺少数据" }), { status: 400, headers: { "Content-Type": "application/json" } });
  }

  const apiKey = process.env.DOUBAO_API_KEY || process.env.ARK_API_KEY;
  if (!apiKey) return new Response(JSON.stringify({ error: "AI 未配置" }), { status: 500, headers: { "Content-Type": "application/json" } });

  const rawBase = process.env.DOUBAO_BASE_URL || "";
  const endpoint = rawBase && /^https?:\/\//i.test(rawBase)
    ? `${rawBase.replace(/\/+$/, "")}/chat/completions`
    : "https://ark.cn-beijing.volces.com/api/v3/chat/completions";
  const model = process.env.DOUBAO_MODEL || "deepseek-v4-pro-260425";

  const prompt = campusGrowthPlannerPrompt({
    school: body.school,
    businesses: body.businesses,
    socialStats: body.socialStats || [],
  });

  const admin = createSupabaseAdminClient();

  // Create job record
  const { data: job } = await admin.from("operations_jobs").insert({ user_id: ctx.user.id, school_id: body.schoolId || null, school_name: body.school?.name || "", status: "running", progress: "AI 分析中..." }).select("id").single();
  const jobId = job?.id;

  // Stream from DeepSeek to client
  const aiRes = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
    body: JSON.stringify({ model, messages: [{ role: "user", content: prompt }], temperature: 0.7, max_tokens: 4096, stream: true }),
    signal: AbortSignal.timeout(28000),
  });

  if (!aiRes.ok || !aiRes.body) {
    const errText = aiRes.ok ? "empty body" : `status ${aiRes.status}`;
    if (jobId) await admin.from("operations_jobs").update({ status: "failed", error_message: errText }).eq("id", jobId);
    return new Response(JSON.stringify({ error: `AI 调用失败: ${errText}` }), { status: 502, headers: { "Content-Type": "application/json" } });
  }

  // Create streaming response — sends SSE to client
  // Send headers immediately (triggers Vercel 30s streaming window)
  const encoder = new TextEncoder();
  let fullContent = "";

  const stream = new ReadableStream({
    async start(controller) {
      // Heartbeat: send progress every 5s while waiting for first AI token
      let heartbeatCount = 0;
      const heartbeat = setInterval(() => {
        heartbeatCount += 1;
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "progress", msg: `等待 AI 响应 ${heartbeatCount * 5}s...`, jobId })}\n\n`));
      }, 5000);

      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "start", jobId })}\n\n`));

      const reader = aiRes.body!.getReader();
      const decoder = new TextDecoder();

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          for (const line of chunk.split("\n")) {
            if (line.startsWith("data: ")) {
              const d = line.slice(6).trim();
              if (d === "[DONE]") continue;
              try {
                const delta = JSON.parse(d).choices?.[0]?.delta?.content || "";
                fullContent += delta;
                if (delta) controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "chunk", text: delta })}\n\n`));
              } catch { /* skip */ }
            }
          }
        }

        // Stop heartbeat
        clearInterval(heartbeat);

        // Parse and save
        const jsonStr = fullContent.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
        let parsed: any;
        try {
          parsed = JSON.parse(jsonStr);
        } catch {
          const m = jsonStr.match(/\{[\s\S]*\}/);
          if (m) parsed = JSON.parse(m[0]);
        }

        if (parsed) {
          if (jobId) await admin.from("operations_jobs").update({ status: "completed", plan_data: parsed, progress: "完成" }).eq("id", jobId);
          await admin.from("operations_plans").insert({ user_id: ctx.user.id, school_id: body.schoolId || null, plan_data: parsed, school_level: parsed.schoolLevel || "", investment_level: parsed.investmentLevel || "" });
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "done", plan: parsed, jobId })}\n\n`));
        } else {
          if (jobId) await admin.from("operations_jobs").update({ status: "failed", error_message: "JSON 解析失败" }).eq("id", jobId);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "error", message: "JSON 解析失败" })}\n\n`));
        }
      } catch (e: any) {
        clearInterval(heartbeat);
        if (jobId) await admin.from("operations_jobs").update({ status: "failed", error_message: e?.message || "流中断" }).eq("id", jobId);
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "error", message: e?.message || "中断" })}\n\n`));
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
