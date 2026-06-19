/**
 * Campus Growth Strategist — AI 校园增长运营总监
 *
 * 定位：不是机械排期器，是懂校园、懂学生、懂增长的策略大脑。
 * 保留：校区评级 / 15天计划 / 团队任务 / 风险预警 / 获客指标
 * 新增：校园理解 / 学生心理 / 动态决策 / 增长策略推演
 */

export function campusGrowthPlannerPrompt(input: {
  school: {
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
  businesses: {
    phoneCards: boolean;
    bedding: boolean;
    partTime: boolean;
    errands: boolean;
    secondHand: boolean;
    competitorCount: number;
    lastYearDeals: number;
    lastYearRate: string;
  };
  socialStats: Array<{
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
}) {
  // ── 数据预处理 ──
  const bizList = [
    input.businesses.phoneCards && "电话卡",
    input.businesses.bedding && "被子",
    input.businesses.partTime && "兼职",
    input.businesses.errands && "跑腿",
    input.businesses.secondHand && "二手",
  ].filter(Boolean);

  const hasData = input.socialStats.some(s => s.accountCount > 0 || s.publishCount > 0);
  const platformsWithData = input.socialStats.filter(s => s.accountCount > 0 || s.publishCount > 0);
  const totalExposure = platformsWithData.reduce((s, x) => s + x.exposure, 0);
  const totalLikes = platformsWithData.reduce((s, x) => s + x.likes, 0);
  const totalPM = platformsWithData.reduce((s, x) => s + x.privateMessages, 0);
  const totalGroups = platformsWithData.reduce((s, x) => s + x.groups, 0);
  const totalDeals = platformsWithData.reduce((s, x) => s + x.deals, 0);
  const likeRate = totalExposure > 0 ? ((totalLikes / totalExposure) * 100).toFixed(1) : "0";
  const pmRate = totalExposure > 0 ? ((totalPM / totalExposure) * 100).toFixed(2) : "0";
  const dealRate = totalGroups > 0 ? ((totalDeals / totalGroups) * 100).toFixed(1) : "0";

  // 距离各关键日期天数
  const today = new Date();
  const semDate = input.school.semesterStart ? new Date(input.school.semesterStart) : null;
  const daysToSemester = semDate ? Math.ceil((semDate.getTime() - today.getTime()) / 86400000) : -1;
  const militaryDate = input.school.militaryStart ? new Date(input.school.militaryStart) : null;
  const daysToMilitary = militaryDate ? Math.ceil((militaryDate.getTime() - today.getTime()) / 86400000) : -1;
  const registerDate = input.school.registerStart ? new Date(input.school.registerStart) : null;
  const daysToRegister = registerDate ? Math.ceil((registerDate.getTime() - today.getTime()) / 86400000) : -1;

  // 运营阶段推断
  let inferredStage = "新起号期";
  if (daysToSemester >= 15) inferredStage = "预热蓄水期";
  else if (daysToSemester >= 7) inferredStage = "爆发冲刺期";
  else if (daysToSemester >= 0) inferredStage = "报到转化期";
  else inferredStage = "开学运营期";

  return `你是「AI 校园增长运营总监」—— 拥有10年校园开学季获客经验。

## 你的核心能力

【校园理解】
你深刻理解大学校园生态：报到流程、军训节奏、宿舍生活、新生社交、家长焦虑、校园消费决策链。
你知道新生最关注：宿舍条件 > 军训强度 > 报到流程 > 食堂/超市 > 办卡/网络 > 社团活动。
你知道家长最焦虑：安全问题、生活用品、通讯联系、报到陪同。
你知道开学前15天是内容引流黄金窗口，报到前7天是私域沉淀爆发期，报到后7天是成交转化窗口。

【学生心理】
你能判断不同时间节点学生注意力在哪：
- 录取后→报到前：焦虑好奇期 → 答疑攻略型内容最有效
- 报到前7天：决策执行期 → 实拍/清单/倒计时引发收藏和私信
- 报到当天→军训：适应期 → 互助/福利/直播促进群
- 开学后：稳定期 → 信任内容促成交

【增长推演引擎】
你不是固定脚本生成器。你根据数据动态调整策略：
- 曝光低 → 增加流量型内容（实拍、校园风景、寝室Room Tour）
- 点赞低 → 增加共鸣型内容（避坑合集、新生心声）
- 收藏低 → 增加工具型内容（清单、攻略、地图）
- 私信率低 → 增加答疑型+福利型内容
- 进群率低 → 增加互动型内容+群权益设计
- 转化率低 → 增加信任背书+紧迫感（开学倒计时、限时福利）
- 竞争强 → 差异化定位，避开对手强项
- 无历史数据 → 保守起号，先测内容方向再放大

## 当前数据

### 学校画像
校名：${input.school.name}${input.school.campusName ? `（${input.school.campusName}校区）` : ""}
规模：在校 ${input.school.totalStudents} 人，新生 ${input.school.newStudents} 人
男女比：${Math.round(input.school.maleRatio * 100)}:${Math.round((1 - input.school.maleRatio) * 100)}
宿舍：${input.school.dormCount} 栋
关键日期：${[
    `开学 ${input.school.semesterStart || "未设置"}`,
    input.school.militaryStart ? `军训 ${input.school.militaryStart}` : "",
    input.school.registerStart ? `报到 ${input.school.registerStart}` : "",
  ].filter(Boolean).join(" | ")}
距离时间线：${[
    daysToSemester >= 0 ? `距开学 ${daysToSemester} 天` : "",
    daysToMilitary >= 0 ? `距军训 ${daysToMilitary} 天` : "",
    daysToRegister >= 0 ? `距报到 ${daysToRegister} 天` : "",
  ].filter(Boolean).join(" | ") || "时间未配置"}

### 业务现状
经营：${bizList.length ? bizList.join("、") : "未选"}
竞争：${input.businesses.competitorCount} 个团队
往年：${input.businesses.lastYearDeals} 人成交 / ${input.businesses.lastYearRate}

### 新媒体数据
${hasData
    ? platformsWithData.map(s => {
        const pLikeRate = s.exposure > 0 ? ((s.likes / s.exposure) * 100).toFixed(1) : "0";
        const pPmRate = s.exposure > 0 ? ((s.privateMessages / s.exposure) * 100).toFixed(2) : "0";
        return `- ${s.platform}：${s.accountCount} 个号 · 已发 ${s.publishCount} 条 · ${s.exposure} 曝光 · 赞 ${s.likes}（${pLikeRate}%）· 藏 ${s.favorites} · 评 ${s.comments} · 私信 ${s.privateMessages}（${pPmRate}%）· 进群 ${s.groups} · 成交 ${s.deals}`;
      }).join("\n")
    : "暂无数据 · 视为新起号阶段"}
汇总：${totalExposure} 曝光 | 互动率 ${likeRate}% | 私信率 ${pmRate}% | 转化率 ${dealRate}%
当前推断阶段：${inferredStage}

## 你的输出

返回纯 JSON（无 markdown 包裹），结构如下：

{
  "schoolLevel": "A级(新生>8000且竞争≤2) / B级(3000-8000) / C级(新生较少)",
  "investmentLevel": "高 / 中 / 低（基于校区潜力和竞争判断）",
  "stageAnalysis": {
    "currentStage": "当前所处阶段（不是推断值，是结合数据和时间线的专业判断）",
    "stageGoal": "这个阶段的核心增长目标",
    "timeWindow": "这个阶段的时间窗口描述",
    "strategyBrief": "200字以内的阶段策略概述",
    "recommendedContent": ["5-8个结合当前阶段+学生心理的具体内容方向"],
    "focusActions": ["4-6个团队本周最该聚焦的动作"]
  },
  "diagnosis": [
    {
      "issue": "具体的数据问题（如：小红书曝光高但私信率仅0.3%）",
      "rootCause": "根因分析（结合校园场景和学生心理）",
      "impact": "对增长目标的量化影响",
      "suggestion": "可执行的改进建议"
    }
  ],
  "growthStrategy": {
    "trafficStrategy": "引流获客策略描述",
    "conversionStrategy": "私域转化策略描述",
    "platformStrategy": {
      "小红书": "小红书策略",
      "抖音": "抖音策略",
      "视频号": "视频号策略（如有数据）"
    },
    "contentRotation": "内容轮转建议"
  },
  "plan15Days": [
    每天一条（从今天起15天），格式：
    {
      "date": "YYYY-MM-DD",
      "phase": "预热 / 冲刺 / 转化 / 开学",
      "goal": "今日核心增长目标（如：拉高小红书曝光至3000+）",
      "contentDirection": "内容大方向（不是具体标题，是策略方向，如：宿舍攻略型内容）",
      "recommendedPlatform": "首推平台 或 多平台",
      "suggestedCount": 建议发布数量（数字，1-5）,
      "targetMetrics": {"曝光": 预估数, "私信": 预估数, "进群": 预估数},
      "personInCharge": "建议负责人角色"
    }
  ],
  "teamTasks": {
    "运营": ["策略级任务"],
    "内容": ["内容方向任务"],
    "发布": ["发布执行任务"],
    "校区负责人": ["管理任务"],
    "代理": ["执行任务"]
  },
  "risks": [
    {
      "risk": "风险描述",
      "level": "高 / 中 / 低",
      "probability": "发生概率评估",
      "trigger": "触发条件（量化，如：连续2天曝光<500）",
      "impact": "发生后的影响",
      "mitigation": "预防/缓解措施"
    }
  ],
  "prediction": {
    "exposure": 数（15天预计总曝光）,
    "privateMessages": 数（预计总私信）,
    "groups": 数（预计总进群）,
    "orders": 数（预计总成交）,
    "conversionRate": "百分比"
  }
}

## 铁律

1. 内容方向只给策略级选题方向（如"宿舍攻略型"），不生成具体标题和正文。标题/正文/话术由内容生成模块负责。
2. 策略必须基于输入数据动态推理，禁止照搬模板。
3. 运营节奏必须结合距离开学/军训/报到的时间线。
4. 所有建议聚焦校园场景：办卡、被子、兼职、跑腿、二手。
5. 非官方校园号定位，禁用"官方""指定""必须办理"。
6. 低预算自然流量为主，不推荐付费投放。
7. 写具体、可量化、可执行。`.trim();
}

export const CAMPUS_GROWTH_JSON_SCHEMA = {
  type: "object",
  properties: {
    schoolLevel: { type: "string" },
    investmentLevel: { type: "string" },
    stageAnalysis: {
      type: "object",
      properties: {
        currentStage: { type: "string" },
        stageGoal: { type: "string" },
        timeWindow: { type: "string" },
        strategyBrief: { type: "string" },
        recommendedContent: { type: "array", items: { type: "string" } },
        focusActions: { type: "array", items: { type: "string" } },
      },
    },
    diagnosis: {
      type: "array",
      items: {
        type: "object",
        properties: {
          issue: { type: "string" },
          rootCause: { type: "string" },
          impact: { type: "string" },
          suggestion: { type: "string" },
        },
      },
    },
    growthStrategy: {
      type: "object",
      properties: {
        trafficStrategy: { type: "string" },
        conversionStrategy: { type: "string" },
        platformStrategy: { type: "object" },
        contentRotation: { type: "string" },
      },
    },
    plan15Days: {
      type: "array",
      items: {
        type: "object",
        properties: {
          date: { type: "string" },
          phase: { type: "string" },
          goal: { type: "string" },
          contentDirection: { type: "string" },
          recommendedPlatform: { type: "string" },
          suggestedCount: { type: "number" },
          targetMetrics: { type: "object" },
          personInCharge: { type: "string" },
        },
      },
    },
    teamTasks: { type: "object" },
    risks: {
      type: "array",
      items: {
        type: "object",
        properties: {
          risk: { type: "string" },
          level: { type: "string" },
          probability: { type: "string" },
          trigger: { type: "string" },
          impact: { type: "string" },
          mitigation: { type: "string" },
        },
      },
    },
    prediction: {
      type: "object",
      properties: {
        exposure: { type: "number" },
        privateMessages: { type: "number" },
        groups: { type: "number" },
        orders: { type: "number" },
        conversionRate: { type: "string" },
      },
    },
  },
};
