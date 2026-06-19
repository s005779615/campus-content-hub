import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" };

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { school, businesses, socialStats, schoolId, userId } = await req.json();
    const apiKey = Deno.env.get("DOUBAO_API_KEY") || Deno.env.get("ARK_API_KEY");
    if (!apiKey) throw new Error("AI Key 未配置");
    const rawBase = Deno.env.get("DOUBAO_BASE_URL") || "";
    const endpoint = rawBase && /^https?:\/\//i.test(rawBase)
      ? `${rawBase.replace(/\/+$/, "")}/chat/completions`
      : "https://ark.cn-beijing.volces.com/api/v3/chat/completions";
    const model = Deno.env.get("DOUBAO_MODEL") || "deepseek-v4-pro-260425";

    const s = school; const b = businesses;
    const bizList = [b.phoneCards && "电话卡", b.bedding && "被子", b.partTime && "兼职", b.errands && "跑腿", b.secondHand && "二手"].filter(Boolean);
    const hasData = socialStats?.some((x: any) => x.accountCount > 0 || x.publishCount > 0);
    const ctxBlock = `校名：${s.name}${s.campusName ? `（${s.campusName}）` : ""} | 在校 ${s.totalStudents} 人 | 新生 ${s.newStudents} 人 | 男女比 ${Math.round((s.maleRatio || 0.5) * 100)}:${Math.round((1 - (s.maleRatio || 0.5)) * 100)} | 宿舍 ${s.dormCount} 栋 | 开学 ${s.semesterStart || "未设置"}${s.militaryStart ? ` 军训 ${s.militaryStart}` : ""}${s.registerStart ? ` 报到 ${s.registerStart}` : ""}\n业务：${bizList.length ? bizList.join("、") : "未选"} | 竞争 ${b.competitorCount || 0} 队 | 往年 ${b.lastYearDeals || 0} 人成交 / ${b.lastYearRate || "0%"}\n${hasData ? socialStats.map((x: any) => `${x.platform}：${x.accountCount}号 ${x.publishCount}条 ${x.exposure}曝光 ${x.likes}赞 ${x.privateMessages}私信 ${x.groups}进群 ${x.deals}成交`).join(" | ") : "新起号"}`;

    async function quickAI(messages: Array<{ role: string; content: string }>) {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
        body: JSON.stringify({ model, messages, temperature: 0.7, max_tokens: 2048, stream: true }),
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

    // Phase 1: parallel
    const [raw1, raw2] = await Promise.all([
      quickAI([
        { role: "system", content: "你是校园增长运营专家。只输出纯JSON。" },
        { role: "user", content: `${ctxBlock}\n\n基于数据输出校区评级、运营阶段分析、AI诊断。JSON:{"schoolLevel":"A级","investmentLevel":"高","stageAnalysis":{"currentStage":"预热期","stageGoal":"目标","strategyBrief":"200字策略概述","recommendedContent":["方向"],"focusActions":["动作"]},"diagnosis":[{"issue":"问题","rootCause":"根因","impact":"影响","suggestion":"建议"}]}` },
      ]),
      quickAI([
        { role: "system", content: "你是校园增长运营专家。只输出纯JSON。" },
        { role: "user", content: `${ctxBlock}\n\n基于数据输出增长策略和风险预估。JSON:{"growthStrategy":{"trafficStrategy":"引流策略","conversionStrategy":"转化策略","platformStrategy":{"小红书":"策","抖音":"策","视频号":"策"},"contentRotation":"内容轮转"},"risks":[{"risk":"风险","level":"高/中/低","probability":"概率","trigger":"触发条件","impact":"影响","mitigation":"对策"}],"prediction":{"exposure":0,"privateMessages":0,"groups":0,"orders":0,"conversionRate":"百分比"}}` },
      ]),
    ]);

    const part1 = parseJson(raw1) || {};
    const part2 = parseJson(raw2) || {};

    // Phase 2: 15-day plan
    const raw3 = await quickAI([
      { role: "system", content: "你是校园增长运营专家。只输出纯JSON数组。" },
      { role: "user", content: `${ctxBlock}\n\n15天执行计划，每天:date(YYYY-MM-DD)、phase(预热/冲刺/转化/开学)、goal、contentDirection(不给标题)、recommendedPlatform、suggestedCount(1-5)、targetMetrics({"曝光":0,"私信":0,"进群":0})、personInCharge。返回JSON数组` },
    ]);

    const plan15Days = parseJson(raw3);

    const plan = {
      schoolLevel: part1.schoolLevel || "B级",
      investmentLevel: part1.investmentLevel || "中",
      stageAnalysis: part1.stageAnalysis || {},
      diagnosis: part1.diagnosis || [],
      growthStrategy: part2.growthStrategy || {},
      risks: part2.risks || [],
      prediction: part2.prediction || {},
      plan15Days: Array.isArray(plan15Days) ? plan15Days : [],
      teamTasks: { "运营": ["执行增长策略"], "内容": ["按contentDirection创作"], "发布": ["按recommendedPlatform发布"], "校区负责人": ["监控目标"], "代理": ["评论互动"] },
    };

    // Save to DB
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    await fetch(`${supabaseUrl}/rest/v1/operations_plans`, {
      method: "POST",
      headers: { "apikey": serviceKey, "Authorization": `Bearer ${serviceKey}`, "Content-Type": "application/json", "Prefer": "return=minimal" },
      body: JSON.stringify({ user_id: userId, school_id: schoolId || null, plan_data: plan, school_level: plan.schoolLevel, investment_level: plan.investmentLevel }),
    });

    return new Response(JSON.stringify({ plan }), { headers: corsHeaders });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || "超时" }), { status: 500, headers: corsHeaders });
  }
});
