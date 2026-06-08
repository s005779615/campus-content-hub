import { safetyInstruction } from "@/lib/content-policy";
import type {
  DouyinOutput,
  GeneratePayload,
  GeneratedOutput,
  SchoolRecord,
  VideoChannelOutput,
  XiaohongshuOutput
} from "@/lib/types";

type GenerationContext = GeneratePayload & {
  school: SchoolRecord;
};

type AiProvider = "template" | "doubao" | "openai";

type ChatCompletionProvider = {
  provider: Exclude<AiProvider, "template">;
  label: string;
  apiKey: string;
  endpoint: string;
  model: string;
  maxTokensField: "max_tokens" | "max_completion_tokens";
  supportsJsonMode: boolean;
};

export type FriendlyModelInfo = {
  displayName: string;
  description: string;
  strengths: string[];
};

export type AiProviderStatus = {
  provider: AiProvider;
  label: string;
  configured: boolean;
  model: string;
  friendly: FriendlyModelInfo;
};

/** 把技术模型 ID 映射为面向运营团队的友好名称和技能定位 */
function getFriendlyModelInfo(model: string, provider: AiProvider): FriendlyModelInfo {
  const lower = model.toLowerCase();

  if (provider === "doubao") {
    if (lower.includes("deepseek")) {
      return {
        displayName: "深度爆款版",
        description: "深度理解平台推荐算法，精准洞察高校新生行为偏好，生成高互动、高转化的爆款内容。适合打造差异化选题和强共鸣文案。",
        strengths: ["平台算法机制", "新生人群洞察", "高转化文案", "爆款选题策划", "评论区互动引导"]
      };
    }
    if (lower.includes("doubao")) {
      return {
        displayName: "校园灵感版",
        description: "快节奏校园攻略生成，擅长开学必备清单、宿舍探店测评、小红书种草风格。适合日常高频更新和视觉化内容创意。",
        strengths: ["开学季攻略", "宿舍好物清单", "食堂探店测评", "小红书种草文", "校园周边指南"]
      };
    }
  }

  if (provider === "openai") {
    return {
      displayName: "通用创作版",
      description: "通用型内容生成，可根据不同平台和场景灵活适配。",
      strengths: ["多平台适配", "灵活风格切换", "通用场景覆盖"]
    };
  }

  return {
    displayName: "基础模板",
    description: "基于学校资料本地生成，不依赖外部 AI，作为兜底方案。",
    strengths: ["基础覆盖", "离线可用", "零成本"]
  };
}

export function getAiProviderStatus(): AiProviderStatus {
  const provider = resolveAiProvider();

  if (provider === "doubao") {
    const apiKey = getDoubaoApiKey();
    const model = process.env.DOUBAO_MODEL ?? "doubao-seed-2-0-lite-260215";
    return {
      provider,
      label: "豆包 / 火山方舟",
      configured: Boolean(apiKey),
      model,
      friendly: getFriendlyModelInfo(model, provider)
    };
  }

  if (provider === "openai") {
    const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
    return {
      provider,
      label: "OpenAI",
      configured: Boolean(process.env.OPENAI_API_KEY),
      model,
      friendly: getFriendlyModelInfo(model, provider)
    };
  }

  return {
    provider,
    label: "本地模板",
    configured: true,
    model: "template",
    friendly: getFriendlyModelInfo("template", provider)
  };
}

export async function generateCampusContent(
  context: GenerationContext
): Promise<GeneratedOutput> {
  const provider = getChatCompletionProvider();

  if (!provider) {
    return generateFallbackContent(context);
  }

  return generateWithChatCompletions(context, provider);
}

function resolveAiProvider(): AiProvider {
  const configured = process.env.AI_PROVIDER?.trim().toLowerCase();

  if (configured === "doubao" || configured === "openai" || configured === "template") {
    return configured;
  }

  if (getDoubaoApiKey()) {
    return "doubao";
  }

  if (process.env.OPENAI_API_KEY) {
    return "openai";
  }

  return "template";
}

function getDoubaoApiKey() {
  return process.env.DOUBAO_API_KEY || process.env.ARK_API_KEY;
}

