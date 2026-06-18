import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";

export async function GET(request: Request) {
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const schoolId = searchParams.get("school_id");
  const platform = searchParams.get("platform");

  let query = ctx.supabase
    .from("publish_metrics")
    .select("*, schools(name, campus_name), profiles!user_id(full_name, email)")
    .order("created_at", { ascending: false })
    .limit(200);

  if (schoolId && schoolId !== "全部") query = query.eq("school_id", schoolId);
  if (platform && platform !== "全部") query = query.eq("platform", platform);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ metrics: data ?? [] });
}

export async function POST(request: Request) {
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json() as {
    school_id: string;
    platform: string;
    post_url: string;
    post_title?: string;
    views?: number;
    likes?: number;
    favorites?: number;
    comments?: number;
    shares?: number;
  };

  if (!body.school_id || !body.platform || !body.post_url) {
    return NextResponse.json({ error: "缺少必填字段" }, { status: 400 });
  }

  const { data, error } = await ctx.supabase
    .from("publish_metrics")
    .insert({
      user_id: ctx.profile.id,
      school_id: body.school_id,
      platform: body.platform,
      post_url: body.post_url,
      post_title: body.post_title?.trim() || null,
      views: body.views ?? 0,
      likes: body.likes ?? 0,
      favorites: body.favorites ?? 0,
      comments: body.comments ?? 0,
      shares: body.shares ?? 0,
    })
    .select("*, schools(name, campus_name), profiles!user_id(full_name, email)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ metric: data });
}

export async function DELETE(request: Request) {
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const { error } = await ctx.supabase
    .from("publish_metrics")
    .delete()
    .eq("id", id)
    .eq("user_id", ctx.profile.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
