import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { auditRiskTerms } from "@/lib/content-policy";
import { contentGoals, contentTypes, platforms, toneStyles } from "@/lib/constants";
import { generateCampusContent } from "@/lib/content-generator";
import type { GeneratePayload, SchoolRecord } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const context = await getAuthContext();

    if (!context) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as GeneratePayload;
    const validPlatforms = platforms as readonly string[];
    const validContentTypes = contentTypes as readonly string[];
    const validContentGoals = contentGoals as readonly string[];
    const validToneStyles = toneStyles as readonly string[];
    const invalid =
      !body.schoolId ||
      !validPlatforms.includes(body.platform) ||
      !validContentTypes.includes(body.contentType) ||
      !validContentGoals.includes(body.contentGoal) ||
      !validToneStyles.includes(body.tone);

    if (invalid) {
      return NextResponse.json({ error: "Invalid generation payload" }, { status: 400 });
    }

    const { data: school, error: schoolError } = await context.supabase
      .from("schools")
      .select("*")
      .eq("id", body.schoolId)
      .single<SchoolRecord>();

    if (schoolError || !school) {
      return NextResponse.json({ error: "School not found or forbidden" }, { status: 404 });
    }

    const output = await generateCampusContent(
      {
        ...body,
        school
      },
      body.model
    );
    const riskHits = auditRiskTerms(output, school.banned_phrases);

    return NextResponse.json({ output, riskHits });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
