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
${input.socialStats.filter(s => s.accountCount > 0 || s.publishCount > 0).length ? input.socialStats.filter(s => s.accountCount > 0 || s.publishCount > 0).map(s => `${s.platform}:${s.accountCount}号·${s.exposure}曝光·${s.likes}赞·${s.privateMessages}私信`).join(" | ") : "新起号，无历史数据"}

## 输出要求
直接返回 JSON（无 markdown 包裹），包含以下字段：

1. schoolLevel: A级(新生>8000且竞争≤2)/B级(3000-8000)/C级(<3000)
2. investmentLevel: 高/中/低
3. diagnosis: [{issue, reason, suggestion}] (3条)
4. stageAnalysis: {currentStage, stageGoal, recommendedContent:[], focusActions:[]}
5. plan15Days: [{date:"MM-DD", goal, platformTasks:[{platform,title,direction}], commentGuide, dmScript, personInCharge, expectedExposure}] (15条)
6. privateDomain: {commentGuides:[], dmScripts:[], groupScript, closingTips:[]}
7. teamTasks: {运营:[], 剪辑:[], 发布:[], 校区负责人:[], 代理:[]}
8. risks: [{risk, level:"高/中/低", trigger, solution}] (2-3条)
9. prediction: {exposure, privateMessages, groups, orders, conversionRate}

约束：非官方校园号定位 | 禁止大预算方案 | 低预算自然流量 | 电话卡/被子/兼职场景`;
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
