import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const context = await getAuthContext();

    if (!context) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (context.profile.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const [{ data: members, error: membersError }, { data: assignments, error: assignmentsError }] =
      await Promise.all([
        context.supabase
          .from("profiles")
          .select("id,email,full_name,role,created_at")
          .eq("role", "member")
          .order("created_at", { ascending: false }),
        context.supabase
          .from("school_assignments")
          .select("user_id,school_id,schools(name,campus_name)")
      ]);

    if (membersError || assignmentsError) {
      return NextResponse.json(
        { error: membersError?.message ?? assignmentsError?.message },
        { status: 400 }
      );
    }

    return NextResponse.json({ members, assignments });
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

    if (context.profile.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = (await request.json()) as {
      email: string;
      password: string;
      fullName?: string;
    };

    const admin = createSupabaseAdminClient();
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email: body.email,
      password: body.password,
      email_confirm: true,
      user_metadata: {
        full_name: body.fullName,
        role: "member"
      }
    });

    if (createError || !created.user) {
      return NextResponse.json(
        { error: createError?.message ?? "Failed to create user" },
        { status: 400 }
      );
    }

    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .upsert({
        id: created.user.id,
        email: body.email,
        full_name: body.fullName ?? null,
        role: "member"
      })
      .select("id,email,full_name,role,created_at")
      .single();

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 400 });
    }

    return NextResponse.json({ member: profile });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
