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
      model: status.model,
      modelsAvailable: models.length,
      models: models.map(m => ({ id: m.id, displayName: m.displayName })),
      hasApiKey: Boolean(
        process.env.DOUBAO_API_KEY ||
        process.env.ARK_API_KEY ||
        process.env.OPENAI_API_KEY
      ),
      hasSupabaseUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    }, { status: 500 });
  }
}
