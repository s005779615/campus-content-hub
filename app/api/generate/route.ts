import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { auditRiskTerms } from "@/lib/content-policy";
import { contentGoals, contentTypes, platforms, toneStyles } from "@/lib/constants";
import { generateCampusContent } from "@/lib/content-generator";
import type {
  CampusAsset,
  GeneratePayload,
  SchoolRecord,
  SelectedAssetSummary
} from "@/lib/types";

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

    let selectedAssets: SelectedAssetSummary[] = [];
    const assetIds = Array.from(new Set(body.assetIds ?? [])).slice(0, 8);
    if (assetIds.length) {
      const { data: assets, error: assetError } = await context.supabase
        .from("campus_assets")
        .select("*")
        .in("id", assetIds)
        .eq("school_id", body.schoolId)
        .eq("status", "已通过")
        .eq("can_generate", true)
        .returns<CampusAsset[]>();

      if (assetError || (assets ?? []).length !== assetIds.length) {
        return NextResponse.json(
          { error: "部分素材不可用、未通过审核或不属于当前学校。" },
          { status: 400 }
        );
      }

      selectedAssets = (assets ?? []).map(
        ({ id, file_name, file_type, category, tags, location, usage_scene }) => ({
          id,
          file_name,
          file_type,
          category,
          tags,
          location,
          usage_scene
        })
      );
    }

    const output = await generateCampusContent(
      {
        ...body,
        school,
        assets: selectedAssets
      },
      body.model
    );
    const riskHits = auditRiskTerms(output, school.banned_phrases);

    return NextResponse.json({ output, riskHits, selectedAssets });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