function normalizeChatEndpoint(baseUrl: string) {
  const trimmed = baseUrl.replace(/\/+$/, "");

  if (trimmed.endsWith("/chat/completions")) {
    return trimmed;
  }

  return `${trimmed}/chat/completions`;
}

function getChatCompletionProvider(): ChatCompletionProvider | null {
  const provider = resolveAiProvider();

  if (provider === "template") {
    return null;
  }

  if (provider === "doubao") {
    const apiKey = getDoubaoApiKey();

    if (!apiKey) {
      throw new Error("豆包 API Key 未配置。请在 Vercel 环境变量中设置 DOUBAO_API_KEY 或 ARK_API_KEY。");
    }

    return {
      provider,
      label: "豆包 / 火山方舟",
      apiKey,
      endpoint: normalizeChatEndpoint(
        process.env.DOUBAO_BASE_URL ?? "https://ark.cn-beijing.volces.com/api/v3"
      ),
      model: process.env.DOUBAO_MODEL ?? "doubao-seed-2-0-lite-260215",
      maxTokensField: "max_completion_tokens",
      supportsJsonMode: false
    };
  }

  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OpenAI API Key 未配置。请设置 OPENAI_API_KEY，或把 AI_PROVIDER 改为 doubao/template。");
  }

  return {
    provider,
    label: "OpenAI",
    apiKey: process.env.OPENAI_API_KEY,
    endpoint: normalizeChatEndpoint(process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1"),
    model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
    maxTokensField: "max_tokens",
    supportsJsonMode: true
  };
}

async function generateWithChatCompletions(
  context: GenerationContext,
  provider: ChatCompletionProvider
) {
  const prompt = buildPrompt(context);
  const body: Record<string, unknown> = {
    model: provider.model,
    temperature: 0.82,
    messages: [
      {
        role: "system",
        content:
          "你是校园内容运营助手，只输出可解析 JSON，不输出 Markdown。严格遵守合规边界，不冒充官方、老师、辅导员。"
      },
      { role: "user", content: prompt }
    ]
  };
  body[provider.maxTokensField] = 2600;

  if (provider.supportsJsonMode) {
    body.response_format = { type: "json_object" };
  }

  // DeepSeek 推理模型需要显式启用 thinking，否则火山方舟会报错：
  // "thinking options type cannot be disabled when reasoning_effort is set"
  if (provider.model.toLowerCase().includes("deepseek")) {
    body.thinking = { type: "enabled" };
  }

  const response = await fetch(provider.endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${provider.apiKey}`
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`${provider.label} 调用失败：${response.status}${detail ? ` ${detail.slice(0, 160)}` : ""}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{
      message?: {
        content?: string;
        reasoning_content?: string;
      };
    }>;
  };
  const msg = data.choices?.[0]?.message;
  let content = msg?.content;

  // DeepSeek 等推理模型可能把实际内容放在 reasoning_content
  if (!content && msg?.reasoning_content) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[AI] content 为空，回退使用 reasoning_content");
    }
    content = msg.reasoning_content;
  }

  if (!content) {
    throw new Error(`${provider.label} 返回内容为空。`);
  }

  return parseGeneratedJson(content, provider.label) as GeneratedOutput;
}

function parseGeneratedJson(content: string, providerLabel: string) {
  const cleaned = content
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");

    if (firstBrace >= 0 && lastBrace > firstBrace) {
      return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
    }

    throw new Error(`${providerLabel} 返回内容不是合法 JSON，请稍后重试。`);
  }
}

