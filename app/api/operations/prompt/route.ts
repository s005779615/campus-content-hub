import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { campusGrowthPlannerPrompt } from "@/prompts/campusGrowthPlanner";

export async function POST(request: Request) {
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ prompt: "" }, { status: 401 });

  const body = await request.json() as any;

  const prompt = campusGrowthPlannerPrompt({
    school: body.school || {},
    businesses: body.businesses || {},
    socialStats: body.socialStats || [],
  });

  return NextResponse.json({ prompt });
}
