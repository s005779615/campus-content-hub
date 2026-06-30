type ChatChoice = {
  message?: {
    content?: string;
    reasoning_content?: string;
  };
};

export async function runOperationsJson<T>(prompt: string, label: string): Promise<T> {
  const apiKey = process.env.DOUBAO_API_KEY || process.env.ARK_API_KEY;

  if (!apiKey) {
    throw new Error("AI Key 未配置。请在服务端环境变量中配置 DOUBAO_API_KEY 或 ARK_API_KEY。");
  }

  const rawBase = process.env.DOUBAO_BASE_URL || "https://ark.cn-beijing.volces.com/api/v3";
  const endpoint = /^https?:\/\//i.test(rawBase)
    ? `${rawBase.replace(/\/+$/, "")}/chat/completions`
    : "https://ark.cn-beijing.volces.com/api/v3/chat/completions";
  const model = process.env.DOUBAO_MODEL || "deepseek-v4-pro-260425";

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "system",
          content:
            "你是校园增长运营专家。只输出可解析 JSON，不输出 Markdown，不生成具体文案、标题、脚本、分镜、评论话术或私信话术。"
        },
        { role: "user", content: prompt }
      ],
      temperature: 0.55,
      max_tokens: 4096
    }),
    signal: AbortSignal.timeout(60000)
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`${label} 调用失败：${response.status}${detail ? ` ${detail.slice(0, 180)}` : ""}`);
  }

  const data = (await response.json()) as { choices?: ChatChoice[] };
  const content = data.choices?.[0]?.message?.content?.trim();

  if (!content) {
    throw new Error(`${label} 返回内容为空。`);
  }

  return parseJson<T>(content, label);
}

function parseJson<T>(content: string, label: string): T {
  const cleaned = content
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();

  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");

    if (start >= 0 && end > start) {
      return JSON.parse(cleaned.slice(start, end + 1)) as T;
    }

    throw new Error(`${label} 返回内容不是合法 JSON。`);
  }
}
