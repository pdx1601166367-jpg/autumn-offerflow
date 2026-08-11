# OfferFlow 智能求职面试平台

基于 [Gank Interview](https://www.gankinterview.cn/) 的产品拆解，仿照其核心能力搭建的本地优先招聘面试平台。产品拆解全文见 [PRODUCT-BREAKDOWN.md](PRODUCT-BREAKDOWN.md)。

## 功能模块

- 工作台：准备指数、可编辑今日任务、能力雷达与薄弱点推荐、产品方向每日一题（每日 00:00 自动换题）、面试日历与倒计时、本周学习报告、投递管道、最近复盘、校招速览独立整行展示
- AI 求职 Agent（V2）：目标驱动入口，由大模型逐轮决策调用真实工具（岗位检索/JD 分析/简历分析/简历匹配/能力诊断/复盘记忆/题目推荐/计划生成/任务建议），每步读取工具中间结果后再决定下一步，最终生成匹配分、缺口、训练计划与报告；未配置 AI 时明确降级为本地规则引擎
- 后端 AI 网关：多人版所有 AI 调用统一走后端 `/api/ai/*`（服务端配置 `AI_API_KEY`），前端不再依赖个人 Key；系统状态接口 `/api/system/status` 可查看 AI/数据源配置与用户数
- Agent 复盘诊断：分析最近多场复盘中的重复问题，识别持续性能力缺口并推荐训练题目、生成专项任务
- Agent 简历优化：分析 → 改写 → 再评估，给出优化前后匹配分与可直接应用的改写简历
- AI 模拟面试：方向/难度/场景/语言配置，题量 1-20 自定义，提交后展示参考答案与要点，支持语音输入回答，可选 AI 连续追问（每题最多 1-3 轮），自动生成复盘报告
- 笔试解题台：粘贴题目 + 题型选择，配置 AI 后调用模型深度解析（标准答案、答题思路、举例）；内置算法题与产品题（AI 客服、转化率、会员体系、费米估算、AI 面试评分等）
- 面试题库：300 道高频题（160 道 AI 产品经理、80 道基础产品经理、30 道行为基础题及其他方向），答案结构为“标准答案 + 答题思路与要点 + 通俗理解与举例 + 常见追问”，支持搜索、筛选、收藏、标记掌握、一键练习
- AI 简历优化：粘贴简历与 JD，或载入简历图片（配置 AI 接口后可识别图中文字）；本地维度评分 + AI 深度匹配（匹配分、核心亮点、匹配差距、可直接替换的亮点句子）与 AI 改写
- 投递管理：表格/看板双视图，状态流转，投递链接字段，面试时间与提前提醒字段，新增/编辑/删除，CSV 导出/导入
- 求职资料：校招信息汇总、实习信息表、国央企信息表，投递链接指向公司官网；部署后端并配置数据源后每日自动抓取校招信息并合并入表，支持手动刷新
- 复盘报告：场次列表、评分详情、逐题回放、复制报告、导出独立 HTML 报告
- 练习记录：每次模拟面试作答自动记录，按方向统计平均分生成能力雷达，标注薄弱方向并推荐练习题目；每日一题支持完成状态与连续练习天数
- 面试提醒：投递记录支持填写面试时间与提醒提前量，工作台显示倒计时，浏览器授权后到点自动推送通知（去重，仅本地）
- 周报导出：工作台每周自动汇总练习、投递、面试与任务数据，一键导出 HTML 周报
- PWA：支持 manifest 安装、Service Worker 离线缓存，可作为静态站点直接部署
- 多人账号与云同步：注册/登录、每个用户独立数据、登录后自动拉取云端状态，本地改动防抖同步到服务端；未登录时保持单机本地模式
- 访客演示模式：未登录可完整浏览演示数据，AI 每日限 10 次；登录后无限使用并开启云同步
- 自测工具：12 题面试准备度自测
- 设置：可接入 OpenAI 兼容 API 增强面试点评、AI 追问与简历改写；支持 JSON 数据备份导出/合并导入/覆盖导入；未配置 AI 时使用内置本地引擎

## 运行

单机模式直接打开 `index.html` 即可使用，数据保存在浏览器 `localStorage`。

分享给同学使用（多人账号 + 云同步）需要运行 Node 后端：

```bash
node server/server.js
```

默认监听 `http://127.0.0.1:8125`，同时提供前端页面与 API（注册、登录、状态同步）。用户数据保存在 `server/data/`（已加入 `.gitignore`），密码使用 scrypt 加盐哈希存储。

本地静态服务器（仅单机模式）：

```bash
python -m http.server 8123
```

然后访问 `http://127.0.0.1:8123/`。

当前本地服务：单机静态版 `http://127.0.0.1:8123/`，多人版 `http://127.0.0.1:8125/`

## 部署上线

多人版需要能运行 Node 并持久化磁盘的托管（如腾讯云轻量服务器、Render、Railway、VPS），部署后设置 `PORT` 环境变量，并用反向代理（Nginx/Caddy）配置 HTTPS。单机纯静态版可直接部署到任意静态托管：

```bash
# 以 GitHub Pages / Vercel / Netlify 为例，把整个目录推送到仓库即可
git init
git add .
git commit -m "deploy offerflow"
```

部署后请确认域名使用 HTTPS，Service Worker 与 PWA 安装能力在 HTTPS 下才能完整生效。

仓库已包含部署配套（`deploy/` 目录）：

```text
deploy/Dockerfile         容器镜像，挂载 /app/server/data 持久化
deploy/offerflow.service  systemd 服务（Linux 直接部署）
deploy/nginx.conf         Nginx 反代 + HTTPS 模板
deploy/Caddyfile          Caddy 自动 HTTPS 模板
deploy/backup.sh          每日备份脚本（保留最近 7 份）
deploy/backup.ps1         Windows 备份脚本
```

## 数据

- 所有数据保存在浏览器 `localStorage`（key：`offerflow:v1`）
- 演示数据可在「设置 → 重置演示数据」恢复
- 投递记录支持 CSV 导出与导入（UTF-8 BOM，Excel 可直接打开；导入需包含「公司、岗位」列）
- 设置中可导出完整 JSON 备份，支持按 ID 合并或整体覆盖恢复
- 求职资料表为演示数据，用于模拟真实信息流

## AI 接口配置（豆包）

设置里选择「豆包 Seed 2.0 mini（火山方舟）」预设，会自动填入：

```text
API Base URL: https://ark.cn-beijing.volces.com/api/v3
模型/接入点 ID: ep-m-20260607002345-lbn6s
```

只需再粘贴 API Key 并启用即可。该组合已经用真实接口验证过：模拟面试 AI 点评、AI 连续追问、简历 AI 改写全部通过，浏览器直连无跨域问题。Key 只保存在浏览器 localStorage，不会写入代码。

多人版（推荐 SaaS 形态）不需要用户配置 Key：在服务器环境变量配置 `AI_API_KEY`、`AI_MODEL`（默认 `ep-m-20260607002345-lbn6s`）后，所有 AI 功能统一走后端网关；单机静态版仍可在设置中配置 Key 直连。

## 校招信息数据源

后端支持从任意 JSON 数据源每日自动抓取校招信息（默认每 12 小时检查一次）。数据源格式见 `server/feed.example.json`，字段：`type`（campus/intern/state）、`company`、`batch`、`date`、`roles`、`cities`、`link`、`note`。

```bash
# 启动时配置
RESOURCES_FEED_URL=https://你的数据源地址/campus-feed.json node server/server.js
```

也可以在求职资料页点击「立即抓取」，或在系统服务中配置 `RESOURCES_FEED_URL` 环境变量实现每日自动更新。

求职资料页还支持「导入 JSON」（登录后），适合人工运营 + 批量导入；后端每日定时任务会在 09:00 执行抓取，运行记录与下次执行时间通过 `/api/system/status` 可查（`jobRuns` / `nextDailyRun`）。

## 测试

冒烟测试覆盖今日任务增删改、模拟面试（自定义题量、参考答案、语音按钮）、AI 点评与 AI 追问、AI 笔试解析、简历诊断/图片/深度匹配、投递新增与链接、看板编辑、CSV 导入、JSON 备份导出/导入、题库结构、自测、资源官网链接、多端溢出与控制台报错：

```bash
node scripts/smoke.js
```

前置条件：本地服务运行在 `http://127.0.0.1:8123`，且 Node 能解析 `playwright`（本机可使用 Codex 内置运行时，通过 `NODE_PATH` 指向其 `node_modules`）。

多人版与校招数据源测试：

```bash
node scripts/multi-user-test.js
```

真实豆包 AI 全链路测试（需先配置环境变量）：

```bash
$env:ARK_KEY="你的豆包 Key"
$env:ARK_MODEL="ep-m-20260607002345-lbn6s"
node scripts/ai-realtime-test.js
```

Agent 评测（12 个标准求职任务，评估任务成功率、工具调用准确率、规划准确率、延迟与成本）：

```bash
node scripts/agent-eval.js
```

后端 AI 网关 + 真 Agent 实测（需服务端已配置 `AI_API_KEY`）：

```bash
node scripts/ai-backend-test.js
```

## 文件结构

```text
index.html         应用入口
css/styles.css     全部样式
js/icons.js        Lucide 风格本地图标
js/data.js         题库、求职资料、笔试练习、演示数据
js/bank-extra.js       AI 产品经理题库（大模型基础与概念）
js/bank-extra-2.js     AI 产品经理题库（产品设计与场景）
js/bank-extra-3.js     AI 产品经理题库（落地、评测、合规与面试）
js/bank-extra-4.js     基础产品经理题库 + 基础行为题库（答题思路＋举例）
js/bank-detail*.js  160 道 AI 产品经理题的详细版答案（思路＋理解＋举例）
js/auth.js         账号登录、云端同步客户端
js/agent.js        V2 Agent 引擎（目标解析 + 工具调用 + 计划生成，可接豆包决策洞察）
js/engine.js       本地 AI 引擎（评分/诊断/解题/自测）
js/app.js          路由、页面渲染与交互
scripts/smoke.js   Playwright 冒烟测试
scripts/mock-ai-server.js   本地模拟 OpenAI 兼容接口，用于离线验证 AI 链路
scripts/multi-user-test.js   多账号注册、数据隔离与云同步测试
scripts/ai-realtime-test.js   真实豆包 AI 全链路测试
scripts/agent-eval-data.js   Agent 标准任务评测集（12 例）
scripts/agent-eval.js        Agent 评估脚本（任务成功率/工具准确率/规划准确率）
scripts/ai-backend-test.js   后端 AI 网关与真 Agent 实测
server/server.js   多人版 Node 后端（静态资源 + 注册登录 + 状态同步 + 校招数据源）
server/feed.example.json   校招数据源格式示例
deploy/            部署配套（Docker/systemd/Nginx/Caddy/备份）
manifest.webmanifest   PWA 安装清单
sw.js              离线缓存 Service Worker
icon.svg           应用图标
PRODUCT-BREAKDOWN.md   Gank Interview 产品拆解与模块映射
```
