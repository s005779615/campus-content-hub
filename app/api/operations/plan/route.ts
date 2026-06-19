import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json() as {
    school?: { name: string; campusName?: string; totalStudents: number; newStudents: number; maleRatio: number; dormCount: number; semesterStart: string; militaryStart?: string; registerStart?: string };
    businesses?: { phoneCards: boolean; bedding: boolean; partTime: boolean; errands: boolean; secondHand: boolean; competitorCount: number; lastYearDeals: number; lastYearRate: string };
    socialStats?: Array<{ platform: string; accountCount: number; publishCount: number; exposure: number; likes: number; favorites: number; comments: number; privateMessages: number; groups: number; deals: number }>;
    schoolId?: string;
  };

  if (!body.school || !body.businesses) {
    return NextResponse.json({ error: "缺少学校或业务数据" }, { status: 400 });
  }

  // Create job
  const admin = createSupabaseAdminClient();
  const { data: job, error } = await admin
    .from("operations_jobs")
    .insert({
      user_id: ctx.user.id,
      school_id: body.schoolId || null,
      school_name: body.school?.name || "",
      status: "pending",
    })
    .select("id")
    .single();

  if (error || !job) {
    return NextResponse.json({ error: "创建任务失败" }, { status: 500 });
  }

  // Fire worker asynchronously — don't await, return immediately
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://campus-content-hub.vercel.app";
  fetch(`${baseUrl}/api/operations/plan/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jobId: job.id,
      school: body.school,
      businesses: body.businesses,
      socialStats: body.socialStats || [],
      schoolId: body.schoolId,
    }),
  }).catch(() => {}); // fire-and-forget

  return NextResponse.json({ jobId: job.id, status: "pending" });
}

export async function GET(request: Request) {
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get("jobId");
  if (!jobId) return NextResponse.json({ error: "缺少 jobId" }, { status: 400 });

  const { data: job, error } = await ctx.supabase
    .from("operations_jobs")
    .select("id, status, progress, plan_data, error_message, created_at")
    .eq("id", jobId)
    .eq("user_id", ctx.user.id)
    .single();

  if (error || !job) return NextResponse.json({ error: "未找到任务" }, { status: 404 });

  return NextResponse.json({ job });
}

export async function DELETE(request: Request) {
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get("jobId");
  if (!jobId) return NextResponse.json({ error: "缺少 jobId" }, { status: 400 });

  const admin = createSupabaseAdminClient();
  await admin.from("operations_jobs").update({ status: "cancelled", progress: "已取消", updated_at: new Date().toISOString() }).eq("id", jobId).eq("user_id", ctx.user.id);

  return NextResponse.json({ ok: true });
}
