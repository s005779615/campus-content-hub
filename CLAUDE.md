# CLAUDE.md

## 项目目标

「校园内容中台」是一个团队内部使用的校园内容运营后台，服务乌鲁木齐校园市场获客业务。核心目标是让不擅长线上内容的队员，基于不同学校资料，生成适合小红书、抖音、视频号发布的校园生活攻略内容，并保存内容、回填发布数据，方便管理员监管。

内容定位必须是：

- 非官方校园生活攻略号
- 学长学姐视角
- 新生避坑攻略

严禁冒充学校官方、老师、辅导员，也不能使用「学校指定」「官方办理」「不办影响入学」等高风险表达。

## 当前网站是做什么的

当前版本是 MVP 后台系统，包含管理员和队员两类角色：

- 管理员：管理学校资料、创建队员、分配学校、查看内容和数据。
- 队员：只能访问自己负责的学校，生成内容、保存内容、填写发布数据。

线上地址：

- https://campus-content-hub.vercel.app

## 技术栈

- 前端：Next.js App Router + React + Tailwind CSS
- 后端：Next.js Route Handlers
- 数据库：Supabase PostgreSQL
- 登录认证：Supabase Auth
- AI 生成：服务端调用 OpenAI 兼容 Chat Completions 接口
- 部署：Vercel

## 前端目录

- `app/login`：登录页
- `app/(app)/dashboard`：后台首页
- `app/(app)/schools`：学校管理
- `app/(app)/team`：队员管理与学校分配
- `app/(app)/generate`：内容生成
- `app/(app)/library`：内容库与发布数据填写
- `app/(app)/tasks`：发布任务
- `app/(app)/analytics`：数据看板
- `app/(app)/settings`：设置页与 AI 配置状态
- `components`：通用 UI 组件
- `lib`：业务工具、Supabase 客户端、内容生成和安全审核逻辑

## 后端目录

Next.js API 位于 `app/api`：

- `app/api/me/route.ts`：获取当前用户资料
- `app/api/schools/route.ts`：学校列表与创建
- `app/api/schools/[id]/route.ts`：学校更新/删除
- `app/api/team-members/route.ts`：管理员创建队员账号
- `app/api/team-members/[id]/schools/route.ts`：队员学校分配
- `app/api/generate/route.ts`：内容生成接口
- `app/api/contents/route.ts`：保存内容
- `app/api/publications/route.ts`：发布数据回填
- `app/api/tasks/route.ts`：任务列表与创建
- `app/api/tasks/[id]/route.ts`：任务状态更新

## 主要页面

- 登录页：`/login`
- 管理员/队员首页：`/dashboard`
- 学校管理：`/schools`
- 队员管理：`/team`
- 内容生成：`/generate`
- 内容库：`/library`
- 发布任务：`/tasks`
- 数据看板：`/analytics`
- 设置页：`/settings`

## AI 模型调用逻辑

核心文件：

- `lib/content-generator.ts`
- `app/api/generate/route.ts`
- `lib/content-policy.ts`

生成流程：

1. 前端在 `/generate` 收集学校、平台、内容类型、目标和语气。
2. 调用 `POST /api/generate`。
3. 后端检查登录用户和学校权限。
4. 后端读取学校资料，调用 `generateCampusContent`。
5. `generateCampusContent` 根据环境变量决定使用 `doubao`、`openai` 或本地模板。
6. AI 返回 JSON 后，系统执行风险词检测。
7. 前端展示内容、风险提示和保存按钮。

如果没有配置 AI Key，会回退到本地模板生成，内容会比较简单且重复。

## 火山方舟 API 接入方式

当前代码使用 OpenAI 兼容接口调用火山方舟：

- API Key：`DOUBAO_API_KEY` 或 `ARK_API_KEY`
- Base URL：`DOUBAO_BASE_URL`
- Model：`DOUBAO_MODEL`

默认接口地址：

```env
DOUBAO_BASE_URL=https://ark.cn-beijing.volces.com/api/v3
```

注意：这些变量只能配置在服务端环境变量中，例如 Vercel Environment Variables。不要使用 `NEXT_PUBLIC_` 前缀。

## 豆包模型和 DeepSeek 模型如何切换

当前实现把火山方舟模型统一放在 `AI_PROVIDER=doubao` 下，通过 `DOUBAO_MODEL` 切换具体模型。

豆包示例：

```env
AI_PROVIDER=doubao
DOUBAO_MODEL=doubao-seed-2-0-lite-260215
DOUBAO_BASE_URL=https://ark.cn-beijing.volces.com/api/v3
```

DeepSeek V4 Pro 示例：

```env
AI_PROVIDER=doubao
DOUBAO_MODEL=deepseek-v4-pro-260425
DOUBAO_BASE_URL=https://ark.cn-beijing.volces.com/api/v3
```

切换后必须重新部署 Vercel。

## API Key 安全要求

- 不允许把真实 API Key 写进源码。
- 不允许把真实 API Key 写进前端代码。
- 不允许使用 `NEXT_PUBLIC_DOUBAO_API_KEY`、`NEXT_PUBLIC_ARK_API_KEY`、`NEXT_PUBLIC_OPENAI_API_KEY`。
- `.env` 和 `.env.local` 不要提交到 GitHub。
- 只能提交 `.env.example`，并且里面只能放占位符。

## 后续开发注意事项

- 优先修复 AI 输出稳定性，尤其是 DeepSeek 思考模型可能返回空 `content` 的情况。
- 建议把 `DOUBAO_*` 逐步重命名或兼容为更通用的 `ARK_*`，避免 DeepSeek 也挂在豆包命名下造成误解。
- 继续强化风险词检测，避免「非官方」被误判为「官方」。
- 不要破坏 Supabase RLS 权限，队员只能看自己负责的学校和自己的数据。
- 创建队员必须走服务端接口并使用 `SUPABASE_SERVICE_ROLE_KEY`，不能在前端创建 Auth 用户。
- UI 修改优先改 `app/(app)/*` 页面和 `components/*`，避免在 API 层混入展示逻辑。
