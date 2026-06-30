type AccountForPositioning = {
  id: string;
  platform: string;
  account_name: string;
  account_id?: string | null;
  account_link?: string | null;
  account_positioning?: string | null;
  daily_publish_target?: number | null;
  profiles?: { full_name?: string | null; email?: string | null } | null;
};

type SchoolForPositioning = {
  name?: string | null;
  campus_name?: string | null;
  city?: string | null;
  dormitory_info?: string | null;
  registration_notes?: string | null;
  essentials?: string | null;
  campus_card_notes?: string | null;
  bedding_scenarios?: string | null;
  freshman_faq?: string | null;
};

export function campusAccountPositionerPrompt(input: {
  school: SchoolForPositioning;
  accounts: AccountForPositioning[];
  mode: "single" | "matrix";
}) {
  const school = input.school;
  const accounts = input.accounts
    .map((account) =>
      [
        `账号ID:${account.id}`,
        `平台:${account.platform}`,
        `账号名:${account.account_name}`,
        `已有定位:${account.account_positioning || "数据未提供"}`,
        `负责人:${account.profiles?.full_name || account.profiles?.email || "数据未提供"}`,
        `主页:${account.account_link || "数据未提供"}`,
        `每日目标:${account.daily_publish_target || "数据未提供"}`
      ].join("；")
    )
    .join("\n");

  return `
你是校园账号矩阵定位专家。请根据学校、校区、平台、账号名和负责人，为每个账号生成可执行但不重复的账号定位。

核心要求：
- 只做账号定位和运营方向，不生成完整标题、完整文案、视频脚本、分镜、评论话术或私信话术。
- 不得编造学校人数、开学日期或账号历史数据。缺少数据时写“数据未提供”。
- 同一校区账号必须差异化，不得所有账号使用同一定位。
- 小红书侧重搜索、收藏、新生攻略、清单、避坑、真实校园信息。
- 抖音侧重真实校园画面、节奏、前几秒吸引力、情绪/反差/现场感。
- 视频号侧重真实感、信任感、家长关注、答疑和社群转化。

学校资料：
- 学校：${school.name || "数据未提供"}
- 校区：${school.campus_name || "数据未提供"}
- 城市：${school.city || "数据未提供"}
- 宿舍：${school.dormitory_info || "数据未提供"}
- 报到注意：${school.registration_notes || "数据未提供"}
- 开学用品：${school.essentials || "数据未提供"}
- 校园卡注意：${school.campus_card_notes || "数据未提供"}
- 被子/床品场景：${school.bedding_scenarios || "数据未提供"}
- 新生常见问题：${school.freshman_faq || "数据未提供"}

账号列表：
${accounts || "数据未提供"}

输出纯 JSON：
{
  "accounts": [
    {
      "accountId": "必须等于输入账号ID",
      "platform": "小红书/抖音/视频号",
      "accountName": "账号名",
      "owner": "负责人或数据未提供",
      "accountPersona": "账号人设",
      "targetStudents": "目标学生群体",
      "mainGoal": "主要运营目标",
      "secondaryGoal": "辅助目标",
      "contentDirections": ["3至5个内容方向，只写方向"],
      "recommendedFormats": ["推荐内容形式"],
      "publishFrequency": "发布频率",
      "publishTimeSlots": ["发布时间段"],
      "trafficPath": "引流路径，只写路径不写话术",
      "differentiation": "与同校区其他账号的差异",
      "positioningReason": "定位理由"
    }
  ],
  "matrixSummary": "账号矩阵整体分工说明"
}
`.trim();
}
