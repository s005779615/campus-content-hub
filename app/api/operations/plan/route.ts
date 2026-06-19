import { getAuthContext } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

async function quickAI(messages: Array<{ role: string; content: string }>, signal: AbortSignal) {
  const apiKey = process.env.DOUBAO_API_KEY || process.env.ARK_API_KEY;
  if (!apiKey) throw new Error("AI 未配置");
  const rawBase = process.env.DOUBAO_BASE_URL || "";
  const endpoint = rawBase && /^https?:\/\//i.test(rawBase)
    ? `${rawBase.replace(/\/+$/, "")}/chat/completions`
    : "https://ark.cn-beijing.volces.com/api/v3/chat/completions";
  const model = process.env.DOUBAO_MODEL || "deepseek-v4-pro-260425";

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
    body: JSON.stringify({ model, messages, temperature: 0.7, max_tokens: 1024, stream: true }),
    signal,
  });
  if (!res.ok || !res.body) throw new Error(`AI ${res.status}`);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let content = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    for (const line of decoder.decode(value, { stream: true }).split("\n")) {
      if (line.startsWith("data: ")) {
        const d = line.slice(6).trim();
        if (d === "[DONE]") continue;
        try { content += JSON.parse(d).choices?.[0]?.delta?.content || ""; } catch { /* skip */ }
      }
    }
  }
  return content;
}

function parseJson(raw: string) {
  const clean = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  try { return JSON.parse(clean); } catch {
    const m = clean.match(/\{[\s\S]*\}/);
    return m ? JSON.parse(m[0]) : null;
  }
}

