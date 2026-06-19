# 运营模块设计文档 (Operations Module Spec)

> 版本：MVP v1.1  
> 更新：2026-06-19  
> 范围：校园内容中台 · 运营工作流全链路

## 一、概述

运营模块是校园内容中台的执行层，连接**内容生产**和**效果追踪**，实现：

1. 管理员/校区负责人给队员分配每日发布任务
2. 队员执行任务、生成内容、填写发布数据
3. 上传作品链接并录入公开指标
4. 全平台数据汇总到看板

## 二、角色体系

| 角色 | 标识 | 权限边界 |
|------|------|----------|
| 管理员 | `admin` | 全平台数据、全部学校、所有队员 |
| 校区负责人 | `member` | 自己负责的学校 + 自己管理的代理 |
| 代理/队员 | `agent` | 自己被分配的学校 + 自己的数据 |

## 三、数据模型

### 3.1 核心表

```
profiles
├── content_records (user_id)
├── publication_records (user_id)
├── publish_tasks (user_id, created_by)     ← 双 FK
├── platform_accounts (user_id, assigned_by)  ← 双 FK
├── campus_assets (uploader_id, reviewed_by)  ← 双 FK
├── publish_metrics (user_id)
└── school_assignments (user_id)
```

### 3.2 FK 歧义规则

所有带**双外键到 profiles** 的表，在 Supabase `.select()` 中必须显式指定 FK：

```
✅ profiles!user_id(full_name, email)     // platform_accounts, publish_tasks
✅ profiles!uploader_id(full_name, email) // campus_assets
❌ profiles(full_name, email)             // 双 FK 表静默失败
```

### 3.3 关键表设计

**publish_tasks** — 发布任务
| 字段 | 说明 |
|---|---|
| user_id | 任务归属人（代理/队员） |
| school_id | 目标学校 |
| platform_account_id | 关联账号 |
| content_type | 内容类型 |
| task_date | 任务日期 |
| status | 未开始/进行中/已完成 |
| created_by | 任务创建者 |
| required_count | 要求发布数 |

**platform_accounts** — 自媒体账号
| 字段 | 说明 |
|---|---|
| user_id | 账号归属人 |
| assigned_by | 账号分配者 |
| platform | 小红书/抖音 |
| account_name | 账号名 |
| status | 启用/停用 |

**campus_assets** — 校园素材
| 字段 | 说明 |
|---|---|
| uploader_id | 上传者 |
| reviewed_by | 审核者 |
| school_id | 所属学校 |
| status | 待审核/已通过/已拒绝 |
| can_generate | 可用于 AI 生成 |

**publish_metrics** — 作品指标
| 字段 | 说明 |
|---|---|
| user_id | 录入人 |
| school_id | 所属学校 |
| platform | 小红书/抖音 |
| post_url | 作品链接 |
| views/likes/favorites/comments/shares | 公开指标 |

## 四、API 矩阵

| 端点 | 方法 | 用途 |
|---|---|---|
| `/api/tasks` | GET/POST | 任务列表/创建 |
| `/api/tasks/[id]` | PATCH | 状态更新 |
| `/api/tasks/[id]/screenshot` | POST | 截图上传 |
| `/api/platform-accounts` | POST | 新增/更新账号 |
| `/api/publish-metrics` | GET/POST/DELETE | 作品指标 CRUD |
| `/api/fetch-metrics` | POST | 自动抓取(实验性) |
| `/api/generate` | POST | AI 内容生成 |
| `/api/contents` | GET/POST | 内容库 |
| `/api/publications` | POST | 发布数据回填 |

## 五、RLS 权限矩阵

| 表 | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| publish_tasks | can_view_user OR created_by=uid OR user_id=uid | authenticated | (同上) | admin |
| school_assignments | can_view_user | admin OR member | admin OR member | admin |
| platform_accounts | can_view_user | user_id=uid | user_id=uid | user_id=uid |
| campus_assets | can_view_user | authenticated | admin/owner | admin |
| publish_metrics | can_view_user | user_id=uid | user_id=uid | user_id=uid |

## 六、看板数据链路

```
publish_metrics ─┐
                 ├─→ 内容数量 (count)
                 ├─→ 播放量 (sum views)
publication_records ─→ 私信人数 (sum private_messages)
                 ├─→ 加微信人数 (sum wechat_adds)
                 ├─→ 成交人数 (sum conversions)
content_records ─┘
```

所有统计实时从数据库聚合，无 mock 数据。

## 七、已知限制

1. **链接自动抓取** — 小红书/抖音反爬国际 IP，Vercel US 无法抓取，已回退为手动录入
2. **FK 歧义** — Supabase JS SDK 不自动解析多 FK，需手动指定，已在全代码库修复
3. **代理登录** — 代理账号密码为创建时设定，Auth 层已验证可用

## 八、部署信息

- 代码：GitHub `s005779615/campus-content-hub`
- 数据库：Supabase `hqpgzdjzyhzipnxgomkm`
- 部署：Vercel → `https://campus-content-hub.vercel.app`
- 自定义域名：`https://dxplus.xyz`

---

*本模块与 `CLAUDE.md` 技术栈说明互补，侧重运营流程和数据链路。*
# 项目需求：新增账号运营（Campus Operations）模块

## 项目背景

当前系统已经具备：