function buildPrompt(context: GenerationContext) {
  const { school, platform, contentType, contentGoal, tone } = context;
  const variationAngles = [
    "先讲新生最容易踩的坑，再给清单",
    "先从宿舍和到校当天的真实场景切入",
    "先用一个反常识提醒开头，再给行动建议",
    "先按时间线写报到前、报到当天、入住后",
    "先用评论区常见问题的口吻组织内容"
  ];
  const variationAngle =
    variationAngles[Math.floor(Math.random() * variationAngles.length)] ?? variationAngles[0];

  const schoolFacts = [
    ["学校名称", school.name],
    ["校区", school.campus_name],
    ["城市", school.city],
    ["宿舍情况", school.dormitory_info],
    ["食堂情况", school.cafeteria_info],
    ["周边美食", school.nearby_food],
    ["周边娱乐", school.nearby_fun],
    ["新生报到注意事项", school.registration_notes],
    ["开学必备用品", school.essentials],
    ["校园卡办理注意事项", school.campus_card_notes],
    ["被子/床品需求场景", school.bedding_scenarios],
    ["常见新生问题", school.freshman_faq]
  ]
    .filter(([, value]) => Boolean(value))
    .map(([key, value]) => `${key}：${value}`)
    .join("\n");

  const format =
    platform === "小红书"
      ? `JSON 字段：titles(5个字符串)、coverText、body、imageIdeas(6个字符串)、tags(10个字符串)、commentGuide、dmGuide。`
      : platform === "抖音"
        ? `JSON 字段：hook3s、script15s、script30s、storyboard(分镜数组)、shootingIdeas(拍摄建议数组)、subtitles(字幕数组)、publishTitle、commentGuide。`
        : `JSON 字段：videoTitle、videoBody、momentsCopy、privateGuide。`;

  return `${safetyInstruction(school.banned_phrases)}

请为以下校园账号生成 ${platform} 内容。
内容类型：${contentType}
内容目标：${contentGoal}
语气风格：${tone}
本次差异化角度：${variationAngle}

学校资料：
${schoolFacts}

${format}
内容质量要求：
1. 必须像真实学长学姐经验，避免空话、套话和重复句式。
2. 尽量引用学校资料中的宿舍、食堂、周边、报到、校园卡、床品信息；资料没有写的地方要用“建议提前确认”，不要编造事实。
3. 标题和脚本角度要彼此不同，至少覆盖避坑、清单、校区生活、私信咨询、转化引导中的多个角度。
4. 涉及校园卡、床品、开学用品时，只能写“按个人需要了解”“对比资费/尺寸/配送/售后”“以实际规则为准”，不能写官方指定、必须办理、内部渠道、保证通过。
5. 输出必须是纯 JSON 对象，字段名严格按上面的格式，不要输出 Markdown、解释文字或代码块。`;
}

function generateFallbackContent(context: GenerationContext): GeneratedOutput {
  if (context.platform === "小红书") {
    return generateXiaohongshu(context);
  }

  if (context.platform === "抖音") {
    return generateDouyin(context);
  }

  return generateVideoChannel(context);
}

function schoolLabel(school: SchoolRecord) {
  return [school.name, school.campus_name].filter(Boolean).join(" ");
}

function generateXiaohongshu(context: GenerationContext): XiaohongshuOutput {
  const { school, contentType, contentGoal, tone } = context;
  const label = schoolLabel(school);
  const campusDetail = school.campus_name ? `${school.campus_name}校区` : school.city;

  return {
    titles: [
      `${label}新生${contentType}，先看这篇再决定`,
      `刚到${campusDetail}，这些地方建议提前了解`,
      `${school.name}学长学姐版${contentType}清单`,
      `新生别急着买，${label}这些信息先收藏`,
      `${school.city}新生生活攻略：${contentType}篇`
    ],
    coverText: `${school.name}新生${contentType}\n学长学姐经验版`,
    body: `给准备来${label}的新生整理一版${contentType}。这篇是非官方校园生活分享，主要是学长学姐视角，帮大家少踩坑、少花冤枉时间。\n\n宿舍情况：${school.dormitory_info || "建议到校前先问清楚自己所在楼栋和床位尺寸。"}\n\n食堂和周边：${school.cafeteria_info || "开学前几天人会比较多，可以错峰吃饭。"}${school.nearby_food ? `附近可以关注：${school.nearby_food}。` : ""}\n\n报到提醒：${school.registration_notes || "证件、录取材料、常用药和充电设备建议单独放好。"}\n\n开学用品：${school.essentials || "先带高频必需品，大件物品可以到校后根据宿舍实际情况再补。"}\n\n${school.campus_card_notes ? `校园卡相关：${school.campus_card_notes}。建议按个人需要了解套餐、信号和资费，别被催着立刻决定。\n\n` : ""}${school.bedding_scenarios ? `被子床品：${school.bedding_scenarios}。床品要重点确认尺寸、厚度和到校搬运是否方便。\n\n` : ""}如果你也是今年新生，可以把自己的学院/校区发在评论区，我后面按校区继续整理。`,
    imageIdeas: [
      `${school.name}校门或路牌，画面干净，突出学校识别`,
      `宿舍楼外观或寝室收纳角度，避免拍到隐私信息`,
      `食堂窗口和热门菜品拼图`,
      `校园周边地图截图风格，标注吃饭和采购点`,
      `开学用品平铺图，分证件/生活/军训/收纳`,
      `评论区问题截图风格，做成新生问答封面`
    ],
    tags: [
      school.name,
      `${school.city}大学生`,
      "新生攻略",
      "开学季",
      "校园生活",
      contentType,
      "宿舍生活",
      "学长学姐建议",
      "新生避坑",
      contentGoal === "成交转化" ? "开学准备" : "大学新生"
    ],
    commentGuide: `评论区可以留“${school.name}+校区”，我按大家问得多的点继续整理。`,
    dmGuide:
      tone === "强转化口吻"
        ? "需要开学用品/床品/校园卡信息的同学，可以私信我说一下校区和需求，我发你整理好的对比清单。"
        : "如果不确定该带什么，可以私信校区，我把新生常问清单发你参考。"
  };
}

