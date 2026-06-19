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
  const bizList = [
    input.businesses.phoneCards && "电话卡",
    input.businesses.bedding && "被子",
    input.businesses.partTime && "兼职",
    input.businesses.errands && "跑腿",
    input.businesses.secondHand && "二手",
  ].filter(Boolean).join("、") || "无";

  const statsStr = input.socialStats
    .filter(s => s.accountCount > 0 || s.publishCount > 0)
    .map(s => `${s.platform}:${s.accountCount}号·曝光${s.exposure}·赞${s.likes}·私信${s.privateMessages}`)
    .join(" | ") || "新起号";

  return `你是校园增长运营专家。基于以下数据分析并返回JSON。

校:${input.school.name}${input.school.campusName ? `(${input.school.campusName})` : ""}
新生:${input.school.newStudents} 总:${input.school.totalStudents} 男女:${Math.round(input.school.maleRatio*100)}:${Math.round((1-input.school.maleRatio)*100)}
开学:${input.school.semesterStart} 竞争:${input.businesses.competitorCount}家
业务:${bizList} 往年成交:${input.businesses.lastYearDeals}人/${input.businesses.lastYearRate}
媒体:${statsStr}

返回JSON(不要markdown包裹):{"schoolLevel":"A/B/C级","investmentLevel":"高/中/低","diagnosis":[{"issue":"问题","reason":"原因","suggestion":"建议"}],"stageAnalysis":{"currentStage":"预热期/爆发期/转化期","stageGoal":"目标","recommendedContent":["宿舍攻略"],"focusActions":["起号"]},"plan15Days":[{"date":"MM-DD","goal":"目标","platformTasks":[{"platform":"小红书","title":"选题","direction":"方向"}],"commentGuide":"评论引导","dmScript":"私信话术","personInCharge":"运营","expectedExposure":100},{"date":"MM-DD","goal":"目标","platformTasks":[{"platform":"抖音","title":"选题","direction":"方向"}],"commentGuide":"评论引导","dmScript":"私信话术","personInCharge":"运营","expectedExposure":200}],"privateDomain":{"commentGuides":["引导私信"],"dmScripts":["回复话术"],"groupScript":"进群话术","closingTips":["成交技巧"]},"teamTasks":{"运营":["日更2条"],"剪辑":["剪视频"],"发布":["多平台分发"],"校区负责人":["监督质量"],"代理":["评论区互动"]},"risks":[{"risk":"曝光不足","level":"中","trigger":"单条<500曝光","solution":"增加发布频率"}],"prediction":{"exposure":3000,"privateMessages":150,"groups":80,"orders":20,"conversionRate":"5%"}}
A级=新生>8000且竞争≤2 B级=3000-8000 C级=<3000。禁止大预算方案。校园场景。`.trim();
}
