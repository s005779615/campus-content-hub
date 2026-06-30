type DiagnosticStat = {
  platform?: string;
  accountCount?: number;
  publishCount?: number;
  exposure?: number;
  plays?: number;
  likes?: number;
  favorites?: number;
  comments?: number;
  privateMessages?: number;
  groups?: number;
  leads?: number;
  deals?: number;
};

export function campusGrowthDiagnosticPrompt(input: {
  school: { name?: string | null; campusName?: string | null; semesterStart?: string | null };
  confirmedPositionings: unknown[];
  socialStats: DiagnosticStat[];
}) {
  const stats = input.socialStats.length
    ? input.socialStats.map((item) => JSON.stringify(item)).join("\n")
    : "数据未提供";

  return `
你是校园账号数据诊断专家。只诊断当前账号运营问题，不生成长期计划，不生成具体内容。

必须判断：
- 是内容方向问题、平台选择问题、发布频率问题、账号定位问题、流量问题、承接问题，还是转化问题。
- 有数据时结合发布数量、曝光/播放、点赞、收藏、评论、私信、进群、留资、成交。
- 缺少关键数据时写“数据未提供”，不得编造数据。
- 不得输出完整标题、完整文案、脚本、分镜、评论话术或私信话术。

学校：${input.school.name || "数据未提供"}
校区：${input.school.campusName || "数据未提供"}
开学日期：${input.school.semesterStart || "数据未提供"}

已确认账号定位：
${JSON.stringify(input.confirmedPositionings, null, 2)}

平台数据：
${stats}

输出纯 JSON：
{
  "coreProblem": "核心问题",
  "trafficProblem": "流量问题",
  "engagementProblem": "互动问题",
  "privateMessageProblem": "私信问题",
  "groupProblem": "进群问题",
  "conversionProblem": "转化问题",
  "dataAnomalies": ["数据异常或数据未提供"],
  "topPriority": "当前最优先解决的问题"
}
`.trim();
}
