import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const { apiKey, baseUrl, model, prompt, schoolId } = await request.json() as any;

  const endpoint = (baseUrl && /^https?:\/\//i.test(baseUrl)
    ? `${baseUrl.replace(/\/+$/, "")}/chat/completions`
    : "https://ark.cn-beijing.volces.com/api/v3/chat/completions");

  const aiRes = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
    body: JSON.stringify({ model, messages: [{ role: "user", content: prompt }], temperature: 0.7, max_tokens: 4096, stream: true }),
    signal: AbortSignal.timeout(28000),
  });

  if (!aiRes.ok || !aiRes.body) {
    return new Response(JSON.stringify({ error: `AI ${aiRes.status}` }), { status: 502, headers: { "Content-Type": "application/json" } });
  }

  // Stream through to browser
  const encoder = new TextEncoder();
  let fullContent = "";

  const stream = new ReadableStream({
    async start(controller) {
      const hb = setInterval(() => { try { controller.enqueue(encoder.encode(`data: ${JSON.stringify({ t: "hb" })}\n\n`)); } catch {} }, 5000);
      const reader = aiRes.body!.getReader();
      const decoder = new TextDecoder();

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          for (const line of decoder.decode(value, { stream: true }).split("\n")) {
            if (line.startsWith("data: ")) {
              const d = line.slice(6).trim();
              if (d === "[DONE]") continue;
              try {
                const delta = JSON.parse(d).choices?.[0]?.delta?.content || "";
                fullContent += delta;
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ t: "chunk", c: delta })}\n\n`));
              } catch { /* skip */ }
            }
          }
        }
        clearInterval(hb);
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ t: "done", content: fullContent })}\n\n`));
      } catch (e: any) {
        clearInterval(hb);
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ t: "error", msg: e?.message || "中断" })}\n\n`));
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
  });
}