export async function POST(request: Request) {
  const ctx = await getAuthContext();
  if (!ctx) return new Response("Unauthorized", { status: 401 });

  const body = await request.json() as any;
  const school = body.school || {};
  const businesses = body.businesses || {};
  const socialStats = body.socialStats || [];
  const schoolId = body.schoolId || null;

  const s = school; const b = businesses;
  const bizList = [b.phoneCards && "电话卡", b.bedding && "被子", b.partTime && "兼职", b.errands && "跑腿", b.secondHand && "二手"].filter(Boolean);
  const hasData = socialStats.some((x: any) => x.accountCount > 0 || x.publishCount > 0);
  const ctxBlock = `校名：${s.name}${s.campusName ? `（${s.campusName}）` : ""} | 在校 ${s.totalStudents} 人 | 新生 ${s.newStudents} 人 | 男女比 ${Math.round((s.maleRatio || 0.5) * 100)}:${Math.round((1 - (s.maleRatio || 0.5)) * 100)} | 宿舍 ${s.dormCount} 栋 | 开学 ${s.semesterStart || "未设置"}${s.militaryStart ? ` 军训 ${s.militaryStart}` : ""}${s.registerStart ? ` 报到 ${s.registerStart}` : ""}\n业务：${bizList.length ? bizList.join("、") : "未选"} | 竞争 ${b.competitorCount || 0} 队 | 往年 ${b.lastYearDeals || 0} 人成交 / ${b.lastYearRate || "0%"}\n${hasData ? socialStats.map((x: any) => `${x.platform}：${x.accountCount}号 ${x.publishCount}条 ${x.exposure}曝光 ${x.likes}赞 ${x.privateMessages}私信 ${x.groups}进群 ${x.deals}成交`).join(" | ") : "新起号"}`;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: any) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      // Heartbeat every 6s to keep Vercel streaming window alive
      const hb = setInterval(() => { try { send({ type: "progress", msg: "AI 思考中..." }); } catch {} }, 6000);

      try {
        // ── Phase 1: Rating + Diagnosis + Stage + Strategy + Risks + Prediction ──
        send({ type: "phase", msg: "阶段1/2：校区评级 + AI诊断 + 增长策略" });
        const [raw1, raw2] = await Promise.all([
          quickAI([
            { role: "system", content: "你是校园增长运营专家。只输出纯JSON，不要markdown包裹。" },
            { role: "user", content: `${ctxBlock}\n\n基于数据输出：校区评级(A/B/C级)、投入等级(高/中/低)、运营阶段分析、AI诊断(3条)。\n要求JSON格式:{"schoolLevel":"A级","investmentLevel":"高","stageAnalysis":{"currentStage":"预热期","stageGoal":"核心目标","strategyBrief":"200字策略概述","recommendedContent":["方向1"],"focusActions":["动作1"]},"diagnosis":[{"issue":"数据问题","rootCause":"根因","impact":"量化影响","suggestion":"可执行建议"}]}` },
          ], AbortSignal.timeout(25000)),
          quickAI([
            { role: "system", content: "你是校园增长运营专家。只输出纯JSON。" },
            { role: "user", content: `${ctxBlock}\n\n基于数据输出增长策略和风险预估。\n要求JSON格式:{"growthStrategy":{"trafficStrategy":"引流策略","conversionStrategy":"转化策略","platformStrategy":{"小红书":"策","抖音":"策","视频号":"策"},"contentRotation":"内容轮转"},"risks":[{"risk":"风险","level":"高/中/低","probability":"概率","trigger":"量化触发条件","impact":"影响","mitigation":"对策"}],"prediction":{"exposure":0,"privateMessages":0,"groups":0,"orders":0,"conversionRate":"百分比"}}` },
          ], AbortSignal.timeout(25000)),
        ]);

        const part1 = parseJson(raw1) || {};
        const part2 = parseJson(raw2) || {};

        // ── Phase 2: 15-Day Plan ──
        send({ type: "phase", msg: "阶段2/2：生成15天执行计划" });
        const raw3 = await quickAI([
          { role: "system", content: "你是校园增长运营专家。只输出纯JSON数组，不要markdown。" },
          { role: "user", content: `${ctxBlock}\n\n从今天起未来15天执行计划。每天:date(YYYY-MM-DD)、phase(预热/冲刺/转化/开学)、goal(今日增长目标)、contentDirection(内容大方向不给标题)、recommendedPlatform(首推平台)、suggestedCount(发布数1-5)、targetMetrics({"曝光":0,"私信":0,"进群":0})、personInCharge(角色)。\n返回JSON数组:[{"date":"","phase":"","goal":"","contentDirection":"","recommendedPlatform":"","suggestedCount":1,"targetMetrics":{"曝光":0,"私信":0,"进群":0},"personInCharge":""}]` },
        ], AbortSignal.timeout(25000));

        const plan15Days = parseJson(raw3);

        clearInterval(hb);

        // ── Assemble ──
        const plan = {
          schoolLevel: part1.schoolLevel || "B级",
          investmentLevel: part1.investmentLevel || "中",
          stageAnalysis: part1.stageAnalysis || {},
          diagnosis: part1.diagnosis || [],
          growthStrategy: part2.growthStrategy || {},
          risks: part2.risks || [],
          prediction: part2.prediction || {},
          plan15Days: Array.isArray(plan15Days) ? plan15Days : [],
          teamTasks: {
            "运营": ["执行增长策略，把控内容方向"],
            "内容": ["按每日 contentDirection 创作内容"],
            "发布": ["按 recommendedPlatform 和 suggestedCount 发布"],
            "校区负责人": ["监控数据目标，调整策略"],
            "代理": ["评论区互动，私信转化"],
          },
        };

        // Save
        const admin = createSupabaseAdminClient();
        await admin.from("operations_plans").insert({
          user_id: ctx.user.id,
          school_id: schoolId,
          plan_data: plan,
          school_level: plan.schoolLevel,
          investment_level: plan.investmentLevel,
        });

        send({ type: "done", plan });
      } catch (e: any) {
        clearInterval(hb);
        send({ type: "error", message: e?.message || "超时" });
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
  });
}
