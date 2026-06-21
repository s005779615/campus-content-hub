/**
 * Campus Growth Diagnostic AI — 校园运营诊断专家
 *
 * 定位：只做数据分析 + 找问题 + 给优化方向。
 * 禁止：内容生成、文案、脚本、排期。
 */

export function campusGrowthPlannerPrompt(input: {
  school: {
    name: string;
    campusName?: string;
    totalStudents: number;
    newStudents: number;
    semesterStart: string;
  };
  businesses: {
    phoneCards: boolean;
    bedding: boolean;
    partTime: boolean;
    errands: boolean;
    secondHand: boolean;
    competitorCount: number;
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
  const s = input.school;
  const b = input.businesses;
  const bizList = [b.phoneCards && "电话卡", b.bedding && "被子", b.partTime && "兼职", b.errands && "跑腿", b.secondHand && "二手"].filter(Boolean);
  const hasData = input.socialStats?.some((x: any) => x.accountCount > 0 || x.publishCount > 0);

  // 计算各平台关键指标
  const platformStats = input.socialStats
    .filter(x => x.exposure > 0)
    .map(x => {
      const playRate = x.publishCount > 0 ? (x.exposure / x.publishCount) : 0;
      const likeRate = x.exposure > 0 ? (x.likes / x.exposure * 100) : 0;
      const favRate = x.exposure > 0 ? (x.favorites / x.exposure * 100) : 0;
      const commentRate = x.exposure > 0 ? (x.comments / x.exposure * 100) : 0;
      const pmRate = x.exposure > 0 ? (x.privateMessages / x.exposure * 100) : 0;
      const dealRate = x.groups > 0 ? (x.deals / x.groups * 100) : 0;
      return `  ${x.platform}(${x.accountCount}号): ${x.publishCount}条 均播${Math.round(playRate)} 赞率${likeRate.toFixed(1)}% 藏率${favRate.toFixed(1)}% 评率${commentRate.toFixed(1)}% 私信率${pmRate.toFixed(2)}% 转化率${dealRate.toFixed(1)}% | 进群${x.groups} 成交${x.deals}`;
    }).join("\n");

  // 距离开学天数
  const today = new Date();
  const semDate = s.semesterStart ? new Date(s.semesterStart) : null;
  const daysToSemester = semDate ? Math.ceil((semDate.getTime() - today.getTime()) / 86400000) : null;

  return `你是校园账号运营诊断专家。只分析数据找问题给方向，不输出内容/文案/脚本/排期。

## 输入数据

校名：${s.name}${s.campusName ? `（${s.campusName}）` : ""}
新生 ${s.newStudents} / 总 ${s.totalStudents}${semDate ? ` | 开学${s.semesterStart} | 距开学${daysToSemester}天` : " | 开学时间：未设置（请补充）"}
业务：${bizList.length ? bizList.join("、") : "未选"} | 竞争${b.competitorCount || 0}队

${hasData ? `平台数据：\n${platformStats}` : "暂无平台数据"}

## 输出要求

返回纯JSON：

{
  "summary": "一句话总结当前核心问题（不超过30字）",
  "issues": {
    "traffic": "流量问题分析：播放量/曝光为什么低（平台机制+内容结构+用户兴趣三维度分析）",
    "engagement": "互动问题分析：点赞/收藏/评论为什么低",
    "conversion": "转化问题分析：私信/进群/成交为什么少"
  },
  "platformDiagnosis": {
    "抖音": "抖音侧问题判断（完播率/互动率/标题吸引力/推荐机制方面的问题）",
    "小红书": "小红书侧问题判断（封面/标题/收藏率/搜索排名等方面的问题）"
  },
  "rootCause": "根本原因分析（2-3个深层原因，不做执行建议）",
  "optimizationDirection": {
    "contentAngle": "内容方向应该怎么调整（类型级，不是标题）",
    "userPsychology": "当前用户心理和注意力焦点判断",
    "platformFit": "内容和平台的适配问题"
  }
}
非官方校园号 | 低预算自然流 | 不输出内容/排期/预算`.trim();
}
