import { NextResponse } from "next/server";
import { getAiProviderStatus, getAvailableModels } from "@/lib/content-generator";

export async function GET() {
  try {
    const status = getAiProviderStatus();
    const models = getAvailableModels();

    return NextResponse.json({
      ok: true,
      provider: status.provider,
      configured: status.configured,
      modelsAvailable: models.length,
    });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}
