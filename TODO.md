# TODO.md

## 下一步最优先要做的任务

1. 确认线上 Vercel 环境变量是否正确：
   - `AI_PROVIDER=doubao`
   - `DOUBAO_BASE_URL=https://ark.cn-beijing.volces.com/api/v3`
   - `DOUBAO_MODEL=deepseek-v4-pro-260425` 或实际启用的豆包模型 ID
   - `DOUBAO_API_KEY` 或 `ARK_API_KEY` 已配置为服务端敏感变量
2. 线上重新部署后，在 `/settings` 检查 AI 状态。
3. 在 `/generate` 用真实学校资料测试小红书和抖音生成。
4. 如果 DeepSeek V4 Pro 返回空 `content`，优先修复 `lib/content-generator.ts` 对推理模型返回格式的兼容。
5. 安装 Git 或重新 clone GitHub 仓库，把当前交接文件提交到远程。

## UI 需要优化的地方

- `/generate`：提升生成结果的可读性，增加一键复制整篇、一键复制标题/正文/标签。
- `/library`：内容库按学校、平台、队员、日期筛选。
- `/analytics`：把关键指标做成更清晰的运营看板。
- `/team`：队员创建失败时显示更明确的原因，例如 service role 未配置、邮箱已存在、权限不足。
- `/schools`：学校资料表单较长，建议分组折叠或 tabs。
- 移动端：表格类页面改成更适合手机查看的列表卡片。

## API 还需要测试的地方

- `POST /api/generate`：豆包、DeepSeek、OpenAI、template 四种路径。
- `POST /api/team-members`：创建队员和 Auth 用户。
- `POST /api/team-members/[id]/schools`：分配学校权限。
- `POST /api/contents`：保存生成内容。
- `POST /api/publications`：发布数据回填。
- `GET /api/me`：管理员和队员登录后的角色识别。
- Supabase RLS：队员不能访问未分配学校、不能查看其他队员数据。

## 已知 bug

- 当前本地目录不是 Git 工作区，无法直接提交。
- 当前系统 PATH 中没有 `git` 命令。
- 终端显示部分中文有乱码风险，需要确认文件统一为 UTF-8。
- DeepSeek V4 Pro 推理模型可能返回 `reasoning_content`，但当前解析主要读取 `message.content`。
- 风险词检测要继续避免误伤「非官方」这种安全表达。
- 线上环境变量手动配置过多次，后续务必核对 `DOUBAO_BASE_URL` 没有被误填成模型 ID。

## 建议的开发顺序

1. Git 仓库整理：安装 Git 或重新 clone GitHub 仓库，确认远程地址。
2. 环境变量核对：Vercel 和本地 `.env.local` 保持一致。
3. AI 调用稳定性：修复 DeepSeek 返回空内容、JSON 解析失败、超时等问题。
4. 提示词优化：降低重复度，按学校资料生成更具体的内容。
5. 账号监管：新增队员运营账号上传、账号主页链接、账号检查记录和管理员审核视图。
6. 数据看板：增加私信、加微信、成交转化漏斗。
7. 内容日历：管理员按队员和学校批量生成每日任务。
8. UI 精修：移动端、复制发布流程、内容库筛选。

## 安全检查清单

- 不提交 `.env`、`.env.local`。
- 不提交真实 API Key。
- 不提交 Supabase service role key。
- 不在前端读取任何服务端 API Key。
- 不新增 `NEXT_PUBLIC_DOUBAO_API_KEY`、`NEXT_PUBLIC_ARK_API_KEY`、`NEXT_PUBLIC_OPENAI_API_KEY`。
- 队员权限改动必须同步检查 RLS。
