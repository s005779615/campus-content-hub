# ENVIRONMENT.md

不要在这个文件里写真实 API Key。真实值只放在本地 `.env.local` 或 Vercel/Supabase 控制台里。

## 必填变量

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
```

说明：

- `NEXT_PUBLIC_SUPABASE_URL`：Supabase 项目地址。前端和服务端都会读取。
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`：Supabase anon key。用于浏览器登录和 RLS 查询。可以暴露给前端，但不要绕过 RLS。
- `SUPABASE_SERVICE_ROLE_KEY`：Supabase service role key。只允许服务端使用，用于管理员创建队员 Auth 用户，绝不能暴露给前端。

## AI 服务变量

当前代码支持 `doubao`、`openai`、`template` 三种 provider。

```env
AI_PROVIDER=doubao
```

说明：

- `doubao`：走火山方舟 OpenAI 兼容接口，推荐大陆环境使用。
- `openai`：走 OpenAI。
- `template`：不调用外部 AI，只使用本地模板，适合演示或 API 不可用时兜底。

## 火山方舟变量

当前代码实际读取：

```env
DOUBAO_API_KEY=请用户自己填写
ARK_API_KEY=请用户自己填写
DOUBAO_BASE_URL=https://ark.cn-beijing.volces.com/api/v3
DOUBAO_MODEL=请用户自己填写
```

说明：

- `DOUBAO_API_KEY`：火山方舟 API Key，服务端变量。
- `ARK_API_KEY`：火山方舟 API Key 兼容命名，和 `DOUBAO_API_KEY` 二选一。
- `DOUBAO_BASE_URL`：火山方舟 OpenAI 兼容接口地址。
- `DOUBAO_MODEL`：模型或接入点 ID。

豆包示例：

```env
AI_PROVIDER=doubao
DOUBAO_BASE_URL=https://ark.cn-beijing.volces.com/api/v3
DOUBAO_MODEL=doubao-seed-2-0-lite-260215
DOUBAO_API_KEY=请用户自己填写
```

DeepSeek V4 Pro 示例：

```env
AI_PROVIDER=doubao
DOUBAO_BASE_URL=https://ark.cn-beijing.volces.com/api/v3
DOUBAO_MODEL=deepseek-v4-pro-260425
DOUBAO_API_KEY=请用户自己填写
```

用户示例里提到的通用命名可以作为后续重构方向：

```env
ARK_BASE_URL=https://ark.cn-beijing.volces.com/api/v3
ARK_API_KEY=请用户自己填写
ARK_MODEL_DOUBAO=请用户自己填写
ARK_MODEL_DEEPSEEK=请用户自己填写
AI_PROVIDER=volcengine
```

但当前代码还没有完整读取 `ARK_BASE_URL`、`ARK_MODEL_DOUBAO`、`ARK_MODEL_DEEPSEEK`，如要使用这些名字，需要先修改 `lib/content-generator.ts`。

## OpenAI 变量

```env
OPENAI_API_KEY=请用户自己填写
OPENAI_MODEL=gpt-4o-mini
OPENAI_BASE_URL=https://api.openai.com/v1
```

说明：

- `OPENAI_API_KEY`：OpenAI API Key，只能服务端使用。
- `OPENAI_MODEL`：OpenAI 模型。
- `OPENAI_BASE_URL`：可选，默认为 OpenAI 官方接口地址。

## Vercel 配置注意

- 生产环境、预览环境都要配置同一组变量。
- 修改环境变量后必须 Redeploy。
- API Key 建议用 Vercel Sensitive Environment Variable。
- 不要创建任何 `NEXT_PUBLIC_*_API_KEY`。

## 本地 `.env.local` 示例

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

AI_PROVIDER=doubao
DOUBAO_API_KEY=请用户自己填写
DOUBAO_BASE_URL=https://ark.cn-beijing.volces.com/api/v3
DOUBAO_MODEL=deepseek-v4-pro-260425
```

`.env.local` 已在 `.gitignore` 中，不能提交到 GitHub。
