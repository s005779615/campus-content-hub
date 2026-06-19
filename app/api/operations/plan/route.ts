import { getAuthContext } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/** Lightweight AI call — single prompt, streaming, returns text */
async function quickAI(messages: Array<{ role: string; content: string }>, signal?: AbortSignal) {
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

function parseAIJson(raw: string) {
  const clean = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  try { return JSON.parse(clean); } catch {
    const m = clean.match(/\{[\s\S]*\}/);
    if (m) return JSON.parse(m[0]);
    return null;
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

  const s = school;
  const b = businesses;
  const bizList = [b.phoneCards && "电话卡", b.bedding && "被子", b.partTime && "兼职", b.errands && "跑腿", b.secondHand && "二手"].filter(Boolean);
  const hasData = socialStats.some((x: any) => x.accountCount > 0 || x.publishCount > 0);

  const ctxBlock = `
校名：${s.name}${s.campusName ? `（${s.campusName}）` : ""} | 在校 ${s.totalStudents} 人 | 新生 ${s.newStudents} 人
男女比 ${Math.round((s.maleRatio || 0.5) * 100)}:${Math.round((1 - (s.maleRatio || 0.5)) * 100)} | 宿舍 ${s.dormCount} 栋
开学 ${s.semesterStart || "未设置"}${s.militaryStart ? ` | 军训 ${s.militaryStart}` : ""}${s.registerStart ? ` | 报到 ${s.registerStart}` : ""}
业务：${bizList.length ? bizList.join("、") : "未选"} | 竞争团队 ${b.competitorCount || 0} 个 | 往年成交 ${b.lastYearDeals || 0} 人 / ${b.lastYearRate || "0%"}
${hasData ? socialStats.map((x: any) => `${x.platform}：${x.accountCount}号 ${x.publishCount}条 ${x.exposure}曝光 ${x.likes}赞 ${x.privateMessages}私信 ${x.groups}进群 ${x.deals}成交`).join(" | ") : "新起号无数据"}`;

  const signals = [AbortSignal.timeout(25000), AbortSignal.timeout(25000), AbortSignal.timeout(25000)];

  try {
    // ── Phase 1: Rating + Diagnosis + Stage (parallel) ──
    const [raw1, raw2] = await Promise.all([
      quickAI([
        { role: "system", content: "你是校园增长运营专家。输出纯JSON，无markdown。" },
        { role: "user", content: `${ctxBlock}\n\n基于以上数据，输出校区评级(A/B/C级)、投入等级(高/中/低)、运营阶段分析(预热期/冲刺期/转化期)和AI诊断(3条数据问题+根因+建议)。\n\n返回JSON:{"schoolLevel":"A级","investmentLevel":"高","stageAnalysis":{"currentStage":"预热期","stageGoal":"目标","strategyBrief":"策略概述200字","recommendedContent":["内容方向1"],"focusActions":["动作1"]},"diagnosis":[{"issue":"问题","rootCause":"根因","impact":"影响","suggestion":"建议"}]}` },
      ], signals[0]),
      quickAI([
        { role: "system", content: "你是校园增长运营专家。输出纯JSON。" },
        { role: "user", content: `${ctxBlock}\n\n基于以上数据，输出增长策略和风险预警。\n\n返回JSON:{"growthStrategy":{"trafficStrategy":"引流策略","conversionStrategy":"转化策略","platformStrategy":{"小红书":"策略","抖音":"策略","视频号":"策略"},"contentRotation":"内容轮转建议"},"risks":[{"risk":"风险","level":"高/中/低","probability":"概率","trigger":"触发条件","impact":"影响","mitigation":"对策"}],"prediction":{"exposure":0,"privateMessages":0,"groups":0,"orders":0,"conversionRate":"百分比"}}` },
      ], signals[1]),
    ]);

    const part1 = parseAIJson(raw1) || {};
    const part2 = parseAIJson(raw2) || {};

    // ── Phase 2: 15-Day Plan ──
    const raw3 = await quickAI([
      { role: "system", content: "你是校园增长运营专家。输出纯JSON数组，无markdown。" },
      { role: "user", content: `${ctxBlock}\n\n基于数据生成未来15天执行计划(从今天起)。每天包含：date(YYYY-MM-DD)、phase(预热/冲刺/转化/开学)、goal(今日增长目标)、contentDirection(内容大方向，不要具体标题)、recommendedPlatform(首推平台)、suggestedCount(建议发布数1-5)、targetMetrics({"曝光":0,"私信":0,"进群":0})、personInCharge(负责人角色)。\n\n返回JSON数组: [{"date":"2026-06-20","phase":"预热","goal":"...","contentDirection":"...","recommendedPlatform":"小红书","suggestedCount":2,"targetMetrics":{"曝光":3000,"私信":30,"进群":5},"personInCharge":"运营"}]` },
    ], signals[2]);

    const plan15Days = parseAIJson(raw3);

    // ── Assemble result ──
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
        "运营": ["按增长策略执行每日内容方向"],
        "内容": ["按 contentDirection 创作"],
        "发布": ["按 recommendedPlatform 和 suggestedCount 发布"],
        "校区负责人": ["监控数据目标达成"],
        "代理": ["评论区互动和私信转化"],
      },
    };

    // Save to DB
    const admin = createSupabaseAdminClient();
    await admin.from("operations_plans").insert({
      user_id: ctx.user.id,
      school_id: schoolId,
      plan_data: plan,
      school_level: plan.schoolLevel,
      investment_level: plan.investmentLevel,
    });

    return new Response(JSON.stringify({ plan }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || "超时" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