function generateDouyin(context: GenerationContext): DouyinOutput {
  const { school, contentType, tone } = context;
  const label = schoolLabel(school);

  return {
    hook3s: `今年来${school.name}的新生，${contentType}先别乱准备。`,
    script15s: `今年来${label}的新生看这里。第一，报到材料和常用物品先分袋装好。第二，宿舍用品不要盲目买大件，先确认床位尺寸和楼栋情况。第三，校园卡、床品这类信息按个人需要了解，重点看资费、尺寸和售后。想要清单，评论区留校区。`,
    script30s: `今年来${label}的新生，开学前可以先做三件事。\n第一，看清楚报到时间和材料，证件类单独放，别和生活用品混在一起。\n第二，宿舍用品先买高频必需品，床品、收纳、大件电器最好结合实际宿舍情况决定。\n第三，校园卡和开学用品不要被催着立刻选，先对比资费、信号、尺寸、配送和售后。\n这条是非官方校园生活经验整理，想看你们校区版本，评论区发校区。`,
    storyboard: [
      "0-3秒：镜头对准校门或录取通知书，字幕抛出新生问题",
      "3-8秒：展示证件袋、充电器、常用药等必备物品",
      "8-15秒：切到宿舍收纳或床位尺寸示意",
      "15-24秒：展示校园卡/床品/开学用品对比表",
      "24-30秒：人物出镜总结，引导评论校区"
    ],
    shootingIdeas: [
      "优先竖屏手持，画面真实，不要过度包装",
      "用校园门口、食堂、宿舍楼外景做转场",
      "表格镜头停留 1-2 秒，方便观众截图",
      "涉及办理和购买时，用“按个人需要了解”表达"
    ],
    subtitles: [
      `${school.name}新生先收藏`,
      "证件材料单独装",
      "床品先确认尺寸",
      "校园卡先看资费和信号",
      "评论区留校区，继续整理"
    ],
    publishTitle:
      tone === "避坑攻略口吻"
        ? `${school.name}新生避坑：${contentType}别急着乱准备`
        : `${school.name}新生${contentType}，学长学姐经验版`,
    commentGuide: "评论区发“学校+校区”，下一条按校区继续整理。"
  };
}

function generateVideoChannel(context: GenerationContext): VideoChannelOutput {
  const { school, contentType } = context;
  const label = schoolLabel(school);

  return {
    videoTitle: `${label}新生${contentType}经验整理`,
    videoBody: `这是一份非官方校园生活攻略，适合准备到${label}报到的新生参考。重点看报到材料、宿舍实际情况、开学用品取舍，以及校园卡/床品等信息是否符合个人需要。`,
    momentsCopy: `${school.name}新生可以先收藏这份${contentType}，按校区和宿舍情况再做准备，别一上来就买一堆用不上的东西。`,
    privateGuide: "需要按校区整理清单的同学，可以私信校区和需求，我发你参考版。"
  };
}