- 用户系统
- 学校数据管理
- 内容生产模块
- DeepSeek V4 Pro API 已接入

现需要新增：

【账号运营（Campus Operations）模块】

目标：

帮助校园团队在开学季完成：

线上起号
内容引流
私域沉淀
校园业务转化

整个系统服务于：

- 电话卡办理
- 被子销售
- 校园兼职
- 校园跑腿
- 二手交易
- 校园生活服务
- 其他校园业务

默认场景：

低预算获客
自然流量获客
内容引流获客
私域转化成交

禁止输出：

- 泛电商运营方案
- 大预算广告方案
- 与校园场景无关的建议

---------------------------------

# AI工作台结构

AI工作台
├── 内容生产（已存在）
└── 账号运营（新增）

---------------------------------

# 账号运营页面

账号运营
├── 数据概览
├── 校区评级
├── AI诊断
├── 运营阶段分析
├── 15天运营计划
├── 每日任务
├── 风险预警
├── 团队任务同步
└── 历史记录

---------------------------------

# 数据输入

## 学校信息

学校名称
校区名称
学生总人数
新生人数
男女比例
宿舍数量
开学时间
军训时间
报到时间

## 校园业务信息

电话卡业务
被子业务
兼职业务
跑腿业务
二手业务
竞争团队数量
往年成交人数
往年转化率

## 新媒体数据

支持：

小红书
抖音
视频号

每个平台统计：

账号数量
发布数量
曝光
点赞
收藏
评论
私信
进群
成交

---------------------------------

# 新增AI Skill

目录：

/prompts

新增：

/prompts/campusGrowthPlanner.ts

---------------------------------

# Skill角色设定

你是一名拥有10年以上经验的校园开学季增长运营专家。

服务对象：

校园办卡团队
被子团队
校园服务团队

你的核心目标：

通过小红书、抖音、视频号获取新生流量，
完成私信、进群、留资，
并在开学后完成业务成交。

---------------------------------

# 运营阶段

第一阶段：
开学前15天预热

目标：

起号
获取曝光
获取私信
建立新生认知

推荐内容：

宿舍攻略
军训攻略
开学避坑
校园地图
学长经验
报到流程

---------------------------------

第二阶段：
报到前7天爆发

目标：

大量进群
沉淀私域
收集意向用户

推荐内容：

宿舍实拍
校园实拍
福利领取
开学倒计时
直播答疑
学长带逛校园

---------------------------------

第三阶段：
报到后7天转化

目标：

电话卡成交
被子成交
兼职成交
校园服务成交

---------------------------------

# 校区评级

A级：

新生人数 > 8000
竞争团队 <= 2

B级：

新生人数 3000-8000

C级：

新生人数 < 3000

输出：

校区等级
建议投入等级
预计曝光
预计私信
预计进群
预计成交

---------------------------------

# 数据诊断

分析：

内容数量
曝光情况
点赞率
收藏率
私信率
进群率
转化率
竞争压力

输出：

问题原因：

内容不足
互动不足
转化不足
私域承接弱
竞争压力大

并输出解决建议。

---------------------------------

# 生成15天运营计划

每天必须输出：

日期
今日目标
平台任务
发布数量
具体选题
文案方向
评论区引导
私信话术
进群动作
负责人
预计曝光
预计私信
预计进群
预计成交

---------------------------------

# 平台运营建议

小红书：

目标：
获取精准新生流量

推荐内容：

宿舍攻略
避坑攻略
校园地图
军训攻略
学长经验

抖音：

目标：
获取大量曝光

推荐内容：

校园实拍
宿舍实拍
报到流程
校园生活
开学倒计时

视频号：

目标：
建立信任
促进转化

推荐内容：

学长分享
开学直播
宿舍讲解
福利发放

---------------------------------

# 私域转化

AI必须输出：

评论区引导话术
私信回复话术
进群话术
群运营建议
成交建议

---------------------------------

# 团队任务拆解

默认团队：

运营
剪辑
发布人员
校区负责人
代理

自动生成：

运营今日任务
剪辑今日任务
发布今日任务
校区负责人任务
代理任务

---------------------------------

# 风险预警

连续2天未发布内容
曝光下降50%
竞争团队增加2家以上
进群率低于20%
转化率低于5%

输出：

风险等级
问题原因
解决建议

---------------------------------

# 预计结果

输出：

预计曝光
预计私信
预计进群
预计成交
预计转化率

---------------------------------

# 返回格式

必须返回标准JSON：

{
  "schoolLevel": "",
  "investmentLevel": "",
  "diagnosis": [],
  "stageAnalysis": {},
  "plan15Days": [],
  "privateDomain": {},
  "teamTasks": {},
  "risks": [],
  "prediction": {
    "exposure": 0,
    "privateMessages": 0,
    "groups": 0,
    "orders": 0,
    "conversionRate": 0
  }
}

---------------------------------

# 页面功能

按钮：

AI分析
重新生成方案
导出PDF
同步为团队任务
保存历史记录

---------------------------------

# 技术要求

1. 不影响现有内容生产模块；
2. 内容生产和账号运营使用独立Skill；
3. 使用现有DeepSeek V4 Pro API；
4. 所有分析结果存数据库；
5. 支持历史记录；
6. 支持手机端和PC端；
7. 后续支持：

管理员
校区负责人
代理
学生兼职

四级权限体系扩展。


