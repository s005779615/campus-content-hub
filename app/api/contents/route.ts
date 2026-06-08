import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import type { GeneratedOutput, Platform, RiskHit } from "@/lib/types";

export async function GET() {
  try {
    const context = await getAuthContext();

    if (!context) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await context.supabase
      .from("content_records")
      .select(
        "*,schools(name,campus_name,city),profiles(full_name,email),publication_records(*)"
      )
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ contents: data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const context = await getAuthContext();

    if (!context) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as {
      schoolId: string;
      platform: Platform;
      contentType: string;
      contentGoal: string;
      tone: string;
      output: GeneratedOutput;
      riskHits: RiskHit[];
    };

    const { data, error } = await context.supabase
      .from("content_records")
      .insert({
        user_id: context.user.id,
        school_id: body.schoolId,
        platform: body.platform,
        content_type: body.contentType,
        content_goal: body.contentGoal,
        tone: body.tone,
        output: body.output,
        risk_hits: body.riskHits ?? [],
        status: "saved"
      })
      .select("*,schools(name,campus_name,city),profiles(full_name,email)")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ content: data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
