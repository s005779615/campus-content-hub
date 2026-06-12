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
  id: string;
  displayName: string;
  description: string;
  strengths: string[];
};

export type AiProviderStatus = {
  provider: AiProvider;
  label: string;
  configured: boolean;
  model: string;
  models: FriendlyModelInfo[];
  friendly: FriendlyModelInfo;
};

// ---- 模型注册表：所有可用模型定义在这里 ----
const KNOWN_MODELS: Record<string, FriendlyModelInfo> = {
  "deepseek-v4-pro-260425": {
    id: "deepseek-v4-pro-260425",
    displayName: "深度爆款版",
    description: "DeepSeek V4 Pro，深度推理爆款选题，精准洞察新生行为偏好，生成高互动高转化内容。",
    strengths: ["平台算法机制", "新生人群洞察", "高转化文案", "爆款选题策划", "评论区互动引导"]
  },
  "deepseek-v4-flash-260425": {
    id: "deepseek-v4-flash-260425",
    displayName: "极速版",
    description: "DeepSeek V4 Flash，快速生成校园攻略，适合日常高频更新的轻量级内容。",
    strengths: ["快速生成", "日常高频", "轻量攻略", "标题创作", "短文案"]
  },
  "doubao-seed-2-0-lite-260215": {
    id: "doubao-seed-2-0-lite-260215",
    displayName: "校园灵感版",
    description: "豆包 Seed 2.0 Lite，擅长开学必备清单、宿舍探店测评、小红书种草风格。适合日常高频更新和视觉化内容创意。",
    strengths: ["开学季攻略", "宿舍好物清单", "食堂探店测评", "小红书种草文", "校园周边指南"]
  },
  "gpt-4o-mini": {
    id: "gpt-4o-mini",
    displayName: "通用创作版",
    description: "通用型内容生成，可根据不同平台和场景灵活适配。",
    strengths: ["多平台适配", "灵活风格切换", "通用场景覆盖"]
  },
  "gpt-4o": {
    id: "gpt-4o",
    displayName: "通用旗舰版",
    description: "OpenAI 旗舰模型，复杂推理和长文创作能力最强。",
    strengths: ["复杂推理", "深度长文", "多语言", "创意写作"]
  }
};

/** 获取可用的模型列表（根据当前 provider 和配置） */
export function getAvailableModels(): FriendlyModelInfo[] {
  const provider = resolveAiProvider();

  if (provider === "template") {
    return [{
      id: "template",
      displayName: "基础模板",
      description: "基于学校资料本地生成，不依赖外部 AI。",
      strengths: ["基础覆盖", "离线可用", "零成本"]
    }];
  }

  if (provider === "doubao") {
    // 豆包 provider 下，DeepSeek 和豆包模型都可用（同一火山方舟 API）
    const configuredModel = process.env.DOUBAO_MODEL ?? "deepseek-v4-pro-260425";
    return [
      KNOWN_MODELS["deepseek-v4-pro-260425"],
      KNOWN_MODELS["doubao-seed-2-0-lite-260215"],
    ].filter(Boolean).map(m => ({ ...m, isDefault: m.id === configuredModel }));
  }

  if (provider === "openai") {
    const configuredModel = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
    return [
      KNOWN_MODELS["gpt-4o-mini"],
      KNOWN_MODELS["gpt-4o"],
    ].filter(Boolean).map(m => ({ ...m, isDefault: m.id === configuredModel }));
  }

  return [];
}

/** 根据模型 ID 获取友好信息 */
function getFriendlyModelInfo(model: string, provider: AiProvider): FriendlyModelInfo {
  // 先查注册表
  if (KNOWN_MODELS[model]) {
    return { ...KNOWN_MODELS[model], id: model };
  }

  // 模糊匹配
  const lower = model.toLowerCase();
  if (provider === "doubao") {
    if (lower.includes("deepseek") && lower.includes("pro")) return { ...KNOWN_MODELS["deepseek-v4-pro-260425"], id: model };
    if (lower.includes("deepseek") && (lower.includes("flash") || lower.includes("v4"))) return { ...KNOWN_MODELS["deepseek-v4-flash-260425"], id: model };
    if (lower.includes("doubao")) return { ...KNOWN_MODELS["doubao-seed-2-0-lite-260215"], id: model };
  }

  // 兜底
  return {
    id: model,
    displayName: model,
    description: "当前使用的 AI 模型。",
    strengths: ["内容生成"]
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
      models: getAvailableModels(),
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
      models: getAvailableModels(),
      friendly: getFriendlyModelInfo(model, provider)
    };
  }

  return {
    provider,
    label: "本地模板",
    configured: true,
    model: "template",
    models: getAvailableModels(),
    friendly: getFriendlyModelInfo("template", provider)
  };
}

