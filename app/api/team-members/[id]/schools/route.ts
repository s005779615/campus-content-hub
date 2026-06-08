import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await getAuthContext();
    const { id } = await params;

    if (!context) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (context.profile.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = (await request.json()) as { schoolIds: string[] };
    const schoolIds = Array.from(new Set(body.schoolIds ?? []));

    const deleteResult = await context.supabase
      .from("school_assignments")
      .delete()
      .eq("user_id", id);

    if (deleteResult.error) {
      return NextResponse.json({ error: deleteResult.error.message }, { status: 400 });
    }

    if (schoolIds.length) {
      const insertResult = await context.supabase.from("school_assignments").insert(
        schoolIds.map((schoolId) => ({
          user_id: id,
          school_id: schoolId,
          assigned_by: context.user.id
        }))
      );

      if (insertResult.error) {
        return NextResponse.json({ error: insertResult.error.message }, { status: 400 });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
