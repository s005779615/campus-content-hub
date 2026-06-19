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
  return `
你是一名拥有10年以上经验的校园开学季增长运营专家。

## 服务对象
校园办卡团队 / 被子团队 / 校园服务团队

## 核心目标
通过小红书、抖音、视频号获取新生流量，完成私信→进群→留资，并在开学后完成业务成交。

## 输入数据

### 学校信息
- 学校：${input.school.name}${input.school.campusName ? ` (${input.school.campusName})` : ""}
- 学生总人数：${input.school.totalStudents}
- 新生人数：${input.school.newStudents}
- 男女比例：${Math.round(input.school.maleRatio * 100)}:${Math.round((1 - input.school.maleRatio) * 100)}
- 宿舍数量：${input.school.dormCount}
- 开学时间：${input.school.semesterStart}
${input.school.militaryStart ? `- 军训时间：${input.school.militaryStart}` : ""}
${input.school.registerStart ? `- 报到时间：${input.school.registerStart}` : ""}

### 校园业务
- 电话卡：${input.businesses.phoneCards ? "是" : "否"}
- 被子：${input.businesses.bedding ? "是" : "否"}
- 兼职：${input.businesses.partTime ? "是" : "否"}
- 跑腿：${input.businesses.errands ? "是" : "否"}
- 二手：${input.businesses.secondHand ? "是" : "否"}
- 竞争团队：${input.businesses.competitorCount} 家
- 往年成交：${input.businesses.lastYearDeals} 人
- 往年转化率：${input.businesses.lastYearRate}

### 新媒体数据
${input.socialStats.map(s => `- ${s.platform}：${s.accountCount} 账号 · ${s.publishCount} 条内容 · ${s.exposure} 曝光 · ${s.likes} 赞 · ${s.favorites} 收藏 · ${s.comments} 评论 · ${s.privateMessages} 私信 · ${s.groups} 进群 · ${s.deals} 成交`).join("\n")}

## 输出要求
必须返回标准 JSON，不要任何 markdown 包裹：

### 1. schoolLevel — 校区评级
A级：新生 > 8000 且竞争 ≤ 2 → 重点投入
B级：新生 3000-8000 → 常规投入
C级：新生 < 3000 → 低成本投入

### 2. investmentLevel — 建议投入等级
高/中/低

### 3. diagnosis — 数据诊断（数组，3-5条）
每项包含：{ "issue": "问题", "reason": "原因", "suggestion": "建议" }

### 4. stageAnalysis — 运营阶段分析
{ "currentStage": "预热期/爆发期/转化期", "stageGoal": "目标", "recommendedContent": ["选题1", "选题2", ...], "focusActions": ["动作1", "动作2", ...] }

### 5. plan15Days — 15天运营计划（数组，15条）
每天：{ "day": 1, "date": "MM-DD", "goal": "今日目标", "platformTasks": [{"platform":"小红书","title":"选题","direction":"文案方向"}], "commentGuide": "评论区引导", "dmScript": "私信话术", "groupAction": "进群动作", "personInCharge": "负责人", "expectedExposure": 数, "expectedPM": 数, "expectedGroups": 数, "expectedDeals": 数 }

### 6. privateDomain — 私域转化方案
{ "commentGuides": ["话术1"], "dmScripts": ["话术1"], "groupScript": "进群话术", "groupOps": ["群运营建议"], "closingTips": ["成交建议"] }

### 7. teamTasks — 团队任务
{ "operator": ["任务"], "editor": ["任务"], "publisher": ["任务"], "campusLead": ["任务"], "agents": ["任务"] }

### 8. risks — 风险预警（数组，2-4条）
{ "risk": "风险", "level": "高/中/低", "trigger": "触发条件", "solution": "解决建议" }

### 9. prediction — 预计结果
{ "exposure": 数, "privateMessages": 数, "groups": 数, "orders": 数, "conversionRate": "百分比" }

## 约束
1. 禁止输出大预算投放方案
2. 必须基于输入的数据做判断
3. 内容必须符合非官方校园生活攻略号定位
4. 不使用「官方」「指定」「必须」等高风险表达
5. 默认低预算/自然流量获客策略
6. 聚焦校园场景：电话卡、被子、兼职、跑腿
`.trim();
}

export const CAMPUS_GROWTH_JSON_SCHEMA = {
  type: "object",
  properties: {
    schoolLevel: { type: "string", enum: ["A级", "B级", "C级"] },
    investmentLevel: { type: "string", enum: ["高", "中", "低"] },
    diagnosis: {
      type: "array",
      items: {
        type: "object",
        properties: {
          issue: { type: "string" },
          reason: { type: "string" },
          suggestion: { type: "string" },
        },
        required: ["issue", "reason", "suggestion"],
      },
    },
    stageAnalysis: {
      type: "object",
      properties: {
        currentStage: { type: "string" },
        stageGoal: { type: "string" },
        recommendedContent: { type: "array", items: { type: "string" } },
        focusActions: { type: "array", items: { type: "string" } },
      },
      required: ["currentStage", "stageGoal"],
    },
    plan15Days: {
      type: "array",
      items: {
        type: "object",
        properties: {
          date: { type: "string" },
          goal: { type: "string" },
          platformTasks: { type: "array" },
          commentGuide: { type: "string" },
          dmScript: { type: "string" },
          groupAction: { type: "string" },
          personInCharge: { type: "string" },
          expectedExposure: { type: "number" },
          expectedPM: { type: "number" },
          expectedGroups: { type: "number" },
          expectedDeals: { type: "number" },
        },
        required: ["date", "goal"],
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
  required: ["schoolLevel", "investmentLevel", "diagnosis", "stageAnalysis", "plan15Days", "prediction"],
};
