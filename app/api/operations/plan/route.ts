import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";

const SUPABASE_FN = "https://hqpgzdjzyhzipnxgomkm.supabase.co/functions/v1/campus-strategist";

export async function POST(request: Request) {
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const payload = { ...body, userId: ctx.user.id };

  const res = await fetch(SUPABASE_FN, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(120000),
  });

  const data = await res.json();
  if (!res.ok) return NextResponse.json({ error: data.error || "失败" }, { status: res.status });

  return NextResponse.json({ plan: data.plan });
}