export async function generateCampusContent(
  context: GenerationContext,
  modelOverride?: string
): Promise<GeneratedOutput> {
  const provider = getChatCompletionProvider(modelOverride);

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
  // 防护：如果 baseUrl 不像 URL（可能是误填的模型 ID），回退到默认地址
  if (!baseUrl || !/^https?:\/\//i.test(baseUrl)) {
    console.warn("[AI] DOUBAO_BASE_URL 不是有效 URL，已回退到默认地址");
    return "https://ark.cn-beijing.volces.com/api/v3/chat/completions";
  }
  const trimmed = baseUrl.replace(/\/+$/, "");

  if (trimmed.endsWith("/chat/completions")) {
    return trimmed;
  }

  return `${trimmed}/chat/completions`;
}

function getChatCompletionProvider(modelOverride?: string): ChatCompletionProvider | null {
  const provider = resolveAiProvider();

  if (provider === "template") {
    return null;
  }

  if (provider === "doubao") {
    const apiKey = getDoubaoApiKey();

    if (!apiKey) {
      throw new Error("豆包 API Key 未配置。请在 Vercel 环境变量中设置 DOUBAO_API_KEY 或 ARK_API_KEY。");
    }

    const model = modelOverride || process.env.DOUBAO_MODEL || "deepseek-v4-pro-260425";

    return {
      provider,
      label: "豆包 / 火山方舟",
      apiKey,
      endpoint: normalizeChatEndpoint(
        process.env.DOUBAO_BASE_URL ?? "https://ark.cn-beijing.volces.com/api/v3"
      ),
      model,
      maxTokensField: "max_completion_tokens",
      supportsJsonMode: false
    };
  }

  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OpenAI API Key 未配置。请设置 OPENAI_API_KEY，或把 AI_PROVIDER 改为 doubao/template。");
  }

  const model = modelOverride || process.env.OPENAI_MODEL || "gpt-4o-mini";

  return {
    provider,
    label: "OpenAI",
    apiKey: process.env.OPENAI_API_KEY,
    endpoint: normalizeChatEndpoint(process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1"),
    model,
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

  // DeepSeek 推理模型：必须启用 thinking，但降低推理深度以提速
  if (provider.model.toLowerCase().includes("deepseek")) {
    body.thinking = { type: "enabled" };
    // pro 模型深度推理，flash/其他用轻量推理
    if (provider.model.includes("pro")) {
      body.reasoning_effort = "medium"; // 默认 high，降为中档不损质量但提速
    }
  }
  // 降低温度提速（0.82→0.72），仍保持足够创意
  body.temperature = 0.72;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 秒超时（DeepSeek 推理较慢）

  let response: Response;
  try {
    response = await fetch(provider.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${provider.apiKey}`
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (fetchError) {
    clearTimeout(timeoutId);
    const reason = fetchError instanceof Error ? fetchError.message : "unknown";
    throw new Error(
      `${provider.label} 网络请求失败（${reason}）。端点：${provider.endpoint.replace(/\/chat\/completions$/, "/...")}`
    );
  }
  clearTimeout(timeoutId);

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`${provider.label} 调用失败：${response.status}${detail ? ` ${detail.slice(0, 200)}` : ""}`);
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

  // ---- 结构差异化角度：每次随机选一个，保证不同次生成的内容结构不同 ----
  const structureAngles = [
    `「避坑先行」——先用 2-3 个新生最容易踩的坑开场，再按场景给具体建议，最后落到私信/咨询`,
    `「一天时间线」——按报到当天的时间顺序写：早上到校→中午办手续→下午收拾宿舍→晚上周边吃饭，每个节点给一条实用提醒`,
    `「清单体+场景点评」——把内容组织成清单，但每条清单后面跟一句「实际感受」（比如「宿舍看着大，塞完东西才发现小」）`,
    `「Q&A 答疑体」——模拟新生私信问得最多的 4-5 个问题，用学长学姐口吻一一回答，最后引导继续提问`,
    `「对比体」——用「来之前以为……实际上……」的对比结构写 3-4 组反差，打破新生对大学生活的想象偏差`,
    `「宿舍卧谈会」——像宿舍晚上聊天一样，从闲聊切入，把实用信息夹在真实对话感里`,
    `「数据+体感」——每条建议配一个模糊数字（「大概 7 成新生都会忽略……」「食堂有 20 多个窗口但只有 3 家撑到晚上」），增加真实感`,
    `「单品深扒」——不写泛泛清单，而是盯住 1-2 个具体品类（比如床品尺寸/校园卡套餐）深挖对比，其余一笔带过`,
  ];
  const structureAngle =
    structureAngles[Math.floor(Math.random() * structureAngles.length)] ?? structureAngles[0];

  // ---- 内容类型专属切入点：让同类型内容每次也有不同侧重 ----
  const contentTypeAngles: Record<string, string[]> = {
    "宿舍攻略": [
      "重点写宿舍空间利用和收纳，不写泛泛的「宿舍好物」",
      "从床位尺寸和楼栋差异切入，提醒新生先确认再买",
      "写室友相处和作息协调，生活向而非物品向"
    ],
    "开学清单": [
      "按「一定带/到了再买/千万别买」三类分组，不写平铺清单",
      "从报到当天背包出发，只写 24 小时内会用到的东西",
      "军训、上课、宿舍三类场景各列 5 件，不混在一起"
    ],
    "校园周边": [
      "画一个「以校门为圆心步行 15 分钟」的生活圈地图感",
      "重点写快递点、打印店、药店这些新生容易忽略的刚需点位",
      "对比学校周边和市区商圈，告诉新生什么在周边解决什么去市区"
    ],
    "食堂测评": [
      "按「早餐/午餐/夜宵」分时段推荐窗口，不写笼统的「好吃」",
      "给每个推荐窗口写一句「老生才知道」的隐藏信息",
      "写省钱吃法：哪个窗口量大、哪个时间段打折"
    ],
    "新生避坑": [
      "按「报到坑/宿舍坑/消费坑/信息坑」分类，每类 2-3 条",
      "每条坑配一个「怎么避」的具体动作，不光吐槽",
      "从高年级生视角写「当年我踩过的坑」，故事感优先"
    ],
    "校园卡": [
      "对比不同运营商在本校的实际信号和网速，不推荐具体品牌但可以写「建议到校实测」",
      "写办卡时机：什么时候办划算、什么时候容易踩坑",
      "把校园卡和宽带、宿舍 Wi-Fi 放在一起写，做整体通信建议"
    ],
    "被子床品": [
      "重点写尺寸匹配：不同楼栋/床型可能需要不同尺寸，提醒先确认",
      "写材质和季节匹配：南方/北方、有无暖气对厚度和材质的影响",
      "写购买渠道对比：网购、学校周边、家里寄，各自的优缺点"
    ],
    "军训用品": [
      "按「防晒/鞋垫/补水/急救」四类写，每类只推 1-2 个真正有用的",
      "写军训一天的真实时间线，根据每个时段推荐对应用品",
      "重点写「大多数人不知道但很有用」的冷门好物，不写网上抄烂的清单"
    ],
    "学长学姐建议": [
      "按「学习/生活/社交/花钱」四个维度各给 2 条建议，角度全面",
      "用「大一上 vs 大一下」的时间对比写建议，体现成长感",
      "收集不同专业/学院学长学姐的各一条建议，做拼盘体"
    ]
  };
  const angles = contentTypeAngles[contentType] ?? [
    `围绕「${contentType}」从新生最关心的 3 个问题切入`,
    `用真实经历故事开场，自然过渡到${contentType}建议`,
  ];
  const contentTypeAngle = angles[Math.floor(Math.random() * angles.length)] ?? angles[0];

  // ---- 学校资料按场景分组，让 AI 更容易按需引用 ----
  const lifeFacts = [
    ["学校", [school.name, school.campus_name].filter(Boolean).join(" ")],
    ["城市", school.city],
    ["宿舍", school.dormitory_info],
    ["食堂", school.cafeteria_info],
  ].filter(([, v]) => Boolean(v));

  const nearbyFacts = [
    ["周边美食", school.nearby_food],
    ["周边娱乐/生活配套", school.nearby_fun],
  ].filter(([, v]) => Boolean(v));

  const prepFacts = [
    ["报到注意事项", school.registration_notes],
    ["开学必备用品", school.essentials],
    ["校园卡信息", school.campus_card_notes],
    ["床品/被子信息", school.bedding_scenarios],
  ].filter(([, v]) => Boolean(v));

  const extraFacts = [
    ["常见新生问题", school.freshman_faq],
  ].filter(([, v]) => Boolean(v));

  function formatFacts(label: string, facts: (string | null)[][]) {
    if (!facts.length) return "";
    return `【${label}】\n${facts.map(([k, v]) => `· ${k}：${v}`).join("\n")}`;
  }

  const schoolFactsBlock = [
    formatFacts("校园生活", lifeFacts),
    formatFacts("周边环境", nearbyFacts),
    formatFacts("开学准备", prepFacts),
    formatFacts("补充信息", extraFacts),
  ].filter(Boolean).join("\n\n");

  // ---- 平台专属格式 ----
  const format =
    platform === "小红书"
      ? `JSON 字段：titles(5个字符串)、coverText、body、imageIdeas(6个字符串)、tags(10个字符串)、commentGuide、dmGuide。`
      : platform === "抖音"
        ? `JSON 字段：hook3s、script15s、script30s、storyboard(分镜数组)、shootingIdeas(拍摄建议数组)、subtitles(字幕数组)、publishTitle、commentGuide。`
        : `JSON 字段：videoTitle、videoBody、momentsCopy、privateGuide。`;

  // ---- 语气风格具体化 ----
  const toneGuide: Record<string, string> = {
    "真实学长学姐口吻": "像在食堂跟学弟学妹边吃边聊，可以加一句「我们当时就是……」这类真实经历，但不要过度煽情",
    "避坑攻略口吻": "每条建议都是「坑+避法」结构，语气可以带一点过来人的无奈和提醒，但不贩卖焦虑",
    "生活分享口吻": "轻松日常，像发朋友圈分享生活，可以出现「我个人觉得」「我比较喜欢」这类主观表达",
    "强转化口吻": "在提供实用信息的同时自然引导私信/咨询，转化点要软、要有信息差价值（「我整理了一份对比表，需要的私信我」），不能硬推销",
  };
  const toneInstruction = toneGuide[tone] ?? "自然、真诚、像真人学长学姐在分享，不是 AI 在写说明书";

  return `${safetyInstruction(school.banned_phrases)}

请为以下校园账号生成 ${platform} 内容。
内容类型：${contentType}
内容目标：${contentGoal}
语气风格：${tone}（${toneInstruction}）

★ 本次结构策略：${structureAngle}
★ 本次内容侧重：${contentTypeAngle}

学校资料：
${schoolFactsBlock}

${format}

内容质量要求：
1. 真实感优先：必须像真人学长学姐在分享经验，避免「首先……其次……最后……」的论文腔和「众所周知」「值得一提的是」等 AI 套话。句子长短交错，口语化但不随意。
2. 紧扣资料：尽可能引用上面学校资料中的具体信息（宿舍条件、食堂窗口、周边店铺、报到细节）。资料没有覆盖的地方写「建议到校后确认」「可以提前问学长学姐」，绝不编造事实。
3. 标题多样性：${platform === "小红书" ? "5 个标题角度要互不相同，覆盖情绪共鸣、信息增量、好奇心缺口、避坑提醒、清单导览中的至少 3 个方向。" : "标题要具体，包含学校名和内容类型的组合，不做标题党。"}
4. 合规底线：涉及校园卡、床品、开学用品时，只能使用「按个人需要了解」「对比资费/尺寸/配送/售后」「以实际规则为准」「建议提前问清楚」等中性表达，严禁出现「官方指定」「必须办理」「不办影响入学」「内部渠道」「保证通过」。
5. 输出格式：纯 JSON 对象，不要 Markdown 代码块、不要解释文字。字段名严格按上面给出的名称。每个字段都必须有内容，数组字段不能为空数组。`;
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
    commentGuide: `评论区可以留"${school.name}+校区"，我按大家问得多的点继续整理。`,
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
      "涉及办理和购买时，用「按个人需要了解」表达"
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
    commentGuide: "评论区发「学校+校区」，下一条按校区继续整理。"
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
