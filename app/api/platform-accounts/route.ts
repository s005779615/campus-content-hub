import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";

export async function GET() {
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await ctx.supabase
    .from("platform_accounts")
    .select("*, schools!inner(name,campus_name)")
    .eq("user_id", ctx.profile.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { school_id, platform, account_name, account_id, account_password, account_link, notes } = body;

  if (!school_id || !platform || !account_name) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const { data, error } = await ctx.supabase
    .from("platform_accounts")
    .upsert(
      { user_id: ctx.profile.id, school_id, platform, account_name, account_id, account_password, account_link, notes },
      { onConflict: "user_id,school_id,platform" }
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
