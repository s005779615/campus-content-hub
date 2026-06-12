import { CopyButton } from "@/components/copy-button";
import { PlatformBadge } from "@/components/platform-badge";
import type {
  DouyinOutput,
  GeneratedOutput,
  Platform,
  VideoChannelOutput,
  XiaohongshuOutput
} from "@/lib/types";

export function ContentOutput({
  platform,
  output
}: {
  platform: Platform;
  output: GeneratedOutput;
}) {
  const allText = outputToText(platform, output);

  return (
    <div className="panel overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-line px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <PlatformBadge platform={platform} />
          <span className="text-[13px] font-semibold text-ink">生成结果</span>
        </div>
        <CopyButton text={allText} label="复制全文" />
      </div>
      <div className="divide-y divide-line px-5">
        {platform === "小红书" ? (
          <XiaohongshuView output={output as XiaohongshuOutput} />
        ) : platform === "抖音" ? (
          <DouyinView output={output as DouyinOutput} />
        ) : (
          <VideoChannelView output={output as VideoChannelOutput} />
        )}
      </div>
    </div>
  );
}

function Section({
  title,
  children
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="py-5">
      <h3 className="text-xs font-semibold text-muted">{title}</h3>
      <div className="mt-2.5 text-sm leading-7 text-ink-soft">{children}</div>
    </section>
  );
}

function safeItem(item: unknown): string {
  if (typeof item === "string") return item;
  if (typeof item === "object" && item !== null) {
    return JSON.stringify(item).slice(0, 120);
  }
  return String(item ?? "");
}

function XiaohongshuView({ output }: { output: XiaohongshuOutput }) {
  return (
    <>
      <Section title="5 个标题">
        <ol className="list-decimal space-y-1 pl-5">
          {output.titles?.map((title, i) => <li key={i}>{safeItem(title)}</li>)}
        </ol>
      </Section>
      <Section title="封面文案">
        <p className="whitespace-pre-wrap">{safeItem(output.coverText)}</p>
      </Section>
      <Section title="正文内容">
        <p className="whitespace-pre-wrap">{safeItem(output.body)}</p>
      </Section>
      <Section title="6 张配图说明">
        <ul className="list-disc space-y-1 pl-5">
          {output.imageIdeas?.map((idea, i) => <li key={i}>{safeItem(idea)}</li>)}
        </ul>
      </Section>
      <Section title="10 个标签">
        <div className="flex flex-wrap gap-2">
          {output.tags?.map((tag) => (
            <span key={tag} className="rounded bg-canvas-alt px-2 py-1 text-xs text-muted">
              #{tag}
            </span>
          ))}
        </div>
      </Section>
      <Section title="评论区引导">
        <p>{safeItem(output.commentGuide)}</p>
      </Section>
      <Section title="私信引导">
        <p>{safeItem(output.dmGuide)}</p>
      </Section>
    </>
  );
}

function DouyinView({ output }: { output: DouyinOutput }) {
  return (
    <>
      <Section title="3 秒开头钩子">
        <p>{safeItem(output.hook3s)}</p>
      </Section>
      <Section title="15 秒短视频脚本">
        <p className="whitespace-pre-wrap">{safeItem(output.script15s)}</p>
      </Section>
      <Section title="30 秒短视频脚本">
        <p className="whitespace-pre-wrap">{safeItem(output.script30s)}</p>
      </Section>
      <Section title="分镜脚本">
        <ul className="list-disc space-y-1 pl-5">
          {output.storyboard?.map((item, i) => <li key={i}>{safeItem(item)}</li>)}
        </ul>
      </Section>
      <Section title="拍摄画面建议">
        <ul className="list-disc space-y-1 pl-5">
          {output.shootingIdeas?.map((item, i) => <li key={i}>{safeItem(item)}</li>)}
        </ul>
      </Section>
      <Section title="屏幕字幕">
        <ul className="list-disc space-y-1 pl-5">
          {output.subtitles?.map((item, i) => <li key={i}>{safeItem(item)}</li>)}
        </ul>
      </Section>
      <Section title="发布标题">
        <p>{safeItem(output.publishTitle)}</p>
      </Section>
      <Section title="评论区引导">
        <p>{safeItem(output.commentGuide)}</p>
      </Section>
    </>
  );
}

function VideoChannelView({ output }: { output: VideoChannelOutput }) {
  return (
    <>
      <Section title="视频标题">
        <p>{safeItem(output.videoTitle)}</p>
      </Section>
      <Section title="视频正文">
        <p className="whitespace-pre-wrap">{safeItem(output.videoBody)}</p>
      </Section>
      <Section title="朋友圈转发文案">
        <p className="whitespace-pre-wrap">{safeItem(output.momentsCopy)}</p>
      </Section>
      <Section title="私域引导话术">
        <p>{safeItem(output.privateGuide)}</p>
      </Section>
    </>
  );
}

function outputToText(platform: Platform, output: GeneratedOutput) {
  if (platform === "小红书") {
    const data = output as XiaohongshuOutput;
    return [
      "标题：",
      ...(data.titles ?? []),
      "",
      "封面文案：",
      data.coverText,
      "",
      "正文：",
      data.body,
      "",
      "配图：",
      ...(data.imageIdeas ?? []),
      "",
      "标签：",
      ...(data.tags ?? []).map((tag) => `#${tag}`),
      "",
      "评论区引导：",
      data.commentGuide,
      "",
      "私信引导：",
      data.dmGuide
    ].join("\n");
  }

  if (platform === "抖音") {
    const data = output as DouyinOutput;
    return [
      "3秒开头钩子：",
      data.hook3s,
      "",
      "15秒脚本：",
      data.script15s,
      "",
      "30秒脚本：",
      data.script30s,
      "",
      "分镜：",
      ...(data.storyboard ?? []),
      "",
      "拍摄建议：",
      ...(data.shootingIdeas ?? []),
      "",
      "字幕：",
      ...(data.subtitles ?? []),
      "",
      "发布标题：",
      data.publishTitle,
      "",
      "评论区引导：",
      data.commentGuide
    ].join("\n");
  }

  return JSON.stringify(output, null, 2);
}
