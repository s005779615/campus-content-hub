import { riskTermSuggestions, riskTerms } from "@/lib/constants";
import type { RiskHit } from "@/lib/types";

export function auditRiskTerms(input: unknown, customBannedPhrases?: string | null) {
  const text = stringifyForAudit(input);
  const customTerms = (customBannedPhrases ?? "")
    .split(/[\n,，、]/)
    .map((term) => term.trim())
    .filter(Boolean);

  const uniqueTerms = Array.from(new Set([...riskTerms, ...customTerms]));

  return uniqueTerms
    .filter((term) => hasRiskTerm(text, term))
    .map<RiskHit>((term) => ({
      term,
      suggestion: riskTermSuggestions[term] ?? "改成更中性的经验分享表达"
    }));
}

function hasRiskTerm(text: string, term: string) {
  if (term !== "官方") {
    return text.includes(term);
  }

  let index = text.indexOf(term);

  while (index >= 0) {
    if (text[index - 1] !== "非") {
      return true;
    }

    index = text.indexOf(term, index + term.length);
  }

  return false;
}

export function stringifyForAudit(input: unknown) {
  if (typeof input === "string") {
    return input;
  }

  try {
    return JSON.stringify(input);
  } catch {
    return String(input);
  }
}

export function safetyInstruction(customBannedPhrases?: string | null) {
  const custom = customBannedPhrases
    ? `\n额外禁止话术：${customBannedPhrases}`
    : "";

  return `内容必须定位为“非官方校园生活攻略号”“学长学姐视角”“新生避坑攻略”。禁止冒充学校官方、老师、辅导员。不得使用以下风险表达：${riskTerms.join("、")}。遇到办理、购买、咨询相关内容，只能写“可按个人需要了解”“以实际规则为准”“建议提前问清楚”。${custom}`;
}
