import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";

export async function GET() {
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const apiKey = process.env.DOUBAO_API_KEY || process.env.ARK_API_KEY;
  const baseUrl = process.env.DOUBAO_BASE_URL || "https://ark.cn-beijing.volces.com/api/v3";
  const model = process.env.DOUBAO_MODEL || "deepseek-v4-pro-260425";

  if (!apiKey) return NextResponse.json({ ok: false, error: "AI Key 未配置" }, { status: 500 });

  return NextResponse.json({ ok: true, apiKey, baseUrl, model });
}
