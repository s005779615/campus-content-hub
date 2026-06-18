import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";

export async function POST(request: Request) {
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { url, platform } = await request.json() as { url: string; platform: string };

  if (!url || !platform) {
    return NextResponse.json({ error: "缺少链接或平台" }, { status: 400 });
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "zh-CN,zh;q=0.9",
      },
      redirect: "follow",
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return NextResponse.json({ error: `页面请求失败(${response.status})` }, { status: 502 });
    }

    const html = await response.text();
    const finalUrl = response.url;

    let title = "";
    let views = 0;
    let likes = 0;
    let favorites = 0;
    let comments = 0;
    let shares = 0;

    if (platform === "小红书") {
      // 小红书：从 __INITIAL_STATE__ 提取
      const stateMatch = html.match(/window\.__INITIAL_STATE__\s*=\s*(\{[^<]+\})\s*<\/script>/);
      if (stateMatch) {
        try {
          const raw = stateMatch[1].replace(/undefined/g, "null");
          const state = JSON.parse(raw);
          const note = state?.note?.noteDetailMap?.[Object.keys(state.note.noteDetailMap)[0]]?.note;
          if (note) {
            title = note.title || note.desc || "";
            likes = note.interactInfo?.likedCount ?? 0;
            favorites = note.interactInfo?.collectedCount ?? 0;
            comments = note.interactInfo?.commentCount ?? 0;
            shares = note.interactInfo?.shareCount ?? 0;
          }
        } catch { /* parse error */ }
      }
    }

    if (platform === "抖音") {
      // 抖音：从 RENDER_DATA 提取
      const renderMatch = html.match(/<script[^>]*id="RENDER_DATA"[^>]*>([^<]+)<\/script>/);
      if (renderMatch) {
        try {
          const decoded = decodeURIComponent(renderMatch[1]);
          const data = JSON.parse(decoded);
          const videoKey = Object.keys(data)[0];
          const video = data[videoKey]?.itemInfo?.itemStruct || data[videoKey];
          if (video) {
            title = video.desc || video.share_info?.share_title || "";
            const stats = video.stats || video.statistics || {};
            likes = parseInt(stats.diggCount || stats.digg_count || 0, 10);
            comments = parseInt(stats.commentCount || stats.comment_count || 0, 10);
            shares = parseInt(stats.shareCount || stats.share_count || 0, 10);
            favorites = parseInt(stats.collectCount || stats.collect_count || 0, 10);
            views = parseInt(stats.playCount || stats.play_count || 0, 10);
          }
        } catch { /* parse error */ }
      }

      // 备选：从 window.__INITIAL_STATE__ 提取
      if (!title) {
        const initMatch = html.match(/window\.__INITIAL_STATE__\s*=\s*(\{[^<]+\})\s*\(function/);
        if (initMatch) {
          try {
            const state = JSON.parse(initMatch[1].replace(/undefined/g, "null"));
            const video = state?.video?.videoDetail;
            if (video) {
              title = video.title || video.desc || "";
              const stats = video.stats || video.statistics || {};
              likes = stats?.diggCount ?? 0;
              comments = stats?.commentCount ?? 0;
              shares = stats?.shareCount ?? 0;
              favorites = stats?.collectCount ?? 0;
              views = stats?.playCount ?? 0;
            }
          } catch { /* parse error */ }
        }
      }
    }

    if (!title && !views && !likes && !comments) {
      return NextResponse.json({
        error: "未能自动提取数据，请手动填写",
        partial: true,
        suggestion: title || "请检查链接能否在浏览器中打开"
      }, { status: 422 });
    }

    return NextResponse.json({
      title: title || "",
      views,
      likes,
      favorites,
      comments,
      shares,
      resolvedUrl: finalUrl,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "请求超时";
    return NextResponse.json({ error: `抓取失败：${msg}，请手动填写`, partial: true }, { status: 502 });
  }
}
