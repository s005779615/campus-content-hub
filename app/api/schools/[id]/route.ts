import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import type { SchoolInput } from "@/lib/types";

const schoolFields = [
  "name",
  "campus_name",
  "city",
  "dormitory_info",
  "cafeteria_info",
  "nearby_food",
  "nearby_fun",
  "registration_notes",
  "essentials",
  "campus_card_notes",
  "bedding_scenarios",
  "freshman_faq",
  "banned_phrases"
] as const satisfies readonly (keyof SchoolInput)[];

function cleanSchoolInput(body: Partial<SchoolInput>) {
  const update: Partial<SchoolInput> = {};

  for (const field of schoolFields) {
    if (typeof body[field] === "string") {
      update[field] = body[field].trim();
    }
  }

  return update;
}

export async function PATCH(
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
      const { data: assignment } = await context.supabase
        .from("school_assignments")
        .select("school_id")
        .eq("school_id", id)
        .eq("user_id", context.user.id)
        .maybeSingle();

      if (!assignment) {
        return NextResponse.json(
          { error: "你只能编辑自己负责的校区资料。" },
          { status: 403 }
        );
      }
    }

    const body = (await request.json()) as Partial<SchoolInput>;
    const update = cleanSchoolInput(body);

    if (!update.name || !update.city) {
      return NextResponse.json(
        { error: "学校名称和所在城市不能为空。" },
        { status: 400 }
      );
    }

    const { data, error } = await context.supabase
      .from("schools")
      .update({
        ...update,
        updated_at: new Date().toISOString()
      })
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ school: data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
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

    const { error } = await context.supabase.from("schools").delete().eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
